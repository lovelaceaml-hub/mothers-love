# Mother's Love Promo Commercial

A self-contained 60-second vertical (9:16) promotional film built from the real Mother's Love app experience.

## Story

**Notice someone → recognize them → send it → watch the act of love become part of something larger.**

The render captures the deployed mobile experience without submitting fake production data, uses the exact nine expressions from `src/lib/catalog.ts`, and moves from the phone into the `/display` TV experience.

### Timeline

| Time | Scene | Purpose |
| --- | --- | --- |
| 0:00–0:05.5 | Opening | A kind word can begin peace |
| 0:05.5–0:13 | Live feed | Actual mobile feed + Share a recognition CTA |
| 0:13–0:26 | Submission | Actual recognition form states; recipient → expressions → message |
| 0:26–0:35.5 | Nine expressions | All nine campaign phrases shown clearly |
| 0:35.5–0:42.5 | Arrival | Recognition-received moment + visual seed/bubble journey |
| 0:42.5–0:51.5 | Phone → TV | The recognition joins the large display |
| 0:51.5–1:00 | End card | Beginning of Peace: The Words of Mother's Love |

## Deliverables

The GitHub Actions workflow produces:

- `mothers-love-promo-vertical.mp4` — 1080×1920 H.264/AAC master
- `mothers-love-promo-cover.png` — 1080×1920 promotional cover
- `mothers-love-promo-preview.gif` — lightweight review preview
- `voiceover.txt` — final narration

The music bed and sound design are synthesized specifically for this project. No third-party song is bundled.

## Privacy-safe capture

The capture script uses the real deployed UI, replaces visible public-feed names/messages with fictional review copy before filming, and never presses **Send recognition**. The TV screenshot is deliberately blurred before the commercial overlays fictional recognition content.

## Render locally

```bash
npm install --prefix promo-commercial
cd promo-commercial && npx playwright install chromium && cd ..
node promo-commercial/capture-app.mjs
python3 -m http.server 4173 --directory .
# in another shell:
node promo-commercial/record-promo.mjs
python promo-commercial/make-audio.py
```

For the finished voice/music mix, use the same FFmpeg command in `.github/workflows/render-mothers-love-promo.yml`.
