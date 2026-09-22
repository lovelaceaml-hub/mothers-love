# Expression Cosmos checkpoint

Goal: Build one Expression Cosmos prototype based on the first supplied pearl-world image.

Status: Anthony approved the appearance. The requested floating pearl and additional effects are implemented, verified and locally checkpointed. Hosted preview and remote backup are held by automatic approval review. This is one scene, not whole-world completion or production commissioning.

## Deliverables

- [Moving local prototype](http://127.0.0.1:32862/display/cosmos-prototype)
- [Reference comparison](http://127.0.0.1:32862/cosmos-review/index.html)
- [Original scenery builder](../../../scripts/build-pearl-atelier.py) and [runtime GLB provenance](../../../public/world-prototype/atelier/provenance.json)
- [Optimized browser evidence](VERIFICATION.json), [touch/control evidence](TOUCH-VERIFICATION.json), [source manifest](SOURCE-MANIFEST.json) and [local recovery manifest](RECOVERY-MANIFEST.json)

Baseline: c6df983, clean isolated checkout at `/Users/anthony/Projects/mothers-love-worktrees/tv-pearl-sequence`, branch `codex/tv-pearl-sequence`. No other checkout is owned by this task. Downloads originals are unchanged. The original Blender source and full-size evidence are retained under `docs/private/cosmos-prototype/`, excluded from Git and hosting. Reviewed non-personal sources, runtime geometry and fictional comparison images are safe for private source backup.

## Verification

The optimized build passed, including TypeScript. All 71 world tests passed, including five additional exact-route boundary cases. Fourteen optimized browser checks passed: authored GLB loads; live-source query remains fictional; pause freezes time and camera; full reader works; native 3840x2160 buffer; phone has no horizontal overflow; phone title sits above the pearl; camera/scene time advance; hold preserves reading position; reduced motion freezes visual time; Escape restores keyboard focus; graphics loss retains the full reader and retry. The aggregate safety check confirms no API calls or browser errors. The verification JSON groups some assertions into single checks.

Three focused motion tests verify visible, bounded and continuous drift at TV and phone sizes. The optimized browser measured 2.289 world units of horizontal pearl travel over about 5.64 scene seconds, with the pearl, ornaments and text moving together. Gold glints, three light ribbons and drifting petals use the same visual clock. Hold, Pause and reduced motion stop the pearl, camera and effects together. Five additional browser checks confirm persistent touch controls, the first stationary tap opening the reader, restored close focus, disabled invisible desktop controls and keyboard reveal.

The final short HD motion check measured 48 fps, 251 draws and 4,111,764 triangles on this Mac. This does not establish physical-TV performance, Safari/iPad compatibility, viewing-distance readability or a pixel-identical match to the supplied illustration. The authored world is an interactive interpretation of the reference, with the existing canonical campaign symbols and wording layout.

An early browser locator was corrected by explicitly labeling the Content selector. A later hold assertion sampled stale diagnostics; it now waits for the next real engine report before comparing reading time. No application hold defect was found. Geometry and lighting were visually inspected at HD and phone size.

## Review and release boundary

Native Codex controller review used gpt-5.6-sol at high reasoning, read-only, on the full cumulative prototype diff. It found one P2 defect: hidden controls were not reliably revealed on touch devices. The correction keeps touch controls visible and disables hidden desktop controls. A focused correction review found no remaining actionable defect. A final focused review of the requested motion/effects also found no actionable defects in pause, hold, reduced motion, bounded drift, readability, shaders, cleanup or route isolation. No implementation agents or Fable/Opus work were launched.

Durable review results are retained locally at `/private/tmp/mothers-love-pearl-sequence/controller-review-result.txt`, `/private/tmp/mothers-love-pearl-sequence/touch-review-result.txt` and `/private/tmp/mothers-love-pearl-sequence/motion-review-result.txt`. The global orchestrator ledger records the controller and all three review runs; unavailable usage measurements are left blank.

The existing private repository was verified as `lovelaceaml-hub/mothers-love`. The Vercel project is `prj_X48d36FSBJ9QxOJ0XhGydho7Ezkv`, team `team_8gejhZ8EQEvRv6A4rdBUXTW4`, with production branch `codex/mothers-love`. Automatic approval review rejected the preview upload because the exact external destination and payload lacked explicit approval. No preview was published, and no Git push was used to bypass the rejection. Production was not changed.

## Restart locally

```sh
cd /Users/anthony/Projects/mothers-love-worktrees/tv-pearl-sequence
npm_config_cache=/tmp/npm-cache npm run build
npm_config_cache=/tmp/npm-cache npm run start -- --hostname 127.0.0.1 --port 32862
```

## Run ledger

| Run | Model | Work | Status |
| --- | --- | --- | --- |
| Controller | Current Codex GPT-6 session, runtime effort not independently queried | Original scenery, isolated scene, motion/effects, verification, local preview and records | Local checkpoint; publishing held |
| Native review | gpt-5.6-sol, high | Read-only cumulative prototype review, session 01a0c7e7-95b5-71a1-95e2-cb88bcd4d82e | One P2 touch finding, corrected |
| Correction review | gpt-5.6-sol, high | Touch/control correction, session 01a0c7f1-8a65-74d0-8b1f-94498607253b | No remaining actionable finding |
| Motion review | gpt-5.6-sol, high | Motion/effects, session 01a0c7fa-da22-7450-ab2f-a843f398d59f | No actionable finding |
