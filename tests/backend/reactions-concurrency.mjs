import postgres from "postgres";

const statementTimeoutMs = 3000;
const lockProbeMs = 150;
const expiryWaitMs = 350;
const caCertificate = process.env.REACTIONS_DATABASE_CA_CERT;
if (process.env.REACTIONS_ALLOW_SYNTHETIC !== "1") {
  throw new Error("Set REACTIONS_ALLOW_SYNTHETIC=1 to run the synthetic concurrency fixture");
}

function isLocalHost(value) {
  const host = String(value || "").trim().toLowerCase().replace(/[\[\]]/g, "");
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.startsWith("/");
}

function connectionTarget() {
  const explicitHost = process.env.REACTIONS_DATABASE_HOST?.trim();
  if (explicitHost) {
    if (!isLocalHost(explicitHost)) throw new Error("REACTIONS_DATABASE_HOST must be localhost, loopback, or a Unix socket path");
    const port = process.env.REACTIONS_DATABASE_PORT ? Number(process.env.REACTIONS_DATABASE_PORT) : undefined;
    if (port !== undefined && (!Number.isInteger(port) || port < 1 || port > 65535)) throw new Error("REACTIONS_DATABASE_PORT must be a valid local port");
    const database = process.env.REACTIONS_DATABASE_NAME?.trim();
    const user = process.env.REACTIONS_DATABASE_USER?.trim();
    if (!database || !user) throw new Error("REACTIONS_DATABASE_NAME and REACTIONS_DATABASE_USER are required with explicit host settings");
    return {
      host: explicitHost,
      ...(port ? { port } : {}),
      database,
      user,
      ...(process.env.REACTIONS_DATABASE_PASSWORD ? { password: process.env.REACTIONS_DATABASE_PASSWORD } : {}),
    };
  }

  const databaseUrl = process.env.REACTIONS_DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("Set REACTIONS_DATABASE_URL or the explicit local REACTIONS_DATABASE_HOST/PORT/USER/NAME settings");
  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("REACTIONS_DATABASE_URL must be a valid PostgreSQL URL");
  }
  if (!isLocalHost(parsed.hostname)) throw new Error("REACTIONS_DATABASE_URL must point to localhost, loopback, or a Unix socket");
  return databaseUrl;
}

const target = connectionTarget();
const options = {
  max: 1,
  prepare: false,
  connect_timeout: 10,
  ...(caCertificate ? { ssl: { ca: caCertificate, rejectUnauthorized: true } } : {}),
};
const clients = [];
const id = "00000000-0000-4000-8000-000000009010";
const hiddenId = "00000000-0000-4000-8000-000000009011";
const expiryId = "00000000-0000-4000-8000-000000009012";
const purgeId = "00000000-0000-4000-8000-000000009013";
const visitorA = "1".repeat(64);
const visitorB = "2".repeat(64);

function createClient() {
  const client = typeof target === "string" ? postgres(target, options) : postgres({ ...target, ...options });
  clients.push(client);
  return client;
}

async function prepareClient(client) {
  await client`select set_config('statement_timeout', ${`${statementTimeoutMs}ms`}, false)`;
  return client;
}

async function makeClient() {
  return prepareClient(createClient());
}

