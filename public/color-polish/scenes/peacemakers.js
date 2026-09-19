// Scene 8: We Are Peacemakers.
//
// What the live TV shows today (Plan 12 production, commit b7d92a0) with the
// one change Anthony asked for on September 19 after watching the church TV:
// one big bubble is reserved for the very long recognitions, so they fit in
// the bubble. Everything else on this screen stays as the live TV shows it:
// the title copy, the globe artwork, the bubble styling, and the shared
// orb/floater motion in core/orbs.js and core/motion.js.
//
// The reserved bubble is the only place a very long recognition appears. The
// other bubbles only ever take a message that fits them whole. "Very long" is
// measured, never guessed: a record is very long when its whole message does
// not fit the largest regular bubble at the 18 px font floor. Everything here
// is in the 1812 x 636 design stage of renderer.css, which the TV scales, so
// the same floor is 36 px on a 3840 wide screen.
'use strict';

// The reserved bubble is the largest circle the layout allows: it clears the
// title copy (which ends at x 841), the globe artwork (which ends at x 875),
// the three regular bubbles, and the countdown ring in the stage's bottom
// right corner (stage x 1756 to 1792), keeping a 32 px top and bottom margin.
const PEACEMAKERS_RESERVED = [1168, 32, 572];
// The other bubbles keep production's diameters and drift as they do today.
const PEACEMAKERS_REGULAR = [[860, 14, 312], [860, 326, 304], [528, 320, 295]];
// A message that does not fit the largest regular bubble whole fits none of
// them, so this is the diameter that decides "very long".
const PEACEMAKERS_REGULAR_MAX = 312;
// core/orbs.js fitCircle()'s font floor, in design pixels.
const PEACEMAKERS_FLOOR = 18;
// How far down the pick order to look for a record a bubble may show.
const PEACEMAKERS_SCAN = 24;
// Seconds a bubble waits before trying again, when nothing may replace it.
const PEACEMAKERS_RETRY = 12;

let peacemakersReservedKey = null;
let peacemakersSegmenter = null;
const peacemakersFitCache = new Map();

// The slot key of the reserved bubble in the current render, or null. Read by
// this scene's spec and useful in QA; the renderer itself uses the variable.
function peacemakersReservedSlotKey() {
  return peacemakersReservedKey;
}

// Graphemes, not UTF-16 units: an emoji or a combining accent is one
// character to the person who wrote it.
function peacemakersGraphemes(text) {
  const value = String(text ?? '');
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    if (!peacemakersSegmenter) peacemakersSegmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    return [...peacemakersSegmenter.segment(value)].length;
  }
  return [...value].length;
}

// Does this whole message fit a bubble of this diameter?
//
// This mirrors core/orbs.js fitCircle()'s fit test at the font floor: same
// 80 percent content width, same 0.855 diameter height limit, same long name
// and many chip adjustments, same small bubble adjustments under 335 px.
// fitCircle steps the font down from its starting size and stops as soon as
// the content fits, so "fits at the floor" is exactly "fitCircle renders this
// message whole in a bubble this size". It measures an offscreen copy inside
// the stage, so the real renderer.css rules apply, and it never paginates,
// mutates a live slot or writes to the log.
function peacemakersFitsWhole(record, diameter) {
  if (!record) return false;
  const key = diameter + '|' + record.id + '|' + record.message.length + '|' + record.name.length + '|' + record.ids.length;
  if (peacemakersFitCache.has(key)) return peacemakersFitCache.get(key);
  const host = document.createElement('div');
  host.className = 'orb-slot';
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'left:-6000px;top:0;width:' + diameter + 'px;height:' + diameter + 'px;visibility:hidden;pointer-events:none';
  host.innerHTML = '<div class="orb-life">' + completeOrb(record, diameter) + '</div>';
  ($('stage') || document.body).append(host);
  let fits = false;
  try {
    const content = host.querySelector('.orb-content');
    const message = host.querySelector('.message');
    const title = host.querySelector('.recipient');
    const chipBox = host.querySelector('.chips');
    if (content && message) {
      if (title && record.name.length > 16) title.style.fontSize = (diameter >= 450 ? 30 : 23) + 'px';
      if (chipBox && record.ids.length > 3) {
        chipBox.style.gap = '3px';
        chipBox.querySelectorAll('.chip').forEach((chip) => { chip.style.fontSize = (diameter >= 450 ? 13 : 10) + 'px'; chip.style.padding = '2px 4px' });
      }
      message.style.fontSize = PEACEMAKERS_FLOOR + 'px';
      message.style.lineHeight = '1.27';
      message.textContent = record.message;
      content.style.width = '80%';
      content.style.maxWidth = '80%';
      if (diameter < 335) {
        if (title) title.style.fontSize = '26px';
        if (chipBox) {
          chipBox.querySelectorAll('.chip').forEach((chip) => {
            chip.style.fontSize = '10.5px';
            chip.style.padding = '2px 3px';
            const image = chip.querySelector('img');
            if (image) { image.style.width = '16px'; image.style.height = '16px' }
          });
          chipBox.style.marginTop = '6px';
        }
        host.querySelector('.like-count')?.style.setProperty('margin-top', '6px');
      }
      fits = content.scrollHeight <= diameter * .855;
    }
  } finally {
    host.remove();
  }
  if (peacemakersFitCache.size > 400) peacemakersFitCache.clear();
  peacemakersFitCache.set(key, fits);
  return fits;
}

