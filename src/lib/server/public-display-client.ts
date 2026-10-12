import postgres, { type Sql } from "postgres";
import { getServerConfig } from "./env";

type PublicDisplayGeneration = {
  client: Sql;
  retired: boolean;
};

let activeGeneration: PublicDisplayGeneration | null = null;
const generations = new WeakMap<Sql, PublicDisplayGeneration>();

export function getPublicDisplayClient(): Sql | null {
  if (activeGeneration && !activeGeneration.retired) return activeGeneration.client;

  const config = getServerConfig();
  if (!config) return null;

  const client = postgres(config.databaseUrl, {
    max: 1,
    prepare: false,
    // These read bridges use JSONB; nested arrays are parsed by JSON.parse.
    fetch_types: false,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: config.databaseSsl,
  });
  const generation: PublicDisplayGeneration = { client, retired: false };
  activeGeneration = generation;
  generations.set(client, generation);
  return client;
}

export function retirePublicDisplayClient(client: Sql): void {
  const generation = generations.get(client);
  if (!generation || generation.retired) return;

  generation.retired = true;
  if (activeGeneration === generation) activeGeneration = null;

  try {
    const ending = client.end({ timeout: 0 });
    void Promise.resolve(ending).catch(() => undefined);
  } catch {
    // The timed-out read has already been failed closed. Keep teardown best-effort
    // so a client implementation that throws does not keep the route pending.
  }
}