async function resultOf(query) {
  const rows = await query;
  return rows[0]?.result ?? null;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function lockedSetter(targetId, visitor, lockSql, expectedCode) {
  const lockClient = await makeClient();
  const blockedClient = await makeClient();
  let blockedPromise = null;
  let released = false;
  await lockClient`begin`;
  try {
    await lockSql(lockClient);
    let settled = false;
    blockedPromise = Promise.resolve()
      .then(() => resultOf(blockedClient`select public.ml_reactions_set(${targetId}::uuid, ${visitor}, true, 'synthetic-lock-ip') as result`))
      .then((value) => ({ ok: true, value }), (error) => ({ ok: false, error }));
    const observedPromise = blockedPromise.then(() => {
      settled = true;
    });
    await delay(lockProbeMs);
    if (settled) throw new Error(`setter was not blocked by the ${expectedCode} lock`);
    await lockClient`commit`;
    released = true;
    await observedPromise;
    const blockedOutcome = await blockedPromise;
    if (!blockedOutcome.ok) throw blockedOutcome.error;
    const result = blockedOutcome.value;
    if (result?.code !== expectedCode) throw new Error(`${expectedCode} contention returned ${JSON.stringify(result)}`);
    const reactionRows = await lockClient`select count(*)::integer as count from mothers_love.recognition_reactions where recognition_id = ${targetId}::uuid`;
    if (Number(reactionRows[0]?.count ?? 0) !== 0) throw new Error(`${expectedCode} contention left a reaction row`);
    return result;
  } finally {
    if (!released) await lockClient`rollback`.catch(() => undefined);
    if (blockedPromise) await blockedPromise;
  }
}

const fixtureNamePrefix = "Synthetic Concurrency Sender ";

async function cleanStaleFixture(root) {
  const rows = await root`select id, submitted_name from mothers_love.recognitions where id in (${id}::uuid, ${hiddenId}::uuid, ${expiryId}::uuid, ${purgeId}::uuid)`;
  if (rows.some((row) => typeof row.submitted_name !== "string" || !row.submitted_name.startsWith(fixtureNamePrefix))) {
    throw new Error("synthetic concurrency IDs already exist with non-fixture content");
  }
  if (rows.length) {
    await root`delete from mothers_love.recognitions where id in (${id}::uuid, ${hiddenId}::uuid, ${expiryId}::uuid, ${purgeId}::uuid)`;
  }
  await root`delete from mothers_love.rate_limits
    where (scope = 'reaction_browser' and key_hash in (mothers_love.ml_hash(${visitorA}), mothers_love.ml_hash(${visitorB})))
       or (scope = 'reaction_ip' and key_hash in (
         mothers_love.ml_hash('synthetic-hidden-ip'),
         mothers_love.ml_hash('synthetic-purge-ip'),
         mothers_love.ml_hash('synthetic-lock-ip'),
         mothers_love.ml_hash('synthetic-concurrency-ip-0'),
         mothers_love.ml_hash('synthetic-concurrency-ip-1'),
         mothers_love.ml_hash('synthetic-concurrency-ip-2'),
         mothers_love.ml_hash('synthetic-concurrency-ip-3'),
         mothers_love.ml_hash('synthetic-concurrency-ip-4'),
         mothers_love.ml_hash('synthetic-concurrency-ip-5'),
         mothers_love.ml_hash('synthetic-concurrency-ip-6'),
         mothers_love.ml_hash('synthetic-concurrency-ip-7'),
         mothers_love.ml_hash('synthetic-concurrency-ip-8'),
         mothers_love.ml_hash('synthetic-concurrency-ip-9'),
         mothers_love.ml_hash('synthetic-concurrency-ip-10'),
         mothers_love.ml_hash('synthetic-concurrency-ip-11'),
         mothers_love.ml_hash('synthetic-concurrency-ip-12'),
         mothers_love.ml_hash('synthetic-concurrency-ip-13'),
         mothers_love.ml_hash('synthetic-concurrency-ip-14'),
         mothers_love.ml_hash('synthetic-concurrency-ip-15'),
         mothers_love.ml_hash('synthetic-opposing-ip-0'),
         mothers_love.ml_hash('synthetic-opposing-ip-1'),
         mothers_love.ml_hash('synthetic-opposing-ip-2'),
         mothers_love.ml_hash('synthetic-opposing-ip-3'),
         mothers_love.ml_hash('synthetic-opposing-ip-4'),
         mothers_love.ml_hash('synthetic-opposing-ip-5'),
         mothers_love.ml_hash('synthetic-opposing-ip-6'),
         mothers_love.ml_hash('synthetic-opposing-ip-7'),
         mothers_love.ml_hash('synthetic-opposing-ip-8'),
         mothers_love.ml_hash('synthetic-opposing-ip-9'),
         mothers_love.ml_hash('synthetic-opposing-ip-10'),
         mothers_love.ml_hash('synthetic-opposing-ip-11'),
         mothers_love.ml_hash('synthetic-opposing-ip-12'),
         mothers_love.ml_hash('synthetic-opposing-ip-13'),
         mothers_love.ml_hash('synthetic-opposing-ip-14'),
         mothers_love.ml_hash('synthetic-opposing-ip-15')
       ))`;
}

let root = null;
let originalSettings;
try {
  root = await makeClient();
  const settingsRows = await root`select mode, last_cleanup_at, overdue_purge_count from mothers_love.settings where singleton_id = true`;
  originalSettings = settingsRows[0];
  if (!originalSettings) throw new Error("campaign settings row is missing");

  await cleanStaleFixture(root);

  await root`update mothers_love.settings set mode = 'normal', last_cleanup_at = clock_timestamp(), overdue_purge_count = 0 where singleton_id = true`;
  await root`insert into mothers_love.recognitions (id, submitted_name, recipient, message, status, created_at, first_published_at, expires_at)
    values
      (${id}::uuid, 'Synthetic Concurrency Sender A.', 'Synthetic Concurrency Recipient A.', 'Synthetic concurrency fixture A.', 'published', clock_timestamp(), clock_timestamp(), clock_timestamp() + interval '1 hour'),
      (${hiddenId}::uuid, 'Synthetic Concurrency Sender B.', 'Synthetic Concurrency Recipient B.', 'Synthetic concurrency fixture B.', 'published', clock_timestamp(), clock_timestamp(), clock_timestamp() + interval '1 hour'),
      (${expiryId}::uuid, 'Synthetic Concurrency Sender C.', 'Synthetic Concurrency Recipient C.', 'Synthetic concurrency fixture C.', 'published', clock_timestamp(), clock_timestamp(), clock_timestamp() + interval '1 hour'),
      (${purgeId}::uuid, 'Synthetic Concurrency Sender D.', 'Synthetic Concurrency Recipient D.', 'Synthetic concurrency fixture D.', 'published', clock_timestamp(), clock_timestamp(), clock_timestamp() + interval '1 hour')`;

  const duplicateResults = await Promise.all(Array.from({ length: 16 }, async (_, index) => {
    const client = await makeClient();
    return resultOf(client`select public.ml_reactions_set(${id}::uuid, ${visitorA}, true, ${`synthetic-concurrency-ip-${index}`}) as result`);
  }));
  if (duplicateResults.some((value) => value?.ok !== true)) throw new Error(`duplicate writes had a failure: ${JSON.stringify(duplicateResults)}`);
  const duplicateRead = await resultOf(root`select public.ml_reactions_get(jsonb_build_array(${id}::text), ${visitorA}) as result`);
  const duplicateItem = duplicateRead?.items?.[0];
  if (duplicateItem?.count !== 1 || duplicateItem?.liked !== true) throw new Error(`duplicate writes were not idempotent: ${JSON.stringify(duplicateRead)}`);

  const opposingResults = await Promise.all(Array.from({ length: 16 }, async (_, index) => {
    const client = await makeClient();
    return resultOf(client`select public.ml_reactions_set(${id}::uuid, ${visitorB}, ${index % 2 === 0}, ${`synthetic-opposing-ip-${index}`}) as result`);
  }));
  if (opposingResults.some((value) => value?.ok !== true)) throw new Error(`opposing writes had a failure: ${JSON.stringify(opposingResults)}`);
  const opposingRead = await resultOf(root`select public.ml_reactions_get(jsonb_build_array(${id}::text), ${visitorB}) as result`);
  const opposingItem = opposingRead?.items?.[0];
  const expectedOpposingCount = 1 + (opposingItem?.liked ? 1 : 0);
  if (!opposingItem || opposingItem.count !== expectedOpposingCount) throw new Error(`opposing writes returned an impossible count: ${JSON.stringify(opposingRead)}`);

  const hiddenRace = await lockedSetter(hiddenId, visitorA, async (client) => {
    await client`update mothers_love.recognitions set status = 'hidden' where id = ${hiddenId}::uuid`;
  }, "NOT_FOUND");

  await root`update mothers_love.recognitions set expires_at = clock_timestamp() + interval '150 milliseconds' where id = ${expiryId}::uuid`;
  const expiryRace = await lockedSetter(expiryId, visitorA, async (client) => {
    await client`select id from mothers_love.recognitions where id = ${expiryId}::uuid for update`;
    await delay(expiryWaitMs);
  }, "NOT_FOUND");

  await root`update mothers_love.recognitions set expires_at = clock_timestamp() - interval '1 second' where id = ${purgeId}::uuid`;
  const purgeClient = await makeClient();
  const purgeRaceClient = await makeClient();
  await Promise.all([
    purgeClient`select public.ml_purge() as result`,
    purgeRaceClient`select public.ml_reactions_set(${purgeId}::uuid, ${visitorA}, true, 'synthetic-purge-ip') as result`,
  ]);
  const purgedRows = await root`select count(*)::integer as count from mothers_love.recognitions where id = ${purgeId}::uuid or id in (select recognition_id from mothers_love.recognition_reactions where recognition_id = ${purgeId}::uuid)`;
  if (Number(purgedRows[0]?.count ?? 0) !== 0) throw new Error("purge contention left a target or reaction row");

  console.log(JSON.stringify({ duplicateCount: duplicateItem.count, opposingCount: opposingItem.count, hiddenCode: hiddenRace.code, expiryCode: expiryRace.code, purgeRows: Number(purgedRows[0]?.count ?? 0) }));
} finally {
  try {
    if (root) await root`delete from mothers_love.recognitions where id in (${id}::uuid, ${hiddenId}::uuid, ${expiryId}::uuid, ${purgeId}::uuid)`;
    if (root && originalSettings) {
      await root`update mothers_love.settings set mode = ${originalSettings.mode}, last_cleanup_at = ${originalSettings.last_cleanup_at}, overdue_purge_count = ${originalSettings.overdue_purge_count} where singleton_id = true`;
    }
  } finally {
    await Promise.all(clients.map((client) => client.end({ timeout: 5 })));
  }
}