// Very long: too long for any regular bubble to hold it whole.
function peacemakersVeryLong(record) {
  return !!record && !peacemakersFitsWhole(record, PEACEMAKERS_REGULAR_MAX);
}

// The next record in core/state.js choose()'s own order (least recently shown
// first) that this bubble is allowed to show, or null.
function peacemakersPick(exclude, allowed) {
  const tried = exclude.slice();
  for (let i = 0; i < PEACEMAKERS_SCAN; i++) {
    const record = choose(tried);
    if (!record) return null;
    if (allowed(record)) return record;
    tried.push(record.id);
  }
  return null;
}

function peacemakersTaken(actor) {
  const taken = [];
  for (const other of V.actors) {
    if (other === actor) continue;
    if (other.id) taken.push(other.id);
    if (other.nextId) taken.push(other.nextId);
  }
  return taken;
}

// What this bubble may show next, or null to keep the one it has.
//
// The reserved bubble turns over only for another very long recognition, so
// several of them take turns in it. It never trades one regular message for
// another: this is the biggest thing on the screen, and the live drift
// replacement carries a bubble right off the stage and back, which would leave
// a hole where the reserved bubble belongs for no gain. The pool only changes
// when a new snapshot re-renders the scene, so holding never hides a very long
// recognition that has just arrived.
function peacemakersCandidate(actor) {
  const taken = peacemakersTaken(actor);
  taken.push(actor.id);
  if (actor.key === peacemakersReservedKey) return peacemakersPick(taken, peacemakersVeryLong);
  return peacemakersPick(taken, (record) => peacemakersFitsWhole(record, actor.d));
}

// Runs for every bubble on every physics frame, before core/motion.js moves
// it and before core/motion.js tickSlots() decides a replacement. It returns
// false so the live drift motion runs untouched; it only corrects which
// record a bubble is about to take.
function peacemakersIntegrate(actor) {
  if (!V.actors || !V.actors.length) return false;
  if (actor.nextId && actor.peacemakersFor !== actor.nextId) {
    // replaceActor() picked by recency alone, which can put a very long
    // recognition in a regular bubble. Re-pick under this scene's rule.
    const pick = peacemakersCandidate(actor);
    const next = pick ? pick.id : actor.id;
    actor.nextId = next;
    actor.peacemakersFor = next;
    log('peacemakers_replacement', { key: actor.key, reserved: actor.key === peacemakersReservedKey, id: next });
  }
  if (!actor.nextId) actor.peacemakersFor = null;
  if (actor.life === 'steady' && !actor.nextId
    && V.clock >= Math.max(actor.retireAt, actor.born + (actor.minRead || 0))
    && V.clock - (actor.peacemakersProbedAt || 0) >= .75) {
    actor.peacemakersProbedAt = V.clock;
    // Hold the bubble rather than retire it with nothing allowed to take its
    // place; an empty bubble is never an option.
    if (!peacemakersCandidate(actor)) {
      actor.retireAt = V.clock + PEACEMAKERS_RETRY;
      log('peacemakers_hold', { key: actor.key, reserved: actor.key === peacemakersReservedKey });
    }
  }
  return false;
}

