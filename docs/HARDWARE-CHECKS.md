# Hardware checks only Anthony can do

Five checks that need the real church TV, a real phone and a real sign in. None of them was ever recorded (handoff, open item 5). Each takes a few minutes. A check counts only with real evidence: a photo, or a sentence from Anthony saying what he saw. Nobody records one from a simulator or a guess.

Do them at a quiet time. Nothing here sends a test recognition to the live site, except check 2, which uses one real recognition somebody was going to send anyway.

| # | Check | What to do | It passes when | Evidence |
|---|---|---|---|---|
| 1 | The church TV at viewing distance | Open the TV page on the church TV: https://mothers-love.vercel.app/display . Stand where people sit, at the back row. Watch two different screens go by. | You can read the recipient's name and the whole message from the back row without squinting, nothing is cut off at the screen's edges, and the motion is smooth. | One photo from the back row. |
| 2 | One real arrival on the church TV | With the TV page open, wait until someone sends a real recognition from their phone (or send a real one yourself to someone who deserves it). | Within about 20 seconds during service hours, the new recognition arrives on the TV with its entrance, and afterwards it stays in the rotation. | A sentence: about how many seconds it took. |
| 3 | A phone scanning the TV's QR code | From a seat, point a phone camera at the QR code on the TV. | The phone offers a link, and the link opens the recognition form at https://mothers-love.vercel.app/recognize . | A sentence: which phone, and from how far away it worked. |
| 4 | A real Owner sign in | On your own computer or phone open https://mothers-love.vercel.app/admin/login and sign in with the Owner account. Open one recognition from the list. | You get in without an authenticator step, the list shows the recognitions, and the detail page opens. | A sentence saying it worked. Never a screenshot of the list (it shows real names). |
| 5 | The Android TV box in kiosk mode | On the Android device open https://mothers-love.vercel.app/display?kiosk=1 , press "Enter full screen", then leave it for 15 minutes. | The page fills the screen with no browser bars, the screen does not dim or sleep, and recognitions keep changing. | One photo after 15 minutes. |

## If something fails

Say which number failed and what you saw. Nothing needs fixing on the spot: every check is read-only except the one real recognition in check 2.

## Where the results go

Photos go to Drive: `My Drive/Projects/Mother's Love/The Words of Mother's Love`, never into the repository. The agent then records the date and result of each check in `docs/HANDOFF.md`.

## Results

| # | Date | Result |
|---|---|---|
| 1 | not done | |
| 2 | not done | |
| 3 | not done | |
| 4 | 2026-11-11, in part | The agent opened the admin in Anthony's Chrome, where a sign in was still saved: the list showed 50 rows, each with a like count, and one detail page showed likes, the last change and the History card. Counts and labels only; nothing was captured. A fresh sign in with the password was not done, so the check stays open for Anthony. |
| 5 | not done | |
