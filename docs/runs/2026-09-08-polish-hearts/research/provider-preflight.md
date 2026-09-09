# Provider preflight

Current official Supabase changelog fetched and scanned September8. No relevant hostedPostgres/function breakingchange identified. DatabaseFunctions guidance confirms emptysearchpath and explicitgrants for SECDEF bridges. Sources: https://supabase.com/changelog.md and https://supabase.com/docs/guides/database/functions. Existing sharedproject and restrictedruntime are retained; no newcredentials or unrelatedschema changes. Root willcompare existingpublic/auth functionmetadata and campaignmigrationledger before/after the additive release.

Verified existing Supabase cvuwdlmlukepwfffpgdu ACTIVE_HEALTHY, PostgreSQL17.6.1.141. Cleanuphealthy true. Existing public/auth functionsource/owner/ACL fingerprint a774f6f8cbcfb58cbd06bacee0ba51c3. Ledger001 through004 hashes match source. Exactnewobjects remainforcontract freeze.
