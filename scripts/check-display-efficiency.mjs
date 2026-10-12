// Safe synthetic checks only; this command never uses a configured database.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const repo = fileURLToPath(new URL('..', import.meta.url));
const env = { ...process.env, npm_config_cache: '/tmp/npm-cache', NEXT_TELEMETRY_DISABLED: '1' };
for (const key of Object.keys(env)) {
  if (/^(DATABASE_|SUPABASE_|NEXT_PUBLIC_|VERCEL_)/.test(key) || key === 'PUBLISHABLE_KEY') delete env[key];
}
const run = (command, args) => {
  const result = spawnSync(command, args, { cwd: repo, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};
run(process.execPath, [join(repo, 'node_modules/vitest/vitest.mjs'), 'run',
  'tests/color-polish-data/display-cache.test.ts', 'tests/display/visible-poll.test.ts',
  'tests/backend/reactions-total.test.ts', 'tests/backend/public-display-recovery.test.ts']);

const hasLocal = process.getuid?.() !== 0 && ['initdb', 'pg_ctl', 'psql'].every((command) =>
  spawnSync(command, ['--version'], { env, stdio: 'ignore' }).status === 0);
if (hasLocal) {
  run(process.execPath, ['scripts/test-display-delta.mjs']);
} else {
  if (spawnSync('docker', ['image', 'inspect', 'postgres:16'], { env, stdio: 'ignore' }).status !== 0) {
    console.error('Install local PostgreSQL tools or explicitly prepare Docker with: docker pull postgres:16');
    process.exit(1);
  }
  run('docker', ['run', '--rm', '--network', 'none', '--entrypoint', 'bash',
    '--mount', `type=bind,src=${repo},dst=/app,readonly`,
    '--mount', `type=bind,src=${process.execPath},dst=/usr/local/bin/node,readonly`,
    '--workdir', '/tmp', 'postgres:16', '-c',
    'mkdir /tmp/ml-app && cp -a /app/database /app/scripts /app/src /app/node_modules /app/package.json /tmp/ml-app/ && chown -R postgres:postgres /tmp/ml-app && cd /tmp/ml-app && exec gosu postgres node scripts/test-display-delta.mjs']);
}
