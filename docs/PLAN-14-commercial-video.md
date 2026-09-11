# Plan 14: Campaign commercial video

Project: /Users/anthony/Projects/mothers-love. Live app: https://mothers-love.vercel.app. Planner: Fable 5.1 (coordinator only; it authors no script, code, or narration). Drafted September 11, 2026 from Anthony's request: "make a commercial video to build excitement and to encourage participation for this Mother's Love app, using the real viewing, showing, and interaction, a pleasant voice, and an explanation of the Mother's Love campaign, even using the explanations from the official website." Run record: /Users/anthony/Projects/mothers-love/docs/runs/2026-09-11-commercial-video/INDEX.md.

Runner: fresh-chats. The sections are sequential (script, capture, voice, assembly, delivery); Sections 2 and 3 may run at the same time once Section 1 is approved.

## Outcome

Two finished video files, one 16:9 for screens and one 9:16 for phones, that show the real app being viewed and used, explain what the Words of Mother's Love campaign is, and end with the QR code and link that invite people to share a recognition. Narration is a warm neural voice. Every person, name, and message shown on screen is fictional and written for the video.

## Decisions (defaults until Anthony overrides them at kickoff)

- Voice: en-US-AvaNeural (edge-tts, free, no key). Alternate: en-US-JennyNeural. Samples: /Users/anthony/Projects/mothers-love/docs/private/voice-sample-1-Ava.mp3 and /Users/anthony/Projects/mothers-love/docs/private/voice-sample-2-Jenny.mp3.
- Length: 70 to 80 seconds. Hard bounds 60 to 85 seconds.
- Formats: 1920x1080 at 30 fps (screens, GroupMe, YouTube) and 1080x1920 at 30 fps (phones, stories). Both H.264 video, AAC audio, yuv420p, mp4.
- Music: none by default. ffmpeg cannot compose music and no licensed track exists in the project. If Anthony drops a licensed track at /Users/anthony/Projects/mothers-love/docs/private/video/music/track.mp3 before Section 4 runs, it is mixed under the narration at about -18 dB with a fade out.
- Words: on-screen and narrated campaign words use the app's approved catalog exactly (title, tagline, nine phrases and principles in /Users/anthony/Projects/mothers-love/src/lib/catalog.ts). The campaign explanation may quote the official site sentences frozen below, spoken as "from the official campaign site" once, never re-worded into a claim the site does not make.
- Data: fictional recognitions only. No real recognition, name, count, or admin screen appears in any clip, frame, or fixture. Admin and Studio are never recorded.
- Captions: burned in, because most people watch muted. ffmpeg on this Mac has no drawtext or subtitles filter, so every text element (title card, captions, end card) is rendered to PNG by Playwright and placed with the overlay filter.

## Inputs (frozen)

- App wording: /Users/anthony/Projects/mothers-love/src/lib/catalog.ts. Title "THE WORDS OF MOTHER'S LOVE". Tagline "Where a mother's love resides, peace abides." The nine phrases, principles, and examples are read from that file, never retyped from memory.
- Official site, https://heavenlymotherslove.org/en and /en/about, read September 11, 2026. Sentences available for attributed quotation:
  - Campaign name: "Beginning of Peace: The Words of Mother's Love".
  - "Where a mother's love reaches, peace settles."
  - "a small act by one person, filled with a mother's love, is the beginning of changing the world and the first step toward humanity's journey to peace."
  - Participation framing: spreading the campaign "within your communities, including your home, school, or workplace."
  - Call to action: "Join us now!"
  - Background facts usable in narration without quotation marks: the Church of God proclaimed November 1 as Mother's Love and Peace Day at its 60th anniversary in 2024; the 2026 campaign is the second anniversary; the campaign grew from seven to nine expressions.
