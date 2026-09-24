# Anthony ruling: Welcome shows for 40 seconds (2026-09-18 about 22:10Z)

Question (from the L1 round 3 writer): at a 30 s Welcome dwell, messages of about 420 graphemes or more cannot finish their pages. Options: skip on Welcome, Welcome 40 seconds, or show anyway cut off.
Answer: "Welcome 40 seconds."

Effect: the full TV loop gets 10 seconds longer. This overrides Plan 17's cross-cutting "durations untouched" rule for Welcome only.
Where durations live: the live TV reads playlist durations from the saved presentation settings (mothers_love presentation playlist, validated by mothers_love.ml_color_polish_valid_playlist, range 12 to 180 s). Code holds only defaults.
Done: tv17/pick 33ffbdc sets COLOR_POLISH_DURATIONS.welcome 40 and core DWELL[1] 40, with tests/color-polish/color-polish.spec.ts updated; tsc clean, vitest 222/222. welcome.js reads S.dwell[1], so its long-message rule follows the live value.
Pending, at release only and with Anthony's confirmation: one settings update of the live presentation playlist entry welcome durationSeconds 30 to 40 (this app's own settings row; no schema change). Until then the live TV and the preview (which reads the same live settings) keep 30 s for Welcome.
