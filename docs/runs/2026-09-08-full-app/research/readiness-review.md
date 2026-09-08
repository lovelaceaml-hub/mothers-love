# Readiness acceptance and activation

Verdict: PASS. Fresh independent gpt-5.6-terra high reviewer rehashed all 92 entries of the isolated readiness export, reviewed the cumulative six-file code/test patch, the shared name predicate and exact activation query, and found no material defect.

Implementation 58e9388 preserves the original Unicode-aware browser name formatting and applies it server-side to public submissions and supplied admin edits. Root: 71 focused tests, lint, production build and 48 deployed browser journeys pass. The real closed-collection API returned 400 for malformed names; unit route tests confirm no database call.

Root verified the executed SQL against the reviewed hash 43f15f674f7b897dc87029e4011875c827c8ee4d9c189604a1a826f9c4f29794. The existing settings operation changed collectionOpen only, advanced version1to 2, emitted its ordinary settings event and retained cleanup/Owner/version gates. The returned state was collection open and cleanup healthy. Public HTTP config then reported configured true and collection open; private admin and unpaired display stayed 401 with no-store.

The operation is an authorized provider-operator action on the campaign Owner's behalf, not a fabricated browser token/session. No real Owner sign-in, TV pairing, QR scan or physical visibility result is claimed. No new credential, schema or unrelated app change occurred. Collection is open; physical TV setup remains an operator task.

Implemented-by: Codex/gpt-5.6-luna xhigh. Reviewed-by: Codex controller and independent gpt-5.6-terra high.