- Public routes to record: / (home feed with heart likes and the Share a recognition action), /expressions (guide), /recognize (form with nine stacked expression cards; selected cards turn gold and shimmer), /display (public TV, Garden and scene rotation, click advances a scene).
- Existing mocking patterns to copy: /Users/anthony/Projects/mothers-love/tests/feed/feed.spec.ts (feed and reactions), /Users/anthony/Projects/mothers-love/tests/interview/submission-experience.spec.ts (form and submit), /Users/anthony/Projects/mothers-love/tests/color-polish/color-polish.spec.ts and /Users/anthony/Projects/mothers-love/tests/plan08/tv-garden-verification.spec.ts (display snapshot). Endpoints the public pages call: /api/config, /api/feed, /api/reactions, /api/recognitions (POST), /api/display/snapshot, /api/display/color-polish, /api/display/daily.
- Local server: the Playwright config starts npm run dev on http://127.0.0.1:3100 with reuseExistingServer. Use npm_config_cache=/tmp/npm-cache for every npm or npx call.
- Tools present: ffmpeg 8.1.2 at /opt/homebrew/bin/ffmpeg (has xfade, overlay, concat, loudnorm; no drawtext, no subtitles), Playwright 1.58.2 with chromium in /Users/anthony/Library/Caches/ms-playwright, Node 24, python3.13 at /Library/Frameworks/Python.framework/Versions/3.13/bin/python3, edge-tts 7.2.8 installable with pip. The qrcode package is already a dependency.
- Storage: finished videos go to the Drive managed root from /Users/anthony/Projects/docs/STORAGE-PATHS.json, the existing project folder "Project Outputs/The Words of Mother's Love/Commercial" (the README Storage link already points at that Drive folder). Working files stay in /Users/anthony/Projects/mothers-love/docs/private/video/ (gitignored). Tracked files: scripts under /Users/anthony/Projects/mothers-love/scripts/video/ and the script at /Users/anthony/Projects/mothers-love/docs/video/SCRIPT.md.

## Models, lanes, reviews

