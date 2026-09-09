# Public TV request admission

B4 implements180requests/minute per hashed client key,24burst,12in-flight database requests per instance,512retained keys and10-minute logical expiry. This bounds per-instance queued work without caching recognitions or making database writes. Ordinary simultaneous TV polls are covered by tests. Rejections return429,Retry-After5,no-store and skip the query; slots release on success, failure and invalid projection. This is not a distributed global quota.

Official provider header reference: https://vercel.com/docs/headers/request-headers. Vercel replaces X-Forwarded-For to prevent client spoofing and supplies x-vercel-forwarded-for as the protected equivalent. Production prefers that header, with the final forwarded address fallback only when VERCEL=1; other environments share one bucket. No IP value is logged or persisted.

Root integrated the original B4 commit as e7b726e and the amended header-only delta as a0911ec after checking the primary provider documentation. Original agent commit history remains preserved.
