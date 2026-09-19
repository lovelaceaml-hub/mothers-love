// Scene 1: Welcome / Living campaign.
'use strict';

(() => {
  const WELCOME_FAR_SCALE = 0.84;
  const WELCOME_FAR_BLUR = 0.9;
  const WELCOME_FAR_PACE = 0.7;
  const WELCOME_MID_SCALE = 0.93;
  const WELCOME_MID_BLUR = 0.35;
  const WELCOME_MID_PACE = 0.9;
  const WELCOME_NEAR_PACE = 1.15;

  const WELCOME_LAYERS = {
    far: { scale: WELCOME_FAR_SCALE, blur: WELCOME_FAR_BLUR, pace: WELCOME_FAR_PACE, z: 40 },
    mid: { scale: WELCOME_MID_SCALE, blur: WELCOME_MID_BLUR, pace: WELCOME_MID_PACE, z: 60 },
    near: { scale: 1, blur: 0, pace: WELCOME_NEAR_PACE, z: 80 }
  };

  // Plan 17 round 5, "one reserved long bubble" (Anthony, September 19, after
  // watching round 4 on the church TV; sizes corrected in the round 5 review).
  //
  // One reserved LARGE bubble. Welcome draws four bubbles at four fixed homes:
  // the reserved bubble, up to 480 drawn px, and three regular bubbles of up
  // to 308, 316 and 320 drawn px. The reserved bubble is sized so that a 500
  // grapheme message shows whole with its words at the 18 px floor (measured:
  // about 470 px with the compact name and chips). It is the only place a
  // message too long for a regular bubble ever appears, and the only bubble
  // that ever turns pages, which is now rare. Every other bubble only ever
  // holds a message that fits it whole, so a long message can never take,
  // shrink, move or page another bubble: every home and every maximum is a
  // constant, and nothing in the layout depends on which messages are drawn.
  //
  // Sizes come from the message's grapheme count (Intl.Segmenter), not its
  // UTF-16 length. A regular bubble grows through WELCOME_REGULAR_STEPS (276
  // and 296 px, words from 24 down) and then to its home's maximum, where it
  // holds still with words down to the floor. The reserved bubble grows
  // through WELCOME_RESERVED_STEPS (420, 448, 480 px) while its words step
  // from 28 px toward the floor. Each step is then checked against the text
  // as the browser actually lays it out, so a message with long words, many
  // expression chips or a long name steps its words down further, grows to
  // the next size, or, in a regular bubble, is simply not put there. Nothing
  // is ever truncated, clipped or ellipsized.
  //
  // Floors. Drawn words never go below 18 px at 1920 wide (36 px at 3840).
  // Core breathes a drifting bubble between 0.9 and 0.996 of its size, so a
  // drifting bubble is laid out with 20 drawn px words that dip to 18 at the
  // bottom of the breath; a bubble that holds still is laid out at 18 or
  // more. A bubble in the far or mid depth layer is laid out at drawn / layer
  // scale px and drawn back down by the layer's scale.
  //
  // Homes. The reserved bubble sits at the left of the area right of the
  // community art (its rim 4 px clear of the art, which ends at x 890). Two
  // regular bubbles stack to its right and one floats in the open band above
  // the art, right of the title words (which end near x 490; this bubble's
  // rim never comes left of x 642). Each home owns a free disc (`cell`) that
  // touches no other disc, the art, the speech bubbles or the stage edge, and
  // a drifting bubble is kept on a leash inside its own disc, so no bubble
  // ever covers another bubble's words.
  //
  // Paging is the last resort. Only the reserved bubble pages, only for a
  // message too long to fit it whole at 480 px, always at the floor so the
  // pages are as few as possible, and only when every page is read (core
  // shows a page for max(9, characters / 14) seconds) inside the time left in
  // the scene. The dwell is read from S.dwell[1] every time it is needed.
  const WELCOME_FONT_FLOOR = 18;
  const WELCOME_DEPTH_MIN = 0.9;
  const WELCOME_RIM_MARGIN = 0.03;
  const WELCOME_RIM_MARGIN_MIN = 12;
  const WELCOME_CONTENT_WIDTHS = [80, 74, 68];
  const WELCOME_RESERVED_DRAWN = 480;
  // A drifting bubble needs at least this much leash, or it holds still.
  const WELCOME_MIN_LEASH = 5;

  // Fixed homes, maximum drawn diameters and free discs, in stage px. Array
  // order is DOM order. `flight` is the way a bubble flies in from and out
  // to, always away from the reserved bubble, the title and the art: the top
  // bubbles rise, the bottom right one leaves to the right, and the reserved
  // bubble turns and fades almost in place, so a 480 px bubble never sweeps
  // across its neighbours' words.
  const WELCOME_SLOTS = [
    { name: 'T1', layer: 'mid', drawn: 308, cell: 312, cx: 796, cy: 164, reserved: false, from: 'top', flight: [-1, -1] },
    { name: 'R', layer: 'near', drawn: WELCOME_RESERVED_DRAWN, cell: WELCOME_RESERVED_DRAWN, cx: 1134, cy: 384, reserved: true, from: 'place', flight: [0, -0.04] },
    { name: 'R1', layer: 'far', drawn: 316, cell: 320, cx: 1478, cy: 168, reserved: false, from: 'top', flight: [1, -1] },
    { name: 'R2', layer: 'near', drawn: 320, cell: 324, cx: 1618, cy: 464, reserved: false, from: 'right', flight: [1, 0] }
  ];
  const WELCOME_RESERVED_SLOT = WELCOME_SLOTS.find((s) => s.reserved);
  // The regular bubbles are filled smallest room first, so the fussiest
  // bubble gets first pick of the pool and the roomiest takes what is left.
  const WELCOME_FILL_ORDER = ['T1', 'R1', 'R2'].map((name) => WELCOME_SLOTS.find((s) => s.name === name));

  // Size steps, in drawn px on the 1920 wide TV. A message of at most
  // `graphemes` grapheme clusters starts in a bubble of `diameter` with its
  // words at `font`; the rendered text then has the last word. Measured with
  // a two chip, sixteen character name record: 40 graphemes need 253 px at 20
  // px words, 80 need 282, 100 need 297; at 18 px, 140 need 302, 160 need 305,
  // 250 need 355, 400 need 425 and 500 need 470 (compact name and chips).
  const WELCOME_REGULAR_STEPS = [
    { graphemes: 50, diameter: 276, font: 24 },
    { graphemes: 100, diameter: 296, font: 22 }
  ];
  const WELCOME_RESERVED_STEPS = [
    { graphemes: 140, diameter: 420, font: 28 },
    { graphemes: 280, diameter: 448, font: 24 },
    { graphemes: Infinity, diameter: WELCOME_RESERVED_DRAWN, font: 22 }
  ];

  // How far down the rotation Welcome measures records when it lays out.
  const WELCOME_SCAN_LIMIT = 40;
  const WELCOME_SLOT_LIMITS = new Map();
  let WELCOME_MEASURE_CACHE = new Map();
  let WELCOME_FIT_CACHE = new Map();

  const WELCOME_SEGMENTER =
    typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('en', { granularity: 'grapheme' }) : null;

  // Grapheme clusters, what a person would call characters: an emoji with a
  // skin tone modifier is one, though it is four UTF-16 units.
  const WELCOME_GRAPHEME_CACHE = new Map();
  function welcomeGraphemes(text) {
    const value = String(text ?? '');
    if (WELCOME_GRAPHEME_CACHE.has(value)) return WELCOME_GRAPHEME_CACHE.get(value);
    let count = 0;
    if (!WELCOME_SEGMENTER) count = Array.from(value).length;
    else for (const piece of WELCOME_SEGMENTER.segment(value)) count += piece ? 1 : 1;
    if (WELCOME_GRAPHEME_CACHE.size > 2000) WELCOME_GRAPHEME_CACHE.clear();
    WELCOME_GRAPHEME_CACHE.set(value, count);
    return count;
  }

  function welcomeWithHost(fn) {
    const stage = typeof document !== 'undefined' ? document.getElementById('stage') : null;
    if (!stage) return fn(null);
    const host = document.createElement('div');
    host.className = 'scene';
    host.dataset.scene = '1';
    host.dataset.welcomeMeasure = 'true';
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'visibility:hidden;pointer-events:none;z-index:-1';
    stage.append(host);
    try {
      return fn(host);
    } finally {
      host.remove();
    }
  }

  function welcomeRecordKey(r) {
    return `${r.id}|${r.name}|${r.message}|${r.ids.join(',')}|${r.likes ?? ''}`;
  }

  function welcomeLayerScale(layer) {
    return (WELCOME_LAYERS[layer] || WELCOME_LAYERS.near).scale;
  }

  // A bubble that drifts breathes down to 0.9 of its size, so its words are
  // laid out at 20 drawn px to stay at or above the 18 px floor at every
  // moment; a bubble that holds still uses the floor itself.
  const WELCOME_DRIFT_FLOOR = Math.ceil((WELCOME_FONT_FLOOR / WELCOME_DEPTH_MIN) * 10) / 10;
  // How far a bubble of this drawn size may wander from its home and still
  // stay inside the home's free disc.
  function welcomeLeash(slot, drawn) {
    return (slot.cell - drawn) / 2 - 1;
  }
  // Layout px for a drawn size in a depth layer: the element is that many px
  // wide and core draws it back down by the layer's scale.
  function welcomeLayoutPx(drawn, layer) {
    return Math.floor(drawn / welcomeLayerScale(layer));
  }
  function welcomeLayoutFont(drawnFont, layer) {
    return Math.ceil((drawnFont / welcomeLayerScale(layer)) * 10) / 10;
  }

  function welcomeTextRects(el) {
    const rects = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.nodeValue.trim() || !node.parentElement || node.parentElement.closest('[hidden]')) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const q of range.getClientRects()) if (q.width > 0 && q.height > 0) rects.push(q);
    }
    el.querySelectorAll('.chip').forEach((chip) => rects.push(chip.getBoundingClientRect()));
    return rects;
  }

  // The same inline styling core fitCircle applies for diameter d, plus the
  // content column width and message size this fit chose.
  function welcomeStyleOrb(el, r, d, width, font, compact) {
    const content = el.querySelector('.orb-content'), msg = el.querySelector('.message');
    const title = el.querySelector('.recipient'), chipBox = el.querySelector('.chips');
    if (!content || !msg) return false;
    if (title && r.name.length > 16) title.style.fontSize = (d >= 450 ? 30 : 23) + 'px';
    if (chipBox && r.ids.length > 3) {
      chipBox.style.gap = '3px';
      chipBox.querySelectorAll('.chip').forEach((x) => {
        x.style.fontSize = (d >= 450 ? 13 : 10) + 'px';
        x.style.padding = '2px 4px';
      });
    }
    if (d < 335 || compact) {
      // The compact name and chips core uses for small bubbles, also used for
      // any bubble whose message needs the room.
      el.querySelector('.orb')?.classList.remove('orb-large');
      if (title) {
        title.style.fontSize = (r.name.length > 16 ? 23 : 26) + 'px';
        title.style.marginBottom = '7px';
      }
      if (chipBox) {
        chipBox.querySelectorAll('.chip').forEach((x) => {
          x.style.fontSize = '10.5px';
          x.style.padding = '2px 3px';
          const img = x.querySelector('img');
          if (img) {
            img.style.width = '16px';
            img.style.height = '16px';
          }
        });
        chipBox.style.marginTop = '6px';
      }
      el.querySelector('.like-count')?.style.setProperty('margin-top', '6px');
    }
    msg.style.fontSize = font + 'px';
    msg.style.lineHeight = '1.27';
    content.style.width = width + '%';
    content.style.maxWidth = content.style.width;
    return true;
  }

  // Every text line, chip and the page indicator sits inside the circle
  // max(3 percent of the diameter, 12 px) in from the rim, which also keeps
  // it inside the inner decorative ring (8 px in).
  function welcomeInside(el, d) {
    const content = el.querySelector('.orb-content');
    if (!content || content.scrollWidth > content.clientWidth + 1) return false;
    const box = el.getBoundingClientRect();
    if (!box.width) return false;
    const s = box.width / d, cx = box.left + box.width / 2, cy = box.top + box.height / 2;
    const limit = (d / 2 - Math.max(WELCOME_RIM_MARGIN * d, WELCOME_RIM_MARGIN_MIN)) * s;
    for (const q of welcomeTextRects(el)) {
      const dx = Math.max(Math.abs(q.left - cx), Math.abs(q.right - cx));
      const dy = Math.max(Math.abs(q.top - cy), Math.abs(q.bottom - cy));
      if (Math.hypot(dx, dy) > limit) return false;
    }
    return true;
  }

  function welcomeProbe(host, r, d) {
    host.innerHTML = `<div class="orb-slot" style="left:0;top:0;width:${d}px;height:${d}px;--tint:${catalog[r.ids[0] - 1].color}"><div class="orb-life">${completeOrb(r, d)}</div></div>`;
    return host.firstElementChild;
  }

  // The content column width at which the whole message fits inside a bubble
  // of layout diameter d with its words at `font` layout px, or null when it
  // does not fit at any of them.
  function welcomeMeasure(host, r, d, font, compact) {
    const key = `${welcomeRecordKey(r)}|${d}|${font}|${compact ? 'c' : 's'}`;
    if (WELCOME_MEASURE_CACHE.has(key)) return WELCOME_MEASURE_CACHE.get(key);
    let out = null;
    if (host) {
      const el = welcomeProbe(host, r, d);
      const msg = el.querySelector('.message');
      for (const width of WELCOME_CONTENT_WIDTHS) {
        if (!welcomeStyleOrb(el, r, d, width, font, compact)) break;
        msg.textContent = r.message;
        if (welcomeInside(el, d)) {
          out = width;
          break;
        }
      }
    }
    if (WELCOME_MEASURE_CACHE.size > 4000) WELCOME_MEASURE_CACHE = new Map();
    WELCOME_MEASURE_CACHE.set(key, out);
    return out;
  }

  // The largest size on the half pixel ladder between `floor` and `start`
  // whose whole message fits a bubble of layout diameter d, or null when even
  // the floor does not hold it. Smaller words fit more, so this walks the
  // ladder by halving; the size it returns was measured, never inferred.
  function welcomeFontThatFits(host, r, d, start, floor, compact) {
    const steps = Math.max(0, Math.round((start - floor) * 2));
    const at = (i) => Math.round((floor + i * 0.5) * 10) / 10;
    const floorWidth = welcomeMeasure(host, r, d, at(0), compact);
    if (floorWidth === null) return null;
    let lo = 0, hi = steps;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (welcomeMeasure(host, r, d, at(mid), compact) !== null) lo = mid;
      else hi = mid - 1;
    }
    return { font: at(lo), width: welcomeMeasure(host, r, d, at(lo), compact) };
  }

  // How record r shows whole in this slot: the layout diameter, the layout
  // message size, the content width, whether the compact name and chips are
  // used and whether the bubble holds still, or null when its whole message
  // cannot be drawn there at the floor. Never pages.
  function welcomeFit(host, r, slot) {
    const key = `${welcomeRecordKey(r)}|${slot.name}`;
    if (WELCOME_FIT_CACHE.has(key)) return WELCOME_FIT_CACHE.get(key);
    const fit = welcomeFitRaw(host, r, slot);
    if (host) WELCOME_FIT_CACHE.set(key, fit);
    return fit;
  }

  function welcomeTry(host, r, slot, drawn, startFont, still, compact) {
    const d = welcomeLayoutPx(drawn, slot.layer);
    const floor = welcomeLayoutFont(still ? WELCOME_FONT_FLOOR : WELCOME_DRIFT_FLOOR, slot.layer);
    const start = Math.max(floor, welcomeLayoutFont(startFont, slot.layer));
    const hit = welcomeFontThatFits(host, r, d, start, floor, compact);
    return hit ? { d, drawn, font: hit.font, width: hit.width, compact, still, graphemes: welcomeGraphemes(r.message), pages: [r.message] } : null;
  }

  function welcomeFitRaw(host, r, slot) {
    if (!host) return null;
    const graphemes = welcomeGraphemes(r.message);
    if (slot.reserved) {
      // The reserved bubble holds still. It grows 420, 448, 480 with the
      // message; the compact name and chips are used when the usual ones do
      // not leave the words enough room, and always at 480.
      for (const row of WELCOME_RESERVED_STEPS) {
        if (row.graphemes < graphemes) continue;
        for (const compact of row.diameter >= 450 ? [true] : [false, true]) {
          const fit = welcomeTry(host, r, slot, row.diameter, row.font, true, compact);
          if (fit) return fit;
        }
      }
      return null;
    }
    // A regular bubble drifts on its leash while its message fits one of the
    // steps with 20 px words; past that it takes its home's full size and
    // holds still, words down to the floor.
    for (const row of WELCOME_REGULAR_STEPS) {
      if (row.graphemes < graphemes || welcomeLeash(slot, row.diameter) < WELCOME_MIN_LEASH) continue;
      const fit = welcomeTry(host, r, slot, row.diameter, row.font, false, true);
      if (fit) return fit;
    }
    return welcomeTry(host, r, slot, slot.drawn, 20, true, true);
  }

  // Whether a record is long: its whole message fits no regular bubble at the
  // floor. Only a long message ever goes in the reserved bubble's pages. The
  // roomiest regular bubble is tried first, so most records answer in one
  // measurement.
  const WELCOME_ROOMIEST_FIRST = [...WELCOME_FILL_ORDER].reverse();
  function welcomeIsLong(host, r) {
    return !WELCOME_ROOMIEST_FIRST.some((slot) => welcomeFit(host, r, slot));
  }

  function welcomePaginate(el, d, msg, message) {
    const words = message.match(/\S+\s*|\s+/g) || [message];
    const pages = [];
    let buffer = '';
    for (const word of words) {
      msg.textContent = buffer + word;
      if (buffer && !welcomeInside(el, d)) {
        pages.push(buffer);
        buffer = word;
      } else buffer += word;
    }
    if (buffer) pages.push(buffer);
    return pages;
  }

  // The fewest floor size pages of r inside the reserved bubble. Only ever
  // called for a message that does not fit it whole.
  function welcomePagedFit(host, r) {
    if (!host) return null;
    const slot = WELCOME_RESERVED_SLOT;
    const d = welcomeLayoutPx(slot.drawn, slot.layer);
    const font = welcomeLayoutFont(WELCOME_FONT_FLOOR, slot.layer);
    const el = welcomeProbe(host, r, d);
    const msg = el.querySelector('.message'), page = el.querySelector('.orb-page-indicator');
    if (!msg || !page) return null;
    page.hidden = false;
    let best = null;
    for (const width of WELCOME_CONTENT_WIDTHS) {
      if (!welcomeStyleOrb(el, r, d, width, font, true)) break;
      page.textContent = '00 / 00 · CONTINUED';
      const pages = welcomePaginate(el, d, msg, r.message);
      if (!best || pages.length < best.pages.length) best = { d, drawn: slot.drawn, font, width, compact: true, still: true, graphemes: welcomeGraphemes(r.message), pages };
    }
    return best;
  }

  function welcomePageSeconds(pages) {
    return pages.reduce((n, p) => n + Math.max(9, p.length / 14), 0);
  }

  // Anthony, September 19: every screen shows for 60 seconds. The live value
  // always comes from the snapshot's playlist; 60 is only the last fallback.
  function welcomeDwell() {
    return S.dwell?.[1] ?? DWELL?.[1] ?? 60;
  }

  // Time left in the scene for a bubble that starts now: the dwell minus the
  // scene's age, less the 3.8 s entry flight.
  const WELCOME_ENTRY_SECONDS = 3.8;
  function welcomeTimeLeft(wait = 0) {
    return welcomeDwell() - (S.sceneAge || 0) - WELCOME_ENTRY_SECONDS - wait;
  }

  // Pages only when every page gets its full reading time inside the time
  // left in the scene.
  function welcomePagesFitTime(pages, wait = 0) {
    return pages.length < 2 || welcomePageSeconds(pages) <= welcomeTimeLeft(wait);
  }

  // How the reserved bubble would show r: whole if it can, otherwise the
  // fewest pages, and only when those pages are all read before the scene
  // changes. Null means this record has to wait for another pass.
  function welcomeReservedFit(host, r, wait = 0) {
    const whole = welcomeFit(host, r, WELCOME_RESERVED_SLOT);
    if (whole) return whole;
    const paged = welcomePagedFit(host, r);
    if (!paged) return null;
    return welcomePagesFitTime(paged.pages, wait) ? paged : null;
  }

  // Core's rotation order over the whole pool, with a forced record first.
  function welcomeRotation(pool, forcedId) {
    const order = [];
    const seen = new Set();
    while (order.length < pool.length) {
      const r = chooseRandom(order.map((x) => x.id)) || pool.find((x) => !seen.has(x.id));
      if (!r || seen.has(r.id)) break;
      seen.add(r.id);
      order.push(r);
    }
    const i = forcedId ? order.findIndex((r) => r.id === forcedId) : -1;
    if (i > 0) order.unshift(...order.splice(i, 1));
    return order;
  }

  // Chooses what each of the six fixed bubbles holds.
  // The reserved bubble takes the first long message in rotation order that
  // can be read here (whole, or in pages that finish before the scene
  // changes); with no long message in the pool it takes the first message
  // instead, drawn at the reserved bubble's larger size, so it is never
  // empty. Each regular bubble then takes the next message in rotation order
  // that fits it whole; a message that fits none of them is simply left for
  // the reserved bubble on a later pass. No bubble is ever shrunk, deferred
  // or paged to make room for another.
  function welcomeChooseSet(host) {
    const pool = records();
    const forced = S.forceId;
    S.forceId = null;
    if (!pool.length) return [];
    const order = welcomeRotation(pool, forced);
    if (!host) return order.slice(0, WELCOME_SLOTS.length).map((r, i) => ({ slot: WELCOME_SLOTS[i], r, fit: null }));
    const used = new Set();
    const placements = [];
    let reserved = null;
    // Measuring every record of a large pool would cost more than a frame, so
    // the search for a long message looks at the front of the rotation only;
    // the rest come round on a later pass.
    for (const r of order.slice(0, WELCOME_SCAN_LIMIT)) {
      if (!welcomeIsLong(host, r)) continue;
      const fit = welcomeReservedFit(host, r);
      if (!fit) {
        const paged = welcomePagedFit(host, r);
        log('welcome_long_waits', { id: r.id, pages: paged ? paged.pages.length : 0, timeLeft: +welcomeTimeLeft().toFixed(1) });
        continue;
      }
      reserved = { slot: WELCOME_RESERVED_SLOT, r, fit };
      break;
    }
    if (!reserved) {
      for (const r of order.slice(0, WELCOME_SCAN_LIMIT)) {
        const fit = welcomeFit(host, r, WELCOME_RESERVED_SLOT);
        if (!fit) continue;
        reserved = { slot: WELCOME_RESERVED_SLOT, r, fit };
        break;
      }
    }
    if (reserved) {
      placements.push(reserved);
      used.add(reserved.r.id);
    }
    for (const slot of WELCOME_FILL_ORDER) {
      let picked = null;
      for (const r of order.slice(0, WELCOME_SCAN_LIMIT)) {
        if (used.has(r.id)) continue;
        const fit = welcomeFit(host, r, slot);
        if (!fit) continue;
        picked = { slot, r, fit };
        break;
      }
      if (picked) {
        placements.push(picked);
        used.add(picked.r.id);
      }
    }
    // A pool smaller than the layout fills the bubbles that are still empty
    // with repeats, as the Plan 15 layout did, rather than leave a gap.
    if (placements.length < WELCOME_SLOTS.length && pool.length < WELCOME_SLOTS.length) {
      const shown = placements.map((p) => p.r.id);
      let next = 0;
      for (const slot of WELCOME_FILL_ORDER) {
        if (placements.some((p) => p.slot === slot)) continue;
        for (let tries = 0; tries < order.length; tries++) {
          const r = order[(next + tries) % order.length];
          const fit = welcomeFit(host, r, slot);
          if (!fit) continue;
          placements.push({ slot, r, fit });
          shown.push(r.id);
          next = (next + tries + 1) % order.length;
          break;
        }
      }
    }
    placements.sort((a, b) => WELCOME_SLOTS.indexOf(a.slot) - WELCOME_SLOTS.indexOf(b.slot));
    return placements;
  }

  function welcomeApplyFit(a, r, fit, slot) {
    const el = a.el;
    const d = fit.d;
    el.style.width = d + 'px';
    el.style.height = d + 'px';
    el.dataset.growMax = String(d);
    a.d = d;
    const b = slots.find((s) => s.key === a.key);
    if (b) b.d = d;
    el.innerHTML = `<div class="orb-life">${completeOrb(r, d)}</div>`;
    bindNumbers(el);
    welcomeStyleOrb(el, r, d, fit.width, fit.font, fit.compact);
    const msg = el.querySelector('.message'), page = el.querySelector('.orb-page-indicator');
    msg.textContent = fit.pages[0];
    page.hidden = fit.pages.length < 2;
    if (!page.hidden) page.textContent = `01 / ${String(fit.pages.length).padStart(2, '0')} · CONTINUED`;
    el.dataset.long = String(!smallFits(r));
    const reading = { pages: fit.pages, index: 0, at: V.clock, duration: Math.max(9, fit.pages[0].length / 14) };
    a.reading = reading;
    if (b) b.reading = reading;
    a._welcomeFitId = r.id;
    a._welcomeFitBorn = a.born;
    // Holds still at its home's full size, drifts on a leash below it.
    a.large = !!fit.still;
    if (b) b.large = a.large;
    a._welcomeLeash = fit.still || !slot ? 0 : Math.max(0, welcomeLeash(slot, fit.drawn));
    if (slot) {
      el.dataset.welcomeSlot = slot.name;
      el.dataset.welcomeReserved = String(!!slot.reserved);
    }
    log('welcome_bubble_fit', {
      id: r.id,
      slot: slot ? slot.name : '',
      reserved: !!(slot && slot.reserved),
      diameter: d,
      drawn: fit.drawn,
      graphemes: fit.graphemes,
      font: fit.font,
      still: !!fit.still,
      drawnFont: Math.round(fit.font * welcomeLayerScale(slot ? slot.layer : 'near') * 100) / 100,
      pages: fit.pages.length,
      verbatim: fit.pages.join('') === r.message
    });
    // Core's own fit pass may already have logged this record's pagination
    // at this moment; log it only once.
    if (fit.pages.length > 1 && !qaLog.some((e) => e.type === 'circular_pagination' && e.id === r.id && e.at === +S.t.toFixed(3))) {
      log('circular_pagination', { id: r.id, pages: fit.pages.length, diameter: d, verbatim: fit.pages.join('') === r.message });
    }
  }

  // Sizes and lays out one live bubble for the record now inside it (a drift
  // replacement, or the real fonts having finished loading).
  function welcomeFitActor(a, host) {
    const r = S.pool.find((x) => x.id === a.id);
    const slot = WELCOME_SLOT_LIMITS.get(a.key);
    if (!r || !a.el || !slot || !host) return;
    const fit = slot.reserved ? welcomeReservedFit(host, r) || welcomeFit(host, r, slot) || welcomePagedFit(host, r) : welcomeFit(host, r, slot);
    if (fit) welcomeApplyFit(a, r, fit, slot);
  }

  function welcomeFitAll() {
    if (!V.actors || !V.actors.length) return;
    welcomeWithHost((host) => V.actors.forEach((a) => welcomeFitActor(a, host)));
  }

  function welcomeBubbles() {
    WELCOME_SLOT_LIMITS.clear();
    WELCOME_MEASURE_CACHE = new Map();
    WELCOME_FIT_CACHE = new Map();
    return welcomeWithHost((host) => {
      const placements = welcomeChooseSet(host);
      if (!placements.length) return '';
      let html = '';
      for (const p of placements) {
        const d = p.fit ? p.fit.d : welcomeLayoutPx(p.slot.drawn, p.slot.layer);
        const x = Math.round(p.slot.cx - d / 2), y = Math.round(p.slot.cy - d / 2);
        html += addOrb(p.r, x, y, d, { growMax: d, large: p.fit ? !!p.fit.still : true });
        WELCOME_SLOT_LIMITS.set('slot-' + S.slotCounter, p.slot);
      }
      log('welcome_layout', {
        count: placements.length,
        reserved: placements.find((p) => p.slot.reserved)?.r.id ?? '',
        pages: placements.find((p) => p.slot.reserved)?.fit?.pages.length ?? 0,
        others: placements.filter((p) => !p.slot.reserved).map((p) => p.r.id)
      });
      return html;
    });
  }

  // Drift replacement: core's replaceActor has just chosen the next record
  // for a retiring bubble. A regular bubble keeps that choice only when the
  // record fits it whole, otherwise it takes the next record in core's
  // rotation that does; the reserved bubble prefers a long record it can read
  // in the time left, and falls back to any record that fits it. When nothing
  // else fits, the bubble shows its own record again rather than page a
  // message that belongs whole in a bubble.
  function welcomeVetReplacement(a) {
    const slot = WELCOME_SLOT_LIMITS.get(a.key);
    if (!slot || !a.nextId) return;
    const onScreen = new Set([...V.actors.map((x) => x.id), ...V.actors.filter((x) => x !== a).map((x) => x.nextId).filter(Boolean)]);
    const first = S.pool.find((r) => r.id === a.nextId);
    const rest = records().filter((r) => !onScreen.has(r.id) && r.id !== a.nextId);
    rest.sort((x, y) => (S.lastShown.get(x.id) ?? -10000) - (S.lastShown.get(y.id) ?? -10000) || y.createdAt - x.createdAt || x.id.localeCompare(y.id));
    const candidates = (first && eligible(first) ? [first, ...rest] : rest).filter((r) => r.id !== a.id).slice(0, 60);
    welcomeWithHost((host) => {
      if (!host) return;
      const take = (r, why) => {
        if (r.id !== a.nextId) log('welcome_replacement_vetted', { slot: slot.name, was: a.nextId, now: r.id, why });
        a.nextId = r.id;
      };
      if (slot.reserved) {
        for (const r of candidates) {
          if (!welcomeIsLong(host, r)) continue;
          if (!welcomeReservedFit(host, r, WELCOME_ENTRY_SECONDS)) continue;
          take(r, 'long');
          return;
        }
      }
      for (const r of candidates) {
        if (!slot.reserved && welcomeIsLong(host, r)) continue;
        if (!welcomeFit(host, r, slot)) continue;
        take(r, 'whole');
        return;
      }
      log('welcome_replacement_kept', { slot: slot.name, was: a.nextId, id: a.id, tried: candidates.length });
      a.nextId = a.id;
    });
  }

  // A slow font load on the real TV must not leave bubbles sized against
  // fallback-font metrics: once the real fonts are ready, run core's fit pass
  // again and then measure every bubble again. Registers only while fonts
  // are genuinely still loading, and is guarded by scene id and a per-mount
  // token so a callback from a scene the viewer has since left never touches
  // a torn-down or reused DOM.
  function refitWelcomeWhenFontsReady() {
    if (typeof document === 'undefined' || !document.fonts || typeof document.fonts.ready?.then !== 'function') return;
    if (document.fonts.status === 'loaded') return;
    const token = (V.welcomeFontToken = (V.welcomeFontToken || 0) + 1);
    document.fonts.ready.then(() => {
      if (S.s !== 1 || V.welcomeFontToken !== token) return;
      WELCOME_MEASURE_CACHE = new Map();
      WELCOME_FIT_CACHE = new Map();
      checkFullFits();
      welcomeFitAll();
    });
  }

  function welcome() {
    return `<div style="position:absolute;left:15px;top:43px;width:831px"><div class="eyebrow">A living campaign of appreciation</div><h1 style="font-size:74px;letter-spacing:-2.2px;line-height:1.08;margin:20px 0 22px">The Words of<br>${shimmer('Mother’s Love')}</h1><p class="serif" style="font-size:29px;line-height:1.4;color:#89836b">Where a mother's love resides,<br>peace abides.</p></div>${art('community','left:-20px;top:325px;width:910px;height:298px')}${welcomeBubbles()}`;
  }

  function mountWelcome(root) {
    V.welcomeLastExit = -9999;
    refitWelcomeWhenFontsReady();
    V.actors.forEach((a, i) => {
      a._welcomeSeenLife = a.life;
      a.trail = [];
      a.enterLifeAt = -1;
      a.exitLifeAt = -1;

      const isOdd = i % 2 === 1;
      if (a.el) {
        a.el.style.setProperty('--welcome-ring-delay', `${(-i * 1.5).toFixed(1)}s`);
        a.el.classList.toggle('spin-reverse', isOdd);
      }

      a.retireAt = 9 + i * 4.6;
      // Each bubble carries its slot's depth layer and home (Plan 17 round 5
      // layout); the Plan 15 index rule stays as the fallback when no layout
      // was measured.
      const slot = WELCOME_SLOT_LIMITS.get(a.key);
      const layer = slot ? slot.layer : i === 3 ? 'near' : ['far', 'mid', 'near'][i % 3];
      a.layer = layer;
      if (slot) {
        a.homeX = slot.cx;
        a.homeY = slot.cy;
      }
      const L = WELCOME_LAYERS[layer] || WELCOME_LAYERS.near;
      a.pace *= L.pace;
      if (a.el) a.el.dataset.depth = layer;
    });
  }

  function primeWelcome() {
    // Runs after core's mount-time checkFullFits, so this layout is final.
    welcomeFitAll();
    if (!V.speech || !V.speech.length) return;
    const delays = [0, 2.5, 5.0];
    V.speech.forEach((b, i) => {
      if (b.el) {
        b.el.dataset.speaker = String(i);
      }
      if (!S.still) {
        if (i === 0) {
          b.phase = 'showing';
          b.age = 0;
          b.duration = 6.0;
        } else {
          const delay = delays[i] || 2.5;
          b.phase = 'fading_out';
          b.fadeAge = 0.5 - delay;
          if (b.el) b.el.classList.add('fading');
        }
      } else {
        b.phase = 'showing';
        b.age = 0;
        if (b.el) b.el.classList.remove('fading');
      }
    });
  }

  function integrateWelcome(a, dt) {
    if (a.life === 'exiting' && a._welcomeSeenLife !== 'exiting') {
      V.welcomeLastExit = V.clock;
      // A bubble leaves away from the title and the art: the ones on the
      // right fly off to the right as before, the others rise.
      const slot = WELCOME_SLOT_LIMITS.get(a.key);
      if (slot) {
        a.exitDX = slot.flight[0] * 60 * a.rng();
        a.exitDY = slot.flight[1] * (a.d + 200);
        if (slot.from === 'right') a.exitDX = a.d + 350;
      }
    }
    a._welcomeSeenLife = a.life;
    // Core has just chosen this bubble's next record: vet it once per exit.
    if (a.life === 'exiting' && a.nextId && a._welcomeVettedAt !== a.lifeAt) {
      a._welcomeVettedAt = a.lifeAt;
      welcomeVetReplacement(a);
    }

    const isExitBlocked =
      V.actors.some((act) => act.life === 'exiting' || act.life === 'absent') ||
      (typeof V.welcomeLastExit === 'number' && V.clock - V.welcomeLastExit < 4.6);

    if (isExitBlocked) {
      for (const act of V.actors) {
        if (act.life === 'steady' && act.retireAt <= V.clock) {
          act.retireAt = V.clock + 0.5;
        }
      }
    }

    if (a.born > 0 && a.life === 'steady' && a.retireAt - a.born > 22) {
      a.retireAt = a.born + 14 + a.rng() * 6;
    }

    if (a.life === 'steady' && V.clock >= a.nextTurn) {
      const sign = a.rng() > 0.5 ? 1 : -1;
      const deg = sign * (25 + a.rng() * 45);
      const rad = (deg * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const vx = a.vx * cos - a.vy * sin;
      const vy = a.vx * sin + a.vy * cos;
      a.vx = vx;
      a.vy = vy;
      a.nextTurn = V.clock + 4 + a.rng() * 6;
    }
    return false;
  }

  function placeWelcome(a) {
    // Core installNext has just put a new record into this bubble (drift
    // replacement): size and lay it out for its own message before it shows,
    // and send it back to its slot's fixed home.
    // (Only on a new record: settling after the entry flight also resets
    // core's born time, and must not restart the pages.)
    if (a._welcomeFitId && a.el && (a.id !== a._welcomeFitId || (a.born !== a._welcomeFitBorn && a.life === 'entering'))) {
      const slot = WELCOME_SLOT_LIMITS.get(a.key);
      if (slot && a.life === 'entering') {
        a.homeX = slot.cx;
        a.homeY = slot.cy;
        a.x = slot.cx;
        a.y = slot.cy;
        // It flies in from above, or from the right for the bottom right
        // bubble, never across the title, the speech bubbles or the art.
        if (slot.from === 'right') {
          a.originX = 1812 + a.d;
          a.originY = slot.cy + a.rng() * 40;
        } else {
          a.originX = slot.cx + slot.flight[0] * 60 * a.rng();
          a.originY = slot.cy + slot.flight[1] * (slot.cy + a.d);
        }
      }
      welcomeWithHost((host) => welcomeFitActor(a, host));
    }
    const layer = a.layer || 'near';
    const L = WELCOME_LAYERS[layer] || WELCOME_LAYERS.near;
    // Drawn size comes from the depth layer and core's drift breathing only.
    // Core's entering grow (from 0.75) and exiting shrink (to 0.88) are not
    // applied to the size, so the words never dip below the drawn floor
    // while a bubble flies in or out; the fly, spin and fade remain.
    const scale = (a.large ? 1 : a.depth || 1) * L.scale;
    const x = a.screenX;
    const y = a.screenY;
    const op = a.opacity;

    let R = 0;
    if (!S.still) {
      if (a.life === 'entering') {
        if (a.enterLifeAt !== a.lifeAt) {
          a.enterLifeAt = a.lifeAt;
          const sign = a.rng() > 0.5 ? 1 : -1;
          a.enterAngle = sign * (200 + a.rng() * 120);
        }
        const p = Math.max(0, V.clock - a.lifeAt);
        const q = clamp(p / 3.8, 0, 1);
        const easeOut = outCubic(q);
        R = a.enterAngle * (1 - easeOut);
      } else if (a.life === 'exiting') {
        if (a.exitLifeAt !== a.lifeAt) {
          a.exitLifeAt = a.lifeAt;
          const sign = a.rng() > 0.5 ? 1 : -1;
          a.exitAngle = sign * 160;
        }
        const p = Math.max(0, V.clock - a.lifeAt);
        const q = clamp(p / 3.8, 0, 1);
        const easeIn = q * q * q;
        R = a.exitAngle * easeIn;
      }
    }

    if (a.el) {
      if (a.el.dataset.depth !== layer) a.el.dataset.depth = layer;
      a.el.style.left = '0px';
      a.el.style.top = '0px';
      const half = (a.d / 2) * scale;
      const minX = half + 8;
      const maxX = 1812 - half - 30;
      const minY = half + 8;
      const maxY = 636 - half - 8;
      let renderX = minX <= maxX ? clamp(x, minX, maxX) : (minX + maxX) / 2;
      let renderY = minY <= maxY ? clamp(y, minY, maxY) : (minY + maxY) / 2;
      // A steady bubble stays inside its home's free disc: a still bubble
      // sits on its home, a drifting one wanders on a leash. The discs touch
      // nothing, so no bubble ever covers another bubble's words, the art,
      // the speech bubbles or the title. The drift itself is pulled back too,
      // so the bubble turns round at the end of its leash rather than stick.
      const slot = WELCOME_SLOT_LIMITS.get(a.key);
      if (slot && a.life === 'steady') {
        const leash = S.still || a.large ? 0 : a._welcomeLeash || 0;
        const dx = a.x - slot.cx, dy = a.y - slot.cy;
        const dist = Math.hypot(dx, dy);
        if (dist > leash) {
          const nx = dist ? dx / dist : 0, ny = dist ? dy / dist : 0;
          a.x = slot.cx + nx * leash;
          a.y = slot.cy + ny * leash;
          const out = a.vx * nx + a.vy * ny;
          if (out > 0) {
            a.vx -= 1.6 * out * nx;
            a.vy -= 1.6 * out * ny;
          }
        }
        renderX = a.x;
        renderY = a.y;
      }
      a._welcomeRX = renderX;
      a._welcomeRY = renderY;
      a._welcomeRR = half;
      a.el.style.transform = `translate(${(renderX - a.d / 2).toFixed(2)}px,${(renderY - a.d / 2).toFixed(2)}px) scale(${scale.toFixed(4)})`;
      // The enter and exit spin turns the words (.orb-content) inside the
      // circle, which clips its overflow, so the slot's own box stays inside
      // the stage and a spinning bubble at the stage edge never widens the
      // scene's scroll box with the corners of a rotated square.
      const content = a.el.querySelector('.orb-content');
      if (content) content.style.rotate = R ? `${R.toFixed(2)}deg` : '';
      a.el.style.opacity = op.toFixed(3);
      a.el.style.zIndex = String(L.z + Math.round(scale * 100));
      const baseBlur = scale < 0.93 ? (0.93 - scale) * 3 : 0;
      const blur = Math.min(0.9, Math.max(baseBlur, L.blur));
      a.el.style.filter = blur > 0 ? `blur(${blur.toFixed(2)}px)` : 'none';
    }
    const b = slots.find((b) => b.key === a.key);
    if (b) {
      b.x = x - a.d / 2;
      b.y = y - a.d / 2;
      b.phase = a.life;
    }
    return true;
  }

  function drawWelcome(dt) {
    if (S.still || !V.canvas) return;
    const c = V.canvas.getContext('2d');
    if (!c) return;

    let sparksDrawn = 0;

    // (a) Soft ground shadow ellipse under every visible bubble
    for (const a of V.actors) {
      if (a.life === 'absent' || a.opacity <= 0.01) continue;
      const layer = a.layer || 'near';
      const baseAlpha = layer === 'near' ? 0.10 : layer === 'mid' ? 0.06 : 0.03;
      const alpha = baseAlpha * a.opacity;
      const scale = a.screenScale;
      const width = 0.8 * a.d * scale;
      const rx = width / 2;
      const ry = rx * 0.28;
      const cx = a.screenX;
      const cy = a.screenY + 0.55 * a.d * scale;

      c.save();
      c.beginPath();
      c.ellipse(cx, cy, rx, ry, 0, 0, TAU);
      c.fillStyle = `rgba(128, 116, 81, ${alpha.toFixed(4)})`;
      c.fill();
      c.restore();
    }

    // (b) Sparkle trail behind entering or exiting bubbles
    for (const a of V.actors) {
      if (!a.trail) a.trail = [];
      if (a.life === 'entering' || a.life === 'exiting') {
        a.trail.push({ x: a.screenX, y: a.screenY });
        if (a.trail.length > 14) a.trail.shift();

        const len = a.trail.length;
        for (let j = 0; j < len; j++) {
          if (sparksDrawn >= 120) break;
          const pt = a.trail[j];
          const progress = (j + 1) / len;
          const opacity = progress * 0.85 * a.opacity;
          const r = 1.2 + progress * 2.2;
          const color = j % 2 === 0 ? '#e8c777' : '#fff9';
          drawSpark(c, pt.x, pt.y, r, opacity, color);
          sparksDrawn++;
        }
      } else if (a.trail.length > 0) {
        a.trail.length = 0;
      }
    }

    // (c) Orbiting glint per steady bubble
    for (const a of V.actors) {
      if (a.life !== 'steady' || a.opacity <= 0.01) continue;
      if (sparksDrawn >= 120) break;
      const layer = a.layer || 'near';
      const L = WELCOME_LAYERS[layer] || WELCOME_LAYERS.near;
      const rimR = (a.d * a.screenScale) / 2;
      const angle = (V.clock * 1.6 * L.pace + (a.phase || 0)) % TAU;
      const gx = (a._welcomeRX ?? a.screenX) + Math.cos(angle) * rimR;
      const gy = (a._welcomeRY ?? a.screenY) + Math.sin(angle) * rimR;
      const sparkR = 2.4 * a.screenScale;
      const sparkOp = 0.85 * a.opacity;
      drawSpark(c, gx, gy, sparkR, sparkOp, '#fff9');
      sparksDrawn++;
    }
  }

  function leaveWelcome(root) {
    // Scene descriptor onLeave hook. No active timers in Welcome.
  }

  registerScene(1, {
    markup: welcome,
    mount: mountWelcome,
    prime: primeWelcome,
    integrate: integrateWelcome,
    place: placeWelcome,
    draw: drawWelcome,
    onLeave: leaveWelcome,
    speakers: [
      { x: 509, y: 361 },
      { x: 628, y: 422 },
      { x: 702, y: 408 }
    ],
    floaters: true,
    fxCanvas: true,
    // Round 5 review: two boxes, the title words and the speech bubbles with
    // the community art, so the bubble that floats in the open band above
    // the art is not steered out of its home. Each bubble's leash, not this
    // steering, is what keeps it clear of them.
    keepOut: () => [
      { x: 0, y: 10, w: 600, h: 330 },
      { x: 0, y: 345, w: 890, h: 291 }
    ],
    replaceMode: 'drift'
  });
})();
