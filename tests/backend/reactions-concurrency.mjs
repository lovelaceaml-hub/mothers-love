import postgres from "postgres";

const databaseUrl = process.env.REACTIONS_DATABASE_URL;
const caCertificate = process.env.REACTIONS_DATABASE_CA_CERT;
if (!databaseUrl) throw new Error("REACTIONS_DATABASE_URL is required");
if (process.env.REACTIONS_ALLOW_SYNTHETIC !== "1") {
  throw new Error("Set REACTIONS_ALLOW_SYNTHETIC=1 to run the synthetic concurrency fixture");
}

const options = {
  max: 1,
  prepare: false,
  connect_timeout: 10,
  ...(caCertificate ? { ssl: { ca: caCertificate, rejectUnauthorized: true } } : {}),
};
const root = postgres(databaseUrl, options);
const clients = [];
const id = "00000000-0000-4000-8000-000000009010";
const hiddenId = "00000000-0000-4000-8000-000000009011";
const purgeId = "00000000-0000-4000-8000-000000009012";
const visitorA = "1".repeat(64);
const visitorB = "2".repeat(64);

function makeClient() {
  const client = postgres(databaseUrl, options);
  clients.push(client);
  return client;
}

async function resultOf(query) {
  const rows = await query;
  return rows[0]?.result ?? null;
}

let originalSettings;
try {
  const settingsRows = await root`select mode, last_cleanup_at, overdue_purge_count from mothers_love.settings where singleton_id = true`;
  originalSettings = settingsRows[0];
  if (!originalSettings) throw new Error("campaign settings row is missing");

  const existing = await root`select id from mothers_love.recognitions where id in (${id}::uuid, ${hiddenId}::uuid, ${purgeId}::uuid)`;
  if (existing.length) throw new Error("synthetic concurrency IDs already exist");

  await root`update mothers_love.settings set mode = 'normal', last_cleanup_at = clock_timestamp(), overdue_purge_count = 0 where singleton_id = true`;
  await root`insert into mothers_love.recognitions (id, submitted_name, recipient, message, status, created_at, first_published_at, expires_at)
    values
      (${id}::uuid, 'Synthetic Concurrency Sender A.', 'Synthetic Concurrency Recipient A.', 'Synthetic concurrency fixture A.', 'published', clock_timestamp(), clock_timestamp(), clock_timestamp() + interval '1 hour'),
      (${hiddenId}::uuid, 'Synthetic Concurrency Sender B.', 'Synthetic Concurrency Recipient B.', 'Synthetic concurrency fixture B.', 'published', clock_timestamp(), clock_timestamp(), clock_timestamp() + interval '1 hour'),
      (${purgeId}::uuid, 'Synthetic Concurrency Sender C.', 'Synthetic Concurrency Recipient C.', 'Synthetic concurrency fixture C.', 'published', clock_timestamp(), clock_timestamp(), clock_timestamp() + interval '1 hour')`;

  const duplicateResults = await Promise.all(Array.from({ length: 16 }, (_, index) => {
    const client = makeClient();
    return resultOf(client`select public.ml_reactions_set(${id}::uuid, ${visitorA}, true, ${`synthetic-concurrency-ip-${index}`}) as result`);
  }));
  if (duplicateResults.some((value) => value?.ok !== true)) throw new Error(`duplicate writes had a failure: ${JSON.stringify(duplicateResults)}`);
  const duplicateRead = await resultOf(root`select public.ml_reactions_get(jsonb_build_array(${id}::text), ${visitorA}) as result`);
  const duplicateItem = duplicateRead?.items?.[0];
  if (duplicateItem?.count !== 1 || duplicateItem?.liked !== true) throw new Error(`duplicate writes were not idempotent: ${JSON.stringify(duplicateRead)}`);

  const opposingResults = await Promise.all(Array.from({ length: 16 }, (_, index) => {
    const client = makeClient();
    return resultOf(client`select public.ml_reactions_set(${id}::uuid, ${visitorB}, ${index % 2 === 0}, ${`synthetic-opposing-ip-${index}`}) as result`);
  }));
  if (opposingResults.some((value) => value?.ok !== true)) throw new Error(`opposing writes had a failure: ${JSON.stringify(opposingResults)}`);
  const opposingRead = await resultOf(root`select public.ml_reactions_get(jsonb_build_array(${id}::text), ${visitorB}) as result`);
  const opposingItem = opposingRead?.items?.[0];
  if (!opposingItem || opposingItem.count < 0 || opposingItem.count > 1) throw new Error(`opposing writes returned an impossible count: ${JSON.stringify(opposingRead)}`);

  await root`update mothers_love.recognitions set status = 'hidden' where id = ${hiddenId}::uuid`;
  const hiddenRace = await resultOf(root`select public.ml_reactions_set(${hiddenId}::uuid, ${visitorA}, true, 'synthetic-hidden-ip') as result`);
  if (hiddenRace?.code !== "NOT_FOUND") throw new Error(`hidden target was writable: ${JSON.stringify(hiddenRace)}`);

  await root`update mothers_love.recognitions set expires_at = clock_timestamp() - interval '1 second' where id = ${purgeId}::uuid`;
  const purgeClient = makeClient();
  const purgeRaceClient = makeClient();
  await Promise.all([
    purgeClient`select public.ml_purge() as result`,
    purgeRaceClient`select public.ml_reactions_set(${purgeId}::uuid, ${visitorA}, true, 'synthetic-purge-ip') as result`,
  ]);
  const purgedRows = await root`select count(*)::integer as count from mothers_love.recognitions where id = ${purgeId}::uuid or id in (select recognition_id from mothers_love.recognition_reactions where recognition_id = ${purgeId}::uuid)`;
  if (Number(purgedRows[0]?.count ?? 0) !== 0) throw new Error("purge contention left a target or reaction row");

  console.log(JSON.stringify({ duplicateCount: duplicateItem.count, opposingCount: opposingItem.count, purgeRows: Number(purgedRows[0]?.count ?? 0) }));
} finally {
  try {
    await root`delete from mothers_love.recognitions where id in (${id}::uuid, ${hiddenId}::uuid, ${purgeId}::uuid)`;
    if (originalSettings) {
      await root`update mothers_love.settings set mode = ${originalSettings.mode}, last_cleanup_at = ${originalSettings.last_cleanup_at}, overdue_purge_count = ${originalSettings.overdue_purge_count} where singleton_id = true`;
    }
  } finally {
    await Promise.all(clients.map((client) => client.end({ timeout: 5 })));
    await root.end({ timeout: 5 });
  }
}
