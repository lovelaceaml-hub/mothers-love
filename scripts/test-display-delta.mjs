// Synthetic, disposable PostgreSQL only. This script never reads connection env
// vars and starts its own Unix-socket cluster with TCP disabled. Requires local
// initdb/pg_ctl/psql and the app's installed dependencies.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import postgres from 'postgres';
import { createServer } from 'vite';

const directory = mkdtempSync(join(tmpdir(), 'ml-display-delta-'));
const data = join(directory, 'data');
let sql;
let started = false;
let modules;
const checks = [];
const check = (name, run) => { run(); checks.push(name); };
const bytes = (value) => ({ json: Buffer.byteLength(JSON.stringify(value)), gzip: gzipSync(JSON.stringify(value)).length });
try {
  execFileSync('initdb', ['-D', data, '-U', 'ml_delta_test', '-A', 'trust', '--encoding=UTF8', '--no-locale'], { stdio: 'pipe' });
  execFileSync('pg_ctl', ['-D', data, '-l', join(directory, 'server.log'), '-o', `-k ${directory} -h '' -p 55433`, 'start'], { stdio: 'pipe' });
  started = true;
  const psql = (args) => execFileSync('psql', ['-h', directory, '-p', '55433', '-U', 'ml_delta_test', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', ...args], { stdio: 'pipe' });
  psql(['-c', 'CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions; CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;']);
  for (const file of readdirSync('database').filter((name) => /^\d{3}_.*\.sql$/.test(name)).sort()) psql(['-f', join('database', file)]);
  sql = postgres({ host: directory, port: 55433, username: 'ml_delta_test', database: 'postgres', max: 1 });
  await sql`update mothers_love.settings set mode = 'normal', version = 7, collection_open = true,
    submission_url = 'https://mothers-love.vercel.app/recognize', last_cleanup_at = now()`;
  await sql`update mothers_love.color_polish_presentation set enabled = true`;
  await sql`insert into mothers_love.recognitions (id, submitted_name, recipient, message, status, created_at, first_published_at, expires_at, featured)
    select ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, 'Private synthetic fixture', 'Fictional recipient ' || n,
      repeat('A fictional thank you for a kind action. ', 6), 'published', now() - n * interval '1 second',
      now() - n * interval '1 second', now() + interval '100 years', n in (1, 1100)
    from generate_series(1, 1200) as n`;
  await sql`insert into mothers_love.recognition_expressions select id, 1 from mothers_love.recognitions`;
  await sql`insert into mothers_love.display_events (recognition_id, event_kind, expires_at)
    select id, 'published', now() + interval '7 days' from mothers_love.recognitions order by first_published_at`;
  await sql`insert into mothers_love.daily_aggregates (period_start, period_end, recognitions, expression_counts, expression_total)
    values ((now() at time zone 'America/Los_Angeles')::date, (now() at time zone 'America/Los_Angeles')::date,
      1200, array[1200,0,0,0,0,0,0,0,0], 1200)`;
  const poll = (after, known = []) => sql.begin('read write', async (tx) => {
    await tx`set transaction isolation level repeatable read`;
    const rows = await tx`select public.ml_color_polish_delta(${after}, ${JSON.stringify(known)}::text::jsonb) as value`;
    assert.equal(rows[0].value.ok, true, JSON.stringify(rows[0].value));
    return rows[0].value;
  });
  const known = (value) => value.pool.map((entry) => entry.token);
  const first = await poll(null);
  check('reset is latest 100, ordered featured first, with browser expiry capped at seven days', () => {
    assert.equal(first.pool.length, 100);
    assert.equal(first.snapshot.recognitions.length, 100);
    assert.equal(first.snapshot.sync, 'reset');
    assert.equal(first.snapshot.arrivals.length, 0);
    assert.ok(!JSON.stringify(first).includes('Private synthetic'));
    assert.ok(first.snapshot.recognitions.every((r) => Date.parse(r.expiresAt) <= Date.parse(first.serverTime) + 7 * 86400000));
    assert.ok(!first.pool.some((entry) => entry.id.endsWith('000000001100')));
  });
  const legacy = (await sql`select public.ml_color_polish_snapshot(null) as value`)[0].value;
  const newestLegacyIds = new Set([...legacy.recognitions].sort((a, b) => Date.parse(b.firstPublishedAt) - Date.parse(a.firstPublishedAt) || b.id.localeCompare(a.id))
    .slice(0, 100).map((record) => record.id));
  const same = await poll(first.cacheCursor, known(first));
  check('unchanged poll carries no recognition records or metadata snapshot', () => {
    assert.equal(same.unchanged, true);
    assert.deepEqual(Object.keys(same).sort(), ['cacheCursor', 'ok', 'serverTime', 'unchanged']);
  });
  const newId = '00000000-0000-4000-8000-000000009999';
  await sql`insert into mothers_love.recognitions (id, submitted_name, recipient, message, status, created_at, first_published_at, expires_at)
    values (${newId}, 'Private new fixture', 'Fictional new arrival', 'A fictional new message.', 'published', now(), now(), now() + interval '100 years')`;
  await sql`insert into mothers_love.recognition_expressions values (${newId}, 2)`;
  await sql`insert into mothers_love.display_events (recognition_id, event_kind, expires_at) values (${newId}, 'published', now() + interval '7 days')`;
  const arrival = await poll(same.cacheCursor, known(first));
  check('one arrival sends one full record and the exact current pool', () => {
    assert.equal(arrival.snapshot.recognitions.length, 1);
    assert.equal(arrival.snapshot.recognitions[0].id, newId);
    assert.equal(arrival.pool.length, 100);
    assert.equal(arrival.snapshot.arrivals.length, 1);
    assert.equal(arrival.snapshot.arrivals[0].recognitionId, newId);
    assert.notDeepEqual(arrival.pool, first.pool);
  });
  modules = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false },
    resolve: { alias: { '@': join(process.cwd(), 'src') } } });
  const { projectColorPolishSnapshot } = await modules.ssrLoadModule('/src/lib/server/color-polish.ts');
  const { projectDisplayDelta } = await modules.ssrLoadModule('/src/lib/color-polish/delta.ts');
  const { DisplayRecordCache } = await modules.ssrLoadModule('/src/lib/color-polish/display-cache.ts');
  const browserCache = new DisplayRecordCache();
  for (const value of [first, same, arrival]) {
    const projected = projectDisplayDelta(value, projectColorPolishSnapshot);
    assert.ok(projected, 'actual SQL output must pass the public API projector');
    assert.equal(browserCache.accept({ ok: true, ...projected }).recognitions.length, 100);
  }
  checks.push('actual SQL reset/unchanged/arrival payloads pass the API projector and browser cache');
  const sizes = { legacyDatabase: bytes(legacy), legacyBrowser: bytes({ ...legacy, recognitions: legacy.recognitions.filter((record) => newestLegacyIds.has(record.id)) }),
    reset: bytes(first), unchanged: bytes(same), oneArrival: bytes(arrival), knownRequestBytes: known(first).join('.').length };
  let current = arrival;
  const next = async () => { current = await poll(current.cacheCursor, known(current)); return current; };
  await sql`update mothers_love.recognitions set message = 'Fictional edited text' where id = ${newId}`;
  check('a message edit without a version bump invalidates its token', () => {});
  assert.equal((await next()).snapshot.recognitions[0].message, 'Fictional edited text');
  await sql`insert into mothers_love.recognition_expressions values (${newId}, 3)`;
  assert.deepEqual((await next()).snapshot.recognitions[0].expressionIds, [2, 3]);
  checks.push('expression-table changes invalidate cached content independently');
  await sql`update mothers_love.settings set pause_rotation = true`;
  assert.equal((await next()).snapshot.settings.pauseRotation, true);
  assert.equal(current.snapshot.recognitions.length, 0);
  checks.push('settings changes invalidate metadata without a version bump');
  await sql`update mothers_love.color_polish_presentation set enabled = false`;
  assert.equal((await next()).snapshot.presentation.enabled, false);
  assert.equal(current.snapshot.recognitions.length, 0);
  checks.push('presentation activation changes invalidate metadata independently');
  await sql`update mothers_love.daily_aggregates set recognitions = recognitions + 1, expression_counts = array[1200,1,0,0,0,0,0,0,0], expression_total = 1201`;
  assert.equal((await next()).snapshot.insights.month.recognitions, 1201);
  checks.push('anonymous aggregate/calendar changes invalidate metadata independently');
  // Move only the disposable helper's clock to exercise boundaries without
  // sleeping or changing any production function. Restore its exact definition.
  const metadataDefinition = (await sql`select pg_get_functiondef('mothers_love.ml_color_polish_metadata()'::regprocedure) as value`)[0].value;
  const simulated = async (at) => {
    await sql.unsafe(metadataDefinition.replace('now_value := pg_catalog.clock_timestamp();', `now_value := '${at}'::timestamptz;`));
    return poll(null);
  };
  const realNow = new Date(current.serverTime);
  const tomorrow = new Date(realNow.getTime() + 86400000);
  const daySnapshot = await simulated(tomorrow.toISOString());
  assert.notEqual(daySnapshot.snapshot.insights.month.periodEnd, current.snapshot.insights.month.periodEnd);
  const nextWeek = await simulated(new Date(realNow.getTime() + 7 * 86400000).toISOString());
  assert.notEqual(nextWeek.snapshot.insights.goal.weekStart, current.snapshot.insights.goal.weekStart);
  const nextMonthTime = new Date(realNow.getTime() + 32 * 86400000);
  const nextMonth = await simulated(nextMonthTime.toISOString());
  assert.notEqual(nextMonth.snapshot.insights.month.periodStart, current.snapshot.insights.month.periodStart);
  await sql.unsafe(metadataDefinition);
  current = await poll(null);
  checks.push('Los Angeles day/week/month boundaries refresh calendar periods and frozen weekly focus');
  await sql`update mothers_love.recognitions set featured = true, feature_until = now() + interval '20 seconds' where id = ${newId}`;
  await next();
  assert.equal(current.snapshot.recognitions.find((r) => r.id === newId).featured, true);
  const future = new Date(Date.parse(current.serverTime) + 30000).toISOString();
  await sql.unsafe(metadataDefinition.replace('now_value := pg_catalog.clock_timestamp();', `now_value := '${future}'::timestamptz;`));
  const elapsedFeature = await poll(current.cacheCursor, known(current));
  assert.equal(elapsedFeature.snapshot.recognitions.find((r) => r.id === newId).featured, false);
  await sql.unsafe(metadataDefinition);
  current = await poll(null);
  checks.push('feature expiration invalidates the pool token without any intervening write');
  await sql`update mothers_love.recognitions set featured = true, feature_until = now() - interval '1 second' where id = ${newId}`;
  assert.equal((await next()).snapshot.recognitions[0].featured, false);
  checks.push('elapsed feature boundaries are evaluated at each verification');
  await sql`update mothers_love.recognitions set status = 'hidden' where id = ${newId}`;
  assert.ok(!(await next()).pool.some((entry) => entry.id === newId));
  checks.push('moderation removes cached records and refills the latest-100 pool');
  const expiresId = current.pool[0].id;
  await sql`update mothers_love.recognitions set expires_at = now() - interval '1 second' where id = ${expiresId}`;
  assert.ok(!(await next()).pool.some((entry) => entry.id === expiresId));
  checks.push('expired content leaves the pool before physical cleanup');
  await sql`update mothers_love.settings set mode = 'quiet'`;
  const quiet = await next();
  assert.equal(quiet.pool.length, 0);
  assert.equal(quiet.snapshot.recognitions.length, 0);
  await sql`update mothers_love.settings set mode = 'normal'`;
  assert.equal((await next()).snapshot.recognitions.length, 100);
  checks.push('quiet mode clears records and returning to normal refills the memory cache');
  const oldLease = current.cacheCursor.split(':');
  oldLease[2] = String(Number(oldLease[2]) - 3601);
  const renewed = await poll(oldLease.join(':'), known(current));
  assert.equal(renewed.snapshot.sync, 'reset');
  assert.equal(renewed.snapshot.recognitions.length, 100);
  checks.push('hourly reset renews seven-day public expiry leases');
  assert.equal((await poll('v2:hostile:' + '9'.repeat(300), known(current))).snapshot.sync, 'reset');
  checks.push('malformed/overflowing cursor input safely resets');
  await sql`delete from mothers_love.display_events where event_id = (select max(event_id) from mothers_love.display_events)`;
  assert.equal((await next()).snapshot.sync, 'reset');
  checks.push('event cleanup/reconnection never advances an invalid arrival cursor');
  const id = current.pool[0].id;
  await sql`insert into mothers_love.display_events (recognition_id, event_kind, expires_at)
    select ${id}::uuid, 'published', now() + interval '7 days' from generate_series(1,1001)`;
  const overflow = await next();
  assert.equal(overflow.snapshot.sync, 'reset');
  assert.equal(overflow.snapshot.arrivals.length, 0);
  assert.equal(overflow.snapshot.recognitions.length, 100);
  checks.push('arrival overflow returns a complete bounded reset');
  await sql`update mothers_love.recognitions set created_at = now() - interval '1 day', expires_at = now() - interval '3 minutes' where id = ${id}`;
  assert.equal((await sql`select public.ml_color_polish_delta(${current.cacheCursor}, ${JSON.stringify(known(current))}::text::jsonb) as value`)[0].value.ok, false);
  checks.push('cleanup health failure closes verification despite a previous good cache');
  const acl = await sql`select has_function_privilege('mothers_love_runtime', 'public.ml_color_polish_delta(text,jsonb)', 'EXECUTE') as runtime,
    has_function_privilege('mothers_love_runtime', 'mothers_love.ml_color_polish_metadata()', 'EXECUTE') as helper`;
  assert.equal(acl[0].runtime, true);
  assert.equal(acl[0].helper, false);
  for (const role of ['anon', 'authenticated', 'service_role']) {
    assert.equal((await sql`select has_function_privilege(${role}, 'public.ml_color_polish_delta(text,jsonb)', 'EXECUTE') as allowed`)[0].allowed, false);
  }
  checks.push('only the restricted runtime bridge is callable');
  console.log(JSON.stringify({ checks, fixtureRecords: 1200, legacyFullRecords: legacy.recognitions.length, sizes }, null, 2));
} finally {
  if (modules) await modules.close();
  if (sql) await sql.end();
  if (started) execFileSync('pg_ctl', ['-D', data, '-m', 'immediate', 'stop'], { stdio: 'pipe' });
  rmSync(directory, { recursive: true, force: true });
}