- Coordinator: Fable 5.1. Reviews and reports, writes no prose or code for the video.
- Writer for Sections 1 to 4: Gemini 3.8 Flash (High) through agy, because Codex primary was at 100 percent at planning time (Plan 13 recorded the reset as Tuesday September 15, 6:12 PM Pacific; check the live pool at kickoff). If Codex primary has headroom at kickoff, gpt-5.6-luna · high via codex-dispatch is the equal alternate for any section. Writable root for agy is /Users/anthony/.claude/worktrees/**, so the agy worktree is /Users/anthony/.claude/worktrees/mothers-love-video.
- Spill if Gemini refuses: Sonnet 5 (medium). Never Opus or Fable for implementation.
- Haiku 4.5 (low) carries every mechanical row: hygiene sweep before review, ledger rows, lane state updates in INDEX.md, filing evidence into logs/, README, HANDOFF and master index link updates.
- Review sizing: internal church media, one landing round per section, Sonnet 5 (high) on the diff of Sections 2 and 4 (the code). Section 1 is reviewed by Anthony (the words are his call) plus a Haiku 4.5 (low) dash and wording check against catalog.ts. No Opus reviewer: no real people's data, nothing irreversible.
- Section 5 completion: Anthony's viewing is the completion gate. No fresh reviewer.
- Ledger: one row per dispatch via ledger-from-transcript.py (Claude) or the agy ledger script.

Cross-cutting rules for every section: no em or en dash anywhere in produced text, captions, code comments, or commit messages; fictional data only; nothing under /Users/anthony/Projects/mothers-love/src changes; no new dependency in package.json (Playwright and qrcode already exist; edge-tts lives in a venv under docs/private/video); nothing in docs/private is committed; no clip shows the admin area, the Studio, a real URL bar with a session, or the Downloads originals.

## Lane 0: Read-only critic

Setup: Gemini 3.8 Flash · high · Lane: Antigravity · Review: none

Argue against this plan before Section 1 starts and again on the approved script. Look for: claims the official site does not make, wording that drifts from catalog.ts, any way real data could reach a frame, timing that cannot fit 60 to 85 seconds, captions too small for a phone, an end card without a scannable QR, missing rollback (there is none needed: outputs are new files). Write findings to /Users/anthony/Projects/mothers-love/docs/runs/2026-09-11-commercial-video/research/lane-0-critique.md. If Codex primary has headroom at kickoff, run the Sol brief from the steps skill instead and file it at the same path. Advice, not the plan.

## Section 1: Script, shot list, and captions

Setup: balanced · high · Lane: Antigravity · Review: Anthony plus Haiku 4.5 dash and wording check

Deliverable: /Users/anthony/Projects/mothers-love/docs/video/SCRIPT.md (tracked). It contains, per beat: beat number and slug, narration text, caption text (short, at most two lines of about 40 characters), the on-screen action to record, the route, the target seconds, and for the 9:16 cut whether the beat uses a phone viewport clip or a cropped desktop clip.

Beats to cover, in this order, exact words to be written by the lane:
1. Open on the title card: title and tagline from catalog.ts. Narration introduces the campaign in one sentence and quotes the official site once ("from the official campaign site").
2. Why: the official framing that one small act filled with a mother's love is the beginning of changing the world, and the home, school, workplace framing.
3. The nine words: a fast pass over the /expressions guide; narration names three or four phrases exactly as written, captions show the phrase being read.
4. The app: home feed, recognitions arriving, a heart like tapped once. Narration explains that members can recognize someone who spoke one of these words to them, and that names stay private.
5. Sharing: /recognize, a fictional name typed, two expression cards selected (gold shimmer visible), a short fictional message typed, submit, the receipt shown.
6. The TV: /display Garden with bubbles, then one click advance to the next scene. Narration says recognitions appear on the TV in the church lobby, or wherever the display is shown.
7. Invitation: end card with the QR code and the URL https://mothers-love.vercel.app/recognize, narration ends with the invitation to share one recognition today and the official "Join us now!" line.

Rules: total narration 170 to 200 words; each narration line reads aloud in under 12 seconds; the words "recognition" and "share a recognition" match the app's copy; nothing about accounts, sign in, admin, or data retention; tone follows the WATV voice (warm, plain, hopeful, no sales language). Every campaign phrase is copied from catalog.ts. Attribute the official site once, not per sentence.

Acceptance: SCRIPT.md exists, Haiku dash check returns zero em or en dashes, every quoted phrase matches catalog.ts byte for byte, word count in range, Anthony replied approved (or the lane recorded his edits) in the Build log before Section 3 begins.

Verify:
```bash
grep -c $'—\|–' /Users/anthony/Projects/mothers-love/docs/video/SCRIPT.md
```
Expected 0.

## Section 2: Capture harness

Setup: balanced · high · Lane: Antigravity · Review: Sonnet 5 (high) on the diff

Deliverable: /Users/anthony/Projects/mothers-love/scripts/video/capture.mjs (tracked) plus /Users/anthony/Projects/mothers-love/scripts/video/fixtures.mjs (tracked, fictional data only, literal in the file). It starts or reuses the local dev server on http://127.0.0.1:3100 (same command as playwright.config.ts), opens Playwright chromium with recordVideo at 1920x1080 for the desktop clips and a phone device at 1080x1920 for the phone clips, mocks every endpoint listed in Inputs with fictional recognitions (at least eight, varied expressions, one long message), performs the actions from SCRIPT.md beat by beat with human pacing (short waits, smooth scrolls, a visible cursor is not required), and saves one webm per beat to /Users/anthony/Projects/mothers-love/docs/private/video/clips/<beat>-16x9.webm and <beat>-9x16.webm where the script asks for a phone clip. It also writes a contact sheet PNG per clip (ffmpeg tile of 6 frames) to /Users/anthony/Projects/mothers-love/docs/private/video/clips/sheets/ and a clips.json with each clip's duration and size from ffprobe.

Rules: POST /api/recognitions is fulfilled with a mocked success receipt, never sent to the real server; the browser context has no cookies or storage from Anthony's profile; reduced motion is off so the shimmer and Garden motion record; the display clip waits for the Garden to populate before recording starts; each clip runs 2 to 4 seconds longer than the beat's target so Section 4 can trim.

Acceptance: every beat in SCRIPT.md has its clip(s); ffprobe reports 1920x1080 or 1080x1920; no clip is shorter than its beat target; the contact sheets show no real data (the fixture names are the only names visible); npm run typecheck and npm test still pass unchanged (the script is outside src and tests).

Verify:
```bash
npm_config_cache=/tmp/npm-cache node scripts/video/capture.mjs && cat docs/private/video/clips/clips.json
```

## Section 3: Narration audio

Setup: balanced · medium · Lane: Antigravity · Review: Haiku 4.5 (low) file and timing check

Deliverable: /Users/anthony/Projects/mothers-love/scripts/video/narrate.sh (tracked). It creates or reuses a venv at /Users/anthony/Projects/mothers-love/docs/private/video/.venv with edge-tts, reads the narration lines from SCRIPT.md (or a narration.json the Section 1 lane also emits next to SCRIPT.md), synthesizes one mp3 per beat with the chosen voice at rate -5% and a natural pause, writes them to /Users/anthony/Projects/mothers-love/docs/private/video/audio/<beat>.mp3, and writes timing.json with each beat's audio duration from ffprobe.

Acceptance: one mp3 per beat, timing.json present, sum of durations plus 0.8 s gaps between 60 and 85 seconds, no beat over 12 seconds. Anthony listens to the joined preview at /Users/anthony/Projects/mothers-love/docs/private/video/audio/preview.mp3 and either approves or names the line to change.

Verify:
```bash
bash /Users/anthony/Projects/mothers-love/scripts/video/narrate.sh && cat /Users/anthony/Projects/mothers-love/docs/private/video/audio/timing.json
```

## Section 4: Assembly

Setup: balanced · high · Lane: Antigravity · Review: Sonnet 5 (high) on the diff

Deliverable: /Users/anthony/Projects/mothers-love/scripts/video/assemble.mjs (tracked) and /Users/anthony/Projects/mothers-love/scripts/video/cards.html (tracked). cards.html renders, from SCRIPT.md and catalog.ts wording, a title card, one caption overlay per beat (transparent background, bottom third, large readable type on a soft rounded panel in the app's palette), and an end card with the QR code (generated by the qrcode package for https://mothers-love.vercel.app/recognize) and the URL in plain text. assemble.mjs screenshots each card to PNG at both sizes, then drives ffmpeg: each clip is trimmed or held on its last frame to the beat's audio duration plus 0.8 s, clips are joined with 0.5 s xfade, caption PNGs are overlaid for the beat's span, the title and end cards get 3 s and 5 s, narration is concatenated with the same gaps, loudnorm is applied, optional music is ducked under narration, and the result is encoded H.264 yuv420p 30 fps with AAC 160k. Outputs: /Users/anthony/Projects/mothers-love/docs/private/video/out/mothers-love-commercial-16x9.mp4 and /Users/anthony/Projects/mothers-love/docs/private/video/out/mothers-love-commercial-9x16.mp4, plus a contact sheet of each final file.

Acceptance: both files play in QuickTime; ffprobe reports h264 and aac, 1920x1080 and 1080x1920, 30 fps, duration 60 to 85 s; every caption is fully inside the frame on the phone cut; the QR on the end card decodes to the recognize URL (verify with a phone camera if no decoder is installed, and record which); audio and captions line up with the matching clip within 0.3 s; no em or en dash in any card.

Verify:
```bash
cd /Users/anthony/Projects/mothers-love && npm_config_cache=/tmp/npm-cache node scripts/video/assemble.mjs && ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate:format=duration -of default=nw=1 docs/private/video/out/mothers-love-commercial-16x9.mp4
```

## Section 5: Review, storage, and handoff

Setup: fast · low · Lane: Claude · Review: Anthony's viewing

Anthony watches both files. One correction round is allowed inside this section (a re-run of Sections 3 and 4 with edited lines). Then: copy both mp4 files and SCRIPT.md to the Drive folder "<managedRoot>/Project Outputs/The Words of Mother's Love/Commercial/" reading managedRoot from /Users/anthony/Projects/docs/STORAGE-PATHS.json, verify SHA-256 of each copy against the original, record the rows in the Build log; add a Storage quick link to /Users/anthony/Projects/mothers-love/README.md; add a September 11 entry to /Users/anthony/Projects/mothers-love/docs/HANDOFF.md; update the Mother's Love line in /Users/anthony/Projects/README.md; commit the tracked scripts and SCRIPT.md; push to the private repo; ledger rows for every dispatch.

Acceptance: Drive copies verified, links live, commit pushed, Build log carries the completion trailer.

## Build log

- 2026-09-11 (Fable 5.1, planning): plan drafted from Anthony's request. Tooling verified on this Mac (ffmpeg 8.1.2 without drawtext or subtitles, Playwright 1.58.2, edge-tts installable). Official site text captured for attributed quotation. Two voice samples generated with edge-tts and saved under docs/private/ for Anthony's choice. No implementation started. Awaiting Anthony's choice of runner mode, voice, length, and formats.
- 2026-09-11 (Fable 5.1, planning): Anthony chose Full project mode, voice 1 (en-US-AvaNeural), length about 75 seconds, both formats (16:9 and 9:16). The defaults in Decisions stand as chosen. Kickoff prompt handed to Anthony for a fresh chat.
- 2026-09-11, 10:16 AM Pacific (Full project chat, coordinator Fable 5.1): kickoff. Live pools at preflight: Codex primary 100 percent (resets Tuesday September 15, 6:12 PM Pacific), Gemini weekly 20 percent, Claude weekly 57 percent, so every writer lane runs Gemini 3.8 Flash (High) through agy as the plan names. Plan file and run record tree committed as 3902f93 on codex/color-polish-v6 (the working branch; main is not used in this repository). Completion-review baseline: 3902f93, dirty-tree baseline recorded under the external authorized store with opaque id 406bf93d (README.md, Plan 13 log files, next-env.d.ts modified; color-review-evidence untracked; none touched by this plan). Writer worktree /Users/anthony/.claude/worktrees/mothers-love-video on branch video/plan14 with a real node_modules copy; critic checkout /Users/anthony/.claude/worktrees/mothers-love-video-critic detached at 3902f93. Lane 0 (critique) and Section 1 (script) launched together from orders/L0.md and orders/S1.md. Section 1 setup line held (balanced, high). Coordinator noted: the display page polls /api/display/color-polish (already in the plan's endpoint list) and the Section 2 order mocks it with the same shape tests/color-polish-usable/usable.spec.ts builds.
- 2026-09-11, 10:28 AM Pacific: Lane 0 critique landed (Gemini 3.8 Flash via agy, ten objections, disposition in docs/runs/2026-09-11-commercial-video/research/lane-0-critique.md; accepted findings shape the Section 2 to 4 orders: narration placed per beat on the post-crossfade timeline, catch-all 503 API route, one browser context per clip with an in point, forced device scale factor 2 for sharp phone clips, TV beat fitted not cropped on the phone cut, opencv QR decode and ffmpeg decode checks instead of a phone camera and QuickTime, URL text primary on the phone end card, narration says anyone rather than members). Section 1 landed and was reviewed: script committed on video/plan14 as 59ed155 after one correction round (beat 4 privacy wording, a defect in the coordinator's order, not the writer's). Setup line held. Stated deviation: the plan asks for Anthony's approval of the words before Section 3 begins; this Full project chat runs unattended, so Sections 2 and 3 launched on the reviewed script and Anthony's approval is taken at the Section 5 viewing, where the plan's one correction round (re-run of Sections 3 and 4 with edited lines) absorbs any edits. Sections 2 and 3 launched together on Gemini 3.8 Flash (High) via agy: Section 2 in /Users/anthony/.claude/worktrees/mothers-love-video, Section 3 in a second writer worktree /Users/anthony/.claude/worktrees/mothers-love-video-audio (branch video/plan14-audio, one writer per worktree), orders S2.md and S3.md. Coordinator experiment before the Section 2 order: Playwright records the CSS viewport, not device pixels, unless chromium is launched with --force-device-scale-factor=2; with it, a 540x960 viewport records a sharp 1080x1920 clip.
- 2026-09-11, 11:10 AM Pacific: Sections 2, 3 and 4 landed on Gemini 3.8 Flash via agy with the headless gate as the recurring cost: three runs (S2 a1, S3 a2, S4 a1) produced nothing because the gate denied a shell command or the root agent exited on a background task, so every later order carries tool rules (file tool for reads, allowed commands only, no background tasks). Section 3 first pass had beat 3 at 12.8 s; Section 1 round 2 trimmed it to 23 words (narration 173 words, speech 69.2 s, with gaps 74.0 s). Section 2 landing review (Sonnet 5 high, logs/S2/sonnet-review.md): one finding, the spawned dev server was not reliably killed; round 1 fixed it with a detached spawn and process-group kill and also hid the Next.js dev badge the coordinator found recorded in every clip. Coordinator findings on Section 2: the first capture reused the dev server on port 3100, which belongs to the Plan 13 tv/pick worktree, so a VIDEO_PORT override was added (one-line glue) and every clip was re-recorded against the video branch on port 3101; a stray node_modules/node_modules self-symlink copied from the main repository broke Turbopack in the worktree and was removed. Section 4 attempt 2 assembled both files at 78.08 s (h264, aac, 30 fps, QR decoded by opencv, speech onsets within 0.3 s of the planned timeline by silencedetect). Coordinator findings on Section 4: the catalog regex stopped at apostrophes so the title card read "THE WORDS OF MOTHER" (round 1, running), the card beats carried a caption that duplicated the card text and the phone end card wrapped the URL mid word (round 2, queued). Typecheck and 222 unit tests pass in the worktree. All setup lines held.
- 2026-09-11, 1:20 PM Pacific (Section 5, Claude lane, Fable 5.1 coordinator): Section 4 landing review (Sonnet 5 high, logs/S4/sonnet-review.md) returned six findings, all fixed in round 3 (commit 2f83dbf); the confirmation pass (Sonnet 5 high) returned NO_MATERIAL_FINDINGS. Final clips were re-recorded after the badge fix and the final assembly run printed QR OK and ASSEMBLE OK. Final outputs, identical bytes in the worktree, the main repository and Drive:
  - mothers-love-commercial-16x9.mp4, 16354979 bytes, 78.08 s, SHA-256 02f3ec82a939cc1a90c18acec477f3a668b4c90a0cbaf38397b28a5203f89d4b
  - mothers-love-commercial-9x16.mp4, 17552519 bytes, 78.08 s, SHA-256 afb34d4268ab8b665ca637e8697bb6403b7e89f8ec6aa2a16ec00266ed353048
  - SCRIPT.md, 3912 bytes, SHA-256 472f470a6e45f764a2b6d37a040c77b71a37bbacb8cb8c557f2c6c4b0a1b682a
  Drive copies verified by SHA-256 in /Users/anthony/Library/CloudStorage/GoogleDrive-lovelace.aml@gmail.com/My Drive/Anthony Mac Storage/Project Outputs/The Words of Mother's Love/Commercial/. Working files (clips, audio, cards, outputs) sit in /Users/anthony/Projects/mothers-love/docs/private/video/ (gitignored). Branch video/plan14 merged into codex/color-polish-v6 (054faca); README Storage and Plan 14 lines, docs/HANDOFF.md and the master index updated. Ledger rows appended for every Gemini dispatch (14) and every Claude-side check or review (5). Completion gate still open: Anthony's viewing of both files and his approval of the words, with the plan's one correction round (edit docs/video/narration.json and SCRIPT.md, then rerun scripts/video/narrate.sh and scripts/video/assemble.mjs, recopy to Drive) available inside this section. Known limitation: no music (no licensed track was provided). Review baseline 406bf93d compared at completion: the pre-existing dirty files (README.md of the concurrent Plan 13 chat, Plan 13 logs, next-env.d.ts, evidence folders) were left untouched; only the Plan 14 README line was staged.
  Implemented-by: Antigravity/Gemini 3.8 Flash (High and Medium) via agy, coordinator Fable 5.1 · Reviewed-by: Fable 5.1 coordinator + Sonnet 5 high (Sections 2 and 4) + Haiku 4.5 low checks (Sections 1 and 3) (clean final pass, Anthony's viewing pending)
