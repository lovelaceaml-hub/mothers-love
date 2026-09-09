# Runtime read stall diagnosis

Observed: static/display200 immediately; config DB read no response within15seconds; TV snapshot429 repeatedly with spaced probes. Supabase metadata shows cleanup healthy, six eligible records and only idle runtime connections, no SQL lock waits. No query text or recognition content was read into records.

Code confirms the cached max1postgres client is shared by TV reads and application operations. BEGIN reserves its sole connection; SQL statement_timeout starts after BEGIN and cannot bound pool queue or protocol stalls. An unsettled request cannot reach admission release; twelve occupied slots reject later polls. The exact provider suspension event cannot be proven from these nonpersonal checks, but the missing whole-operation deadline and shared-pool dependency are concrete.

Approved narrow correction: separate TV-read-only cached pool, whole-operation eight-second deadline including queue/BEGIN/commit, same five-second SQL deadline, exact-generation eviction and end(timeout0) only for that read pool. Never terminate mutation pool or replay mutations. No schema, credential, dependency, provider setting or public field change. Existing routefinally releases slots when deadline settles.

Source: installed postgres.js3.4.9 index.js begin/end and connection.js idle timer behavior. Official Vercel connection lifecycle guidance: https://vercel.com/kb/guide/connection-pooling-with-functions. No unsupported attachDatabasePool adapter is added.
