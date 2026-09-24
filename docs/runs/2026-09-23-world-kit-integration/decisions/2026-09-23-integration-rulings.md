# Integration rulings, 2026-09-23 (coordinator, Opus 5.5)

Made under Anthony's grant of full creative and administrative approval for the 3D world.

1. **Reviews (Anthony, 09:12):** "Reviews are to be limited. only for final reviews at the end of
   large sections" (quoted). Wave K's polish, visual and fix rounds (run wf_590b2fe1-fe1) were
   stopped at 09:14 with no half written files. K5 and the integration fixes had no landing
   review; the coordinator checked each diff and ran the acceptance. One final review covers the
   whole world section before completion.
2. **Writers (Anthony, 09:07):** Codex Sol takes a real share of the writing; Astra sparingly.
   K5 and the integration fixes were written by Sol (gpt-5.6-sol) through codex-dispatch.
3. **K1 thin rainbow film ring:** accepted. It sits outside .958 of the face radius; the words are
   untouched.
4. **K1 commit 4a54414 (world colours toward the board's lavender sky and turquoise sea):** kept.
5. **Far zones:** the six far zones render through `applyKitFarZones` in `kit-far-zones.ts`,
   because it carries the clock work the tables describe in `FAR_ZONE_DRESSING`; K3a's table
   builder places the seven near zones. Each zone renders exactly once. Recorded in both files'
   comments.
6. **Hero pearl mirror:** K3a's copy follows K1's merged values (heart side 10.5, peacemakers side
   11, featured outward 8); one Heart lantern and one floating heart moved for clearance.
7. **Sky lane clouds:** the W3 v2 cloud model is smaller, so the two fast legs keep six and eight
   soft clouds with drop 2 to 3 (was 4 to 5) and `SOFT_CLOUD.spacing` 9 (was 16). Every clearance
   assertion is unchanged.
8. **K5 scope:** the Low tier's "residents beyond the active zone unpainted" step is deferred to a
   follow up; everything else in design 7.3, 7.5 and 7.7 landed. Quality mode frame timings wait
   for a quiet machine.
9. **Film layout exporter:** lives in 3D Studio (`unreal/export_world_layout.mjs` on the film
   lane), reading this repository read only, instead of `scripts/world-layout-export.mjs` here.