function peacemakersBubbles() {
  peacemakersReservedKey = null;
  const used = [];
  let markup = '';
  const reserved = peacemakersPick(used, peacemakersVeryLong) || choose(used);
  if (reserved) {
    markup += addOrb(reserved, PEACEMAKERS_RESERVED[0], PEACEMAKERS_RESERVED[1], PEACEMAKERS_RESERVED[2], { large: true });
    peacemakersReservedKey = slots[slots.length - 1].key;
    used.push(reserved.id);
  }
  // Largest regular bubble first, and each one prefers a message that needs
  // the room it has, so a message that only the widest bubble can hold whole
  // is not crowded out by one that would fit any of them.
  for (let i = 0; i < PEACEMAKERS_REGULAR.length; i++) {
    const [x, y, diameter] = PEACEMAKERS_REGULAR[i];
    const smaller = PEACEMAKERS_REGULAR[i + 1]?.[2] || 0;
    const record = (smaller ? peacemakersPick(used, (candidate) => peacemakersFitsWhole(candidate, diameter) && !peacemakersFitsWhole(candidate, smaller)) : null)
      || peacemakersPick(used, (candidate) => peacemakersFitsWhole(candidate, diameter));
    if (!record) continue;
    markup += addOrb(record, x, y, diameter);
    used.push(record.id);
  }
  return markup;
}

function peacemakers() {
  return `<div style="position:absolute;left:12px;top:33px;width:829px"><div class="eyebrow">Mother’s Love in our community</div><h1 style="font-size:71px;letter-spacing:-2.2px;line-height:1.02;margin:22px 0">We Are<br>${shimmer('Peace')}<span class="violet">makers</span></h1><p class="subheading" style="font-size:26px">Recognize the kindness<br>you see around you.</p></div>${art('globe', 'left:271px;top:134px;width:604px;height:482px')}${peacemakersBubbles()}`;
}

// core/motion.js mountFloaters() freezes any bubble whose record fails the
// core's smallFits() heuristic. On this screen the reserved bubble is the one
// that holds still; every other bubble drifts exactly as the live TV shows,
// whatever the length of the message it fits whole.
function peacemakersMount() {
  V.actors.forEach((actor) => { actor.large = actor.key === peacemakersReservedKey });
}

// Runs after core/stage.js checkFullFits() has measured every bubble, so these
// are the numbers the TV is actually drawing.
function peacemakersPrime() {
  const reserved = slots.find((slot) => slot.key === peacemakersReservedKey);
  if (!reserved) return;
  const record = S.pool.find((item) => item.id === reserved.id);
  if (!record) return;
  const pages = reserved.reading?.pages?.length || 1;
  const read = (reserved.reading?.pages || [record.message]).reduce((total, page) => total + Math.max(9, page.length / 14), 0);
  const size = reserved.el?.querySelector('.message')?.style.fontSize || '';
  log('peacemakers_reserved', {
    id: record.id,
    graphemes: peacemakersGraphemes(record.message),
    diameter: reserved.d,
    fontSize: parseFloat(size) || 0,
    pages,
    readSeconds: +read.toFixed(2),
    dwell: S.dwell?.[S.s] ?? DWELL[S.s] ?? 0,
    veryLong: peacemakersVeryLong(record)
  });
}

registerScene(8, {
  markup: peacemakers,
  floaters: true,
  fxCanvas: true,
  mount: peacemakersMount,
  prime: peacemakersPrime,
  integrate: peacemakersIntegrate,
  // Matches production's tickSlots() scene-id branch (S.s===9?'hearts':
  // 'drift', so 'drift' for scene 8): steady bubbles drift off screen and
  // are replaced, same as scenes 4 and 8 in production.
  replaceMode: 'drift',
  // Matches production's forbidden() box for scene 8: keep floating bubbles
  // clear of the title copy over the top-left of the stage.
  keepOut: () => [{ x: 0, y: 8, w: 700, h: 296 }]
});
