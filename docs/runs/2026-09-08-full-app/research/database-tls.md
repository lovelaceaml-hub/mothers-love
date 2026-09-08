# Campaign database TLS

The final connection audit found no explicit SSL mode in the runtime URL and no postgres.js SSL option. Collection remained closed and there were no campaign recognitions. A certificate-verified connection with the default trust store failed SELF_SIGNED_CERT_IN_CHAIN, so no certificate-validation bypass was accepted.

The official Supabase dashboard source resolves the public CA URL to https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt. Provenance: https://github.com/supabase/supabase/blob/master/apps/studio/hooks/custom-content/custom-content.json and https://supabase.com/docs/guides/platform/ssl-enforcement.

Root fetched the CA over verified HTTPS and connected to the authorized campaign pooler using postgres.js ssl options with this CA and rejectUnauthorized:true. The actual restricted role connection succeeded with certificate and hostname verification. Public CA SHA-256 fingerprint: 80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA. Certificate valid through April 26, 2031.

Luna implemented mandatory server-only DATABASE_CA_CERT and strict SSL options, with no runtime certificate download and no URL downgrade. Root owns protected provider configuration and deployment. This repair does not alter shared database SSL enforcement or reboot the shared service. Integrated at cdc7ec5. Five TLS tests verify missing/fake CA rejection, escaped PEM normalization and URL downgrade prevention. Four invitation tests verify provider retry without renewal and no email on denied/error paths. Deployment dpl_F81Egy8cAr6D5GvE3FqUAiFMMcnD returned configured true from the real database-backed config endpoint with this strict TLS adapter.
