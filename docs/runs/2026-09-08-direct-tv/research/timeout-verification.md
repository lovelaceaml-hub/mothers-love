# Database query deadline verification

Integrated runtime77d23b7 wraps the public snapshot in a read-only transaction with SET LOCAL statement_timeout5000ms. A real disposable PostgreSQL statement sleeping10seconds stopped after5008ms with SQLSTATE57014. The same shared client successfully served the next query and its session statement_timeout returned to0. Request abort checks avoid enqueueing or executing already-cancelled requests; no race-prone late query cancellation is used. No production fixture or personal data was involved.

Final root checks:101unit tests passed across16files, typecheck, lint and production build passed. Earlier independent Terra public-data review passed througha0911ec. This correction changes only transaction deadline and request abort handling; public projection, SQL function, ACL and schema remain unchanged. Native Sol cumulative controller retry remains pending.
