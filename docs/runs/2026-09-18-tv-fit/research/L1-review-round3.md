# L1 review round 3 (fresh Claude Opus 5), about 22:30Z: failed

Holds: drawn floor 18.0 px (36 at 3840) everywhere including enter/exit and Orbit back; Orbit opaque planets clear of the title, 80 to 500 graphemes whole; Goal opaque pearls with edge fade only; reduced motion; changed asserts orbit.spec.ts:269 and welcome.spec.ts:221 legitimate.
1. Blocking: Welcome's shrink fallback (welcomeLayoutSet(host,set,0.5) from welcomeChooseSet, about line 548) pages normal and medium records with ordinary pools (100 chars 3 pages with shorter records available; five bubbles paging at once; some past the dwell). Cause: records deferred as room-for-<long id> are never restored when that long record is itself deferred.
2. Blocking: Welcome drops to 2 or 3 bubbles through the same cascade; spec loosened to 4 to 6.
3. Major: late drift replacement pages past the scene change (checks full dwell, not time left).
4. Minor: welcome.spec.ts:679 assertion cannot fail.
5. Minor: a drifted bubble can sit up to 12 px over a large still bubble's words.
6. Minor: 140 to 300 char records rarely arrive by drift into the five smaller bubbles (same record kept on 3 of 4 exits).
Note: refitWelcomeWhenFontsReady defined twice (second drops the size-cache clear); fonts never load on the TV (font-src 'none').
At 40 s dwell: 400 graphemes 2 pages (3 when crowded); 500 graphemes 3 pages at about 340 px, 2 pages only with very short neighbours.

Anthony ruling (about 22:35Z), "Fewer, whole": Welcome shows six bubbles whenever six fit whole; otherwise as many as fit whole. A normal message (fits the largest bubble) never pages. Only a record too long for the largest bubble pages, in the largest bubble, and only when its pages finish within the time left in the scene.
Disposition: all findings accepted; round 4 to a fresh Fable 5.1 writer (ladder top).
