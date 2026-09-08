# Owner bootstrap runbook

Root performs this once after applying the campaign migration and confirming the restricted runtime grants.

1. Confirm the owner's Auth account exists through the provider console or the existing authenticated sign-in flow. Do not create a password, change global signup settings, or place the owner email in source, fixtures, logs, or run records.
2. Obtain only the Auth user UUID through the provider's authenticated owner provisioning path.
3. Insert one synthetic membership row from the authorized database session. Replace the placeholder in a local shell or SQL client only, then clear that local input:

```sql
INSERT INTO mothers_love.admin_memberships (user_id, role, active)
VALUES ('<AUTH_USER_UUID>', 'owner', true)
ON CONFLICT (user_id) DO UPDATE SET role = 'owner', active = true, updated_at = now();
```

4. Sign in through the provider's MFA flow and verify `GET /api/admin/session` returns `role: "owner"` with `needsMfa: false` only after aal2 is present.
5. Keep collection closed until root has run the privacy and purge preflight. Open collection through the Owner settings route only after the provider migration, cleanup job, and deployed smoke checks pass.

The invite route creates bounded pending campaign invitations and asks the provider's public email OTP flow to authenticate an invited address. It does not use a project-wide service-role key and does not grant access based on Auth metadata alone.

