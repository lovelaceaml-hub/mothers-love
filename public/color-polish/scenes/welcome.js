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

  // Plan 17 bubble fit ("pages, long only", Anthony, September 18).
  //
  // Every message shows whole on one page in a bubble grown to the diameter
  // it needs, with its words drawn at 18 px or larger on the 1920 wide TV
  // (36 px at 3840) at every moment, depth layer and drift breathing
  // included. Only a message too long for the largest bubble the layout can
  // give flips pages, in that largest bubble, with as few pages as possible.
  //
  // Layout. The six bubbles live in the free area right of the title block
  // and the three speech bubbles: a 913 by 620 px box (x 869 to 1782, y 8 to
  // 628 of the 1812 by 636 stage; 869 is the keep-out edge 855 plus the 14 px
  // steering margin core applies). Five bubbles take exactly the drawn
  // diameter their own message needs and are packed against the top and
  // right edges of that box: TR and BR in the right column, TM and BM beside
  // them, TL in the top row. The sixth, B, is the largest circle that still
  // fits the box without touching the other five: the bottom-left position.
  // The record with the greatest need goes to B, so B is as large as the box
  // allows for the five records beside it (about 380 px when they are short,
  // about 300 px when they are 100 to 120 characters). Six bubbles cannot
  // all be wide: three across the box is 913 px and two down it is 620 px.
  //
  // Records ("fewer, whole", Anthony, September 18). Every record on screen
  // either fits whole, or is long (needs more than WELCOME_NORMAL_CAP) and
  // pages in B, the largest bubble, at the font floor, only when every page
  // gets its full reading time (core shows a page for max(9, characters /
  // 14) seconds) inside the time left in the scene; otherwise Welcome leaves
  // it to the other scenes. When the records drawn cannot all fit whole, a
  // larger one is swapped for a smaller one from the pool; six bubbles show
  // whenever six records fit whole, otherwise as many as fit whole. A normal
  // record is never paged.
  //
  // Drift replacement keeps the same rule: a bubble that retires is refilled
  // with the next record in core's rotation that fits its position whole.
  //
  // Sizes are measured on a hidden copy of the bubble that is never rotated
  // or scaled, in layout pixels, with the font floor raised by the layer's
  // drawn scale (far 0.84, mid 0.93) and, for a drifting bubble, by core's
  // 0.9 depth breathing, so the drawn text never drops below the floor.
  const WELCOME_REGION = { left: 869, top: 8, right: 1782, bottom: 628 };
  const WELCOME_GAP = 10;
  const WELCOME_FONT_FLOOR = 18;
  const WELCOME_DEPTH_MIN = 0.9;
  const WELCOME_DEPTH_MAX = 0.996;
  const WELCOME_RIM_MARGIN = 0.03;
  const WELCOME_RIM_MARGIN_MIN = 12;
  const WELCOME_CONTENT_WIDTHS = [80, 74, 68];
  const WELCOME_MIN_DIAMETER = 200;
  const WELCOME_MAX_DIAMETER = 700;
  // The largest B the layout gives when the five neighbours are short (about
  // 380 px drawn): a record needing no more than this is normal and is never
  // paged; a record needing more is long and may page in B.
  const WELCOME_NORMAL_CAP = 380;
  // Slots: B first, then TL, TM, TR, BM, BR. Far layers draw smallest, so
  // they take the slots that bound B (above it and in the bottom row).
  const WELCOME_SLOTS = [
    { name: 'B', layer: 'near' },
    { name: 'TL', layer: 'far' },
    { name: 'TM', layer: 'mid' },
    { name: 'TR', layer: 'near' },
    { name: 'BM', layer: 'far' },
    { name: 'BR', layer: 'mid' }
  ];
  // Room a drift replacement may take in a position other than B (drawn px):
  // about 130 characters at the floor. Larger records wait for B or another
  // pass rather than page.
  const WELCOME_OTHER_ROOM = 300;
  // Overlap between two packed bubbles, in px, that the layout tolerates
  // (their boxes then cross by under 20 px, the Plan 15 limit); the drift
  // physics resolves it. Beyond it the set does not fit.
  const WELCOME_OVERLAP_TOLERANCE = 16;
  const WELCOME_SLOT_LIMITS = new Map();
  const WELCOME_NEED_CACHE = new Map();
  let WELCOME_FIT_CACHE = new Map();

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
    return `${r.id}|${r.name}|${r.message}|${r.ids.join(',')}`;
  }

  // Drawn scale bounds of a bubble in a layer: static (large) bubbles never
  // breathe; drifting ones scale between 0.9 and 0.996 of the layer scale.
  function welcomeScales(layer, isStatic) {
    const L = WELCOME_LAYERS[layer] || WELCOME_LAYERS.near;
    return { min: L.scale * (isStatic ? 1 : WELCOME_DEPTH_MIN), max: L.scale * (isStatic ? 1 : WELCOME_DEPTH_MAX) };
  }

  function welcomeFloorFor(scales) {
    return Math.ceil((WELCOME_FONT_FLOOR / scales.min) * 10) / 10;
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
  function welcomeStyleOrb(el, r, d, width, font) {
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
    if (d < 335) {
      if (title) title.style.fontSize = '26px';
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

  function welcomeWholeAt(host, r, d, font) {
    const el = welcomeProbe(host, r, d);
    const msg = el.querySelector('.message');
    for (const width of WELCOME_CONTENT_WIDTHS) {
      if (!welcomeStyleOrb(el, r, d, width, font)) return false;
      msg.textContent = r.message;
      if (welcomeInside(el, d)) return true;
    }
    return false;
  }

  // Smallest layout diameter at which the whole message fits on one page at
  // the given font floor, or null when it does not fit even at the largest.
  function welcomeNeed(host, r, floor) {
    const key = `${welcomeRecordKey(r)}|${floor}`;
    if (WELCOME_NEED_CACHE.has(key)) return WELCOME_NEED_CACHE.get(key);
    let need = null;
    if (host) {
      let lo = WELCOME_MIN_DIAMETER, hi = WELCOME_MAX_DIAMETER;
      if (welcomeWholeAt(host, r, hi, floor)) {
        if (welcomeWholeAt(host, r, lo, floor)) hi = lo;
        while (hi - lo > 2) {
          const mid = Math.round((lo + hi) / 2);
          if (welcomeWholeAt(host, r, mid, floor)) hi = mid;
          else lo = mid;
        }
        need = hi;
      }
    }
    if (WELCOME_NEED_CACHE.size > 3000) WELCOME_NEED_CACHE.clear();
    WELCOME_NEED_CACHE.set(key, need);
    return need;
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

  // Layout at layout diameter d: one page at the largest font that fits, or,
  // when the message cannot fit whole at d, the fewest floor-size pages.
  function welcomeFitAt(host, r, d, floor) {
    const key = `${welcomeRecordKey(r)}|${d}|${floor}`;
    if (WELCOME_FIT_CACHE.has(key)) return WELCOME_FIT_CACHE.get(key);
    const fit = welcomeFitAtRaw(host, r, d, floor);
    if (fit) WELCOME_FIT_CACHE.set(key, fit);
    return fit;
  }

  function welcomeFitAtRaw(host, r, d, floor) {
    const el = welcomeProbe(host, r, d);
    const msg = el.querySelector('.message'), page = el.querySelector('.orb-page-indicator');
    if (!msg || !page) return null;
    const start = Math.max(floor, d >= 450 ? 28 : d >= 335 ? 24 : 21);
    for (const width of WELCOME_CONTENT_WIDTHS) {
      welcomeStyleOrb(el, r, d, width, floor);
      msg.textContent = r.message;
      if (!welcomeInside(el, d)) continue;
      let font = start;
      for (; font > floor; font -= 0.5) {
        msg.style.fontSize = font + 'px';
        if (welcomeInside(el, d)) break;
      }
      // Never below the floor (the floor itself was verified above).
      font = Math.max(font, floor);
      return { d, width, font, pages: [r.message] };
    }
    page.hidden = false;
    let best = null;
    for (const width of WELCOME_CONTENT_WIDTHS) {
      welcomeStyleOrb(el, r, d, width, floor);
      page.textContent = '00 / 00 · CONTINUED';
      const pages = welcomePaginate(el, d, msg, r.message);
      if (!best || pages.length < best.pages.length) best = { d, width, font: floor, pages };
    }
    return best;
  }

  function welcomePageSeconds(pages) {
    return pages.reduce((n, p) => n + Math.max(9, p.length / 14), 0);
  }

  function welcomeDwell() {
    return S.dwell?.[1] ?? DWELL[1] ?? 30;
  }

  // Time left in the scene for a bubble that starts now: the dwell minus
  // the scene's age, less the 3.8 s entry flight.
  const WELCOME_ENTRY_SECONDS = 3.8;
  // A drift replacement is chosen as the old bubble starts to leave, so it
  // also waits for the 3.8 s exit before it enters.
  function welcomeTimeLeft(wait = 0) {
    return welcomeDwell() - (S.sceneAge || 0) - WELCOME_ENTRY_SECONDS - wait;
  }

  // Pages only when every page gets its full reading time inside the time
  // left in the scene.
  function welcomePagesFitTime(pages, wait = 0) {
    return pages.length < 2 || welcomePageSeconds(pages) <= welcomeTimeLeft(wait);
  }

  // The largest circle inside the region that touches none of the given
  // circles ({cx, cy, r}). A 4 px grid search over centres.
  function welcomeLargestFree(circles, step = 4) {
    const R = WELCOME_REGION;
    let best = { cx: R.left, cy: R.top, r: 0 };
    for (let cy = R.top + 40; cy <= R.bottom - 40; cy += step) {
      for (let cx = R.left + 40; cx <= R.right - 40; cx += step) {
        let r = Math.min(cx - R.left, R.right - cx, cy - R.top, R.bottom - cy);
        if (r <= best.r) continue;
        for (const c of circles) {
          // Clear of the circle, and of its square too (bubbles keep the
          // Plan 15 grid feel: their boxes overlap by at most 18 px).
          r = Math.min(r, Math.hypot(cx - c.cx, cy - c.cy) - c.r - 2, Math.max(Math.abs(cx - c.cx), Math.abs(cy - c.cy)) - c.r + 18);
          if (r <= best.r) break;
        }
        if (r > best.r) best = { cx, cy, r };
      }
    }
    return best;
  }

  // Homes of the five packed slots for the given drawn diameters, keyed by
  // slot name, plus whether they overflow the region.
  function welcomePackFive(drawn) {
    const R = WELCOME_REGION, g = WELCOME_GAP;
    const D = (name) => drawn[name] || 0;
    const homes = {};
    homes.TR = { cx: R.right - D('TR') / 2, cy: R.top + D('TR') / 2, r: D('TR') / 2 };
    homes.BR = { cx: R.right - D('BR') / 2, cy: R.bottom - D('BR') / 2, r: D('BR') / 2 };
    homes.TM = { cx: R.right - D('TR') - (D('TR') ? g : 0) - D('TM') / 2, cy: R.top + D('TM') / 2, r: D('TM') / 2 };
    homes.BM = { cx: R.right - D('BR') - (D('BR') ? g : 0) - D('BM') / 2, cy: R.bottom - D('BM') / 2, r: D('BM') / 2 };
    homes.TL = { cx: homes.TM.cx - D('TM') / 2 - (D('TM') ? g : 0) - D('TL') / 2, cy: R.top + D('TL') / 2, r: D('TL') / 2 };
    let overflow = false;
    for (const name of Object.keys(homes)) {
      if (!drawn[name]) {
        delete homes[name];
        continue;
      }
      const h = homes[name];
      // A bubble that would leave the region keeps its size and moves back
      // inside (it may overlap a neighbour a little) rather than cross the
      // title, the speech bubbles or the stage edge.
      if (h.cx - h.r < R.left || h.cy + h.r > R.bottom) overflow = true;
      h.cx = clamp(h.cx, R.left + h.r, R.right - h.r);
      h.cy = clamp(h.cy, R.top + h.r, R.bottom - h.r);
    }
    // Bubbles that still touch (a tall right column, a wide top row) are
    // eased apart inside the region, a few pixels a step, so no two drawn
    // circles overlap when the set fits at all.
    const names = Object.keys(homes);
    for (let step = 0; step < 60; step++) {
      let moved = false;
      for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
          const a = homes[names[i]], b = homes[names[j]];
          const dx = b.cx - a.cx, dy = b.cy - a.cy;
          const dist = Math.hypot(dx, dy) || 1;
          const min = a.r + b.r + g;
          if (dist >= min) continue;
          const push = Math.min(6, (min - dist) / 2);
          // Rows stay rows: bubbles slide apart sideways only (the left one
          // further left, the right one further right), so the top row keeps
          // the top edge and the bottom row the bottom edge.
          const ux = a.cx <= b.cx ? 1 : -1;
          a.cx = clamp(a.cx - ux * push, R.left + a.r, R.right - a.r);
          b.cx = clamp(b.cx + ux * push, R.left + b.r, R.right - b.r);
          moved = true;
        }
      }
      if (!moved) break;
    }
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const a = homes[names[i]], b = homes[names[j]];
        // Circles that still overlap, or boxes that cross by more than the
        // tolerance on both axes (the Plan 15 no-crossing rule), mean the set
        // does not fit.
        const boxX = Math.min(a.cx + a.r, b.cx + b.r) - Math.max(a.cx - a.r, b.cx - b.r);
        const boxY = Math.min(a.cy + a.r, b.cy + b.r) - Math.max(a.cy - a.r, b.cy - b.r);
        if (Math.hypot(b.cx - a.cx, b.cy - a.cy) < a.r + b.r || (boxX > WELCOME_OVERLAP_TOLERANCE && boxY > WELCOME_OVERLAP_TOLERANCE)) overflow = true;
      }
    }
    return { homes, overflow };
  }

  function welcomeIsStatic(r) {
    return !smallFits(r);
  }

  // Drawn and layout need of record r in a slot's layer.
  function welcomeSlotNeed(host, r, layer, isStatic) {
    const scales = welcomeScales(layer, isStatic);
    const floor = welcomeFloorFor(scales);
    const layout = welcomeNeed(host, r, floor);
    return { scales, floor, layout, drawn: layout === null ? null : layout * scales.max };
  }

  // Lays out a set of up to six records: per-slot placements. The record
  // with the greatest need takes B (the largest circle the box leaves beside
  // the others); the rest take the packed slots, largest first. Every record
  // is placed at the diameter its whole message needs; only a long B (one
  // that needs more than WELCOME_NORMAL_CAP) takes B's cap and pages there.
  // Orders in which the packed slots take the other records (largest need
  // first): every arrangement of the five slots, so the layout that fits
  // the most records whole can be found.
  const WELCOME_ORDERS = (() => {
    const names = ['TR', 'TM', 'BR', 'TL', 'BM'];
    const out = [];
    const walk = (prefix, rest) => {
      if (!rest.length) return out.push(prefix);
      rest.forEach((n, i) => walk([...prefix, n], [...rest.slice(0, i), ...rest.slice(i + 1)]));
    };
    walk([], names);
    return out;
  })();

  // Tries every slot arrangement for the set and keeps the best: one that
  // shows every record whole (or a long B inside the time left) with the
  // largest room for B; the plain arrangement when none does.
  function welcomeLayoutSet(host, set) {
    let best = null, bestScore = -Infinity;
    const seenKeys = new Set();
    for (const order of WELCOME_ORDERS) {
      const used = order.slice(0, Math.max(0, set.length - 1));
      const key = used.join(',');
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      const layout = welcomeLayoutOrder(host, set, used, 8);
      if (!layout) continue;
      const score = (welcomeSetProblem(layout) ? 0 : 1e6) + layout.placements.B.capDrawn;
      if (score > bestScore) {
        bestScore = score;
        best = used;
      }
    }
    return welcomeLayoutOrder(host, set, best || WELCOME_ORDERS[0].slice(0, Math.max(0, set.length - 1)), 4);
  }

  function welcomeLayoutOrder(host, set, order, step) {
    const nearNeed = (r) => {
      const n = welcomeSlotNeed(host, r, 'near', welcomeIsStatic(r));
      return n.drawn === null ? Infinity : n.drawn;
    };
    const byNeed = [...set].sort((a, b) => nearNeed(b) - nearNeed(a) || b.message.length - a.message.length || a.id.localeCompare(b.id));
    const b = byNeed[0];
    const others = byNeed.slice(1);
    const placements = {};
    const drawn = {};
    others.forEach((r, i) => {
      const slot = WELCOME_SLOTS.find((s) => s.name === order[i]);
      const need = welcomeSlotNeed(host, r, slot.layer, welcomeIsStatic(r));
      const layout = need.layout === null ? WELCOME_MAX_DIAMETER : need.layout;
      placements[slot.name] = { slot, r, layout, drawn: layout * need.scales.max, floor: need.floor, scales: need.scales, whole: need.layout !== null };
      drawn[slot.name] = placements[slot.name].drawn;
    });
    const pack = welcomePackFive(drawn);
    const present = order.filter((name) => placements[name]);
    for (const name of present) placements[name].home = pack.homes[name];
    const free = welcomeLargestFree(present.map((name) => pack.homes[name]), step);
    const bSlot = WELCOME_SLOTS[0];
    const bNeed = welcomeSlotNeed(host, b, bSlot.layer, welcomeIsStatic(b));
    const bCapDrawn = free.r * 2;
    const bCapLayout = Math.floor(bCapDrawn / bNeed.scales.max);
    // Normal: fits whole in the largest bubble the layout gives when its
    // neighbours are short (WELCOME_NORMAL_CAP drawn). Long: needs more.
    const bNormal = bNeed.drawn !== null && bNeed.drawn <= WELCOME_NORMAL_CAP;
    const bWhole = bNeed.layout !== null && bNeed.layout <= bCapLayout;
    const bLayout = bWhole || bNormal ? bNeed.layout : bCapLayout;
    let bPages = null;
    if (!bWhole && !bNormal) {
      const fit = welcomeFitAt(host, b, bLayout, bNeed.floor);
      bPages = fit ? fit.pages : [b.message];
    }
    const bDrawn = bLayout * bNeed.scales.max;
    const R = WELCOME_REGION;
    const home = { cx: clamp(free.cx, R.left + bDrawn / 2, R.right - bDrawn / 2), cy: clamp(free.cy, R.top + bDrawn / 2, R.bottom - bDrawn / 2), r: bDrawn / 2 };
    placements.B = { slot: bSlot, r: b, layout: bLayout, drawn: bDrawn, floor: bNeed.floor, scales: bNeed.scales, whole: bWhole, normal: bNormal, capLayout: bCapLayout, capDrawn: bCapDrawn, need: bNeed.layout, pages: bPages, home };
    return { placements, overflow: pack.overflow, b, others };
  }

  // Why a laid-out set does not show every record whole (or a long B inside
  // the time left), or null when it does.
  function welcomeSetProblem(layout) {
    const B = layout.placements.B;
    if (!B.whole && !B.normal && !welcomePagesFitTime(B.pages)) return 'b-time';
    if (!B.whole && B.normal && B.need * B.scales.max - B.capDrawn > WELCOME_OVERLAP_TOLERANCE) return 'b-room';
    if (layout.overflow || Object.values(layout.placements).some((p) => p.slot.name !== 'B' && !p.whole)) return 'others';
    return null;
  }

  // Chooses the records for Welcome ("fewer, whole", Anthony, September 18).
  // Starts from the first six records in core's rotation order and repairs
  // the set: a record that does not fit is traded for a record with a
  // smaller need, next in rotation order; at most one long record, which
  // pages in B only when its pages finish inside the time left in the scene.
  // Six bubbles show whenever six records of the pool fit whole; only when
  // even the six smallest do not fit does Welcome show fewer bubbles, as
  // many as fit whole. A normal record is never paged.
  function welcomeChooseSet(host) {
    const pool = records();
    if (!pool.length) return { set: [], layout: null };
    // Core's rotation order over the whole pool.
    const order = [];
    const seen = new Set();
    while (order.length < pool.length) {
      const r = chooseRandom(order.map((x) => x.id)) || pool.find((x) => !seen.has(x.id));
      if (!r || seen.has(r.id)) break;
      seen.add(r.id);
      order.push(r);
    }
    if (!host) return { set: order.slice(0, 6), layout: null };
    const need = (r) => {
      const n = welcomeSlotNeed(host, r, 'near', welcomeIsStatic(r));
      return n.drawn === null ? Infinity : n.drawn;
    };
    const isLong = (r) => need(r) > WELCOME_NORMAL_CAP;
    const excluded = new Set();
    let set = [];
    // First six in rotation order, with at most one long record (the first
    // drawn); a second long record gives way to the next normal one.
    for (const r of order) {
      if (set.length >= 6) break;
      if (isLong(r) && set.some(isLong)) {
        log('welcome_record_deferred', { id: r.id, reason: 'one-long' });
        continue;
      }
      set.push(r);
    }
    // A pool of fewer than six fills the remaining bubbles with repeats of
    // normal records, as the Plan 15 layout did.
    if (pool.length < 6) {
      const repeatable = order.filter((r) => !isLong(r));
      for (let i = 0; set.length < 6 && repeatable.length; i++) set.push(repeatable[i % repeatable.length]);
    }
    const inSet = (r) => set.some((x) => x.id === r.id);
    // The next record in rotation order, not on screen, not excluded, normal,
    // whose need is below `than`.
    const smaller = (than, len) => order.find((r) => !inSet(r) && !excluded.has(r.id) && r.message.length <= len && !isLong(r) && need(r) < than - 0.5);
    let layout = welcomeLayoutSet(host, set);
    const limit = pool.length * 2 + 24;
    for (let iter = 0; iter < limit; iter++) {
      const problem = welcomeSetProblem(layout);
      if (!problem) break;
      const long = set.find(isLong);
      // Trade the member with the largest need that has a smaller-need
      // record waiting (a long B keeps its place while its neighbours can
      // shrink; it gives way below when they cannot).
      const members = [...set].filter((r) => r !== long).sort((a, b) => need(b) - need(a));
      let traded = false;
      for (const m of members) {
        const s = smaller(need(m), m.message.length);
        if (s) {
          set.splice(set.indexOf(m), 1, s);
          traded = true;
          break;
        }
      }
      if (!traded && long) {
        // The long record cannot show inside the time left (or its
        // neighbours cannot make room): it waits for a later pass and the
        // next normal record in rotation order takes its place.
        log('welcome_record_deferred', { id: long.id, reason: problem, pages: layout.placements.B.pages ? layout.placements.B.pages.length : 0, timeLeft: +welcomeTimeLeft().toFixed(1) });
        excluded.add(long.id);
        const next = order.find((r) => !inSet(r) && !excluded.has(r.id) && !isLong(r));
        if (next) set.splice(set.indexOf(long), 1, next);
        else set.splice(set.indexOf(long), 1);
        traded = true;
      }
      if (!traded) {
        // Even the smallest records left do not fit six whole: one bubble
        // fewer, dropping the record with the greatest need.
        if (set.length <= 1) break;
        const drop = members[0];
        log('welcome_fewer_bubbles', { id: drop.id, count: set.length - 1 });
        set.splice(set.lastIndexOf(drop), 1);
      }
      if (!set.length) break;
      layout = welcomeLayoutSet(host, set);
    }
    return { set, layout };
  }

  function welcomeApplyFit(a, r, d, fit, limits) {
    const el = a.el;
    el.style.width = d + 'px';
    el.style.height = d + 'px';
    el.dataset.growMax = String(d);
    a.d = d;
    const b = slots.find((s) => s.key === a.key);
    if (b) b.d = d;
    el.innerHTML = `<div class="orb-life">${completeOrb(r, d)}</div>`;
    bindNumbers(el);
    welcomeStyleOrb(el, r, d, fit.width, fit.font);
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
    log('welcome_bubble_fit', { id: r.id, slot: limits ? limits.name : '', diameter: d, drawn: Math.round(d * (limits ? limits.scales.max : 1)), cap: limits ? Math.round(limits.capDrawn) : d, pages: fit.pages.length, font: fit.font, verbatim: fit.pages.join('') === r.message });
    // Core's own fit pass may already have logged this record's pagination
    // at this moment; log it only once.
    if (fit.pages.length > 1 && !qaLog.some((e) => e.type === 'circular_pagination' && e.id === r.id && e.at === +S.t.toFixed(3))) log('circular_pagination', { id: r.id, pages: fit.pages.length, diameter: d, verbatim: fit.pages.join('') === r.message });
  }

  // Sizes and lays out one live bubble. With remeasure, the diameter is
  // measured again for the record now in the bubble (a drift replacement, or
  // the real fonts finished loading); otherwise the layout measured with the
  // markup is reused.
  function welcomeFitActor(a, host, remeasure) {
    const r = S.pool.find((x) => x.id === a.id);
    if (!r || !a.el) return;
    const limits = WELCOME_SLOT_LIMITS.get(a.key);
    let d = Math.round(a.d);
    let floor = limits ? limits.floor : WELCOME_FONT_FLOOR;
    if (remeasure && host && limits) {
      const scales = welcomeScales(limits.layer, !!a.large);
      floor = welcomeFloorFor(scales);
      const need = welcomeNeed(host, r, floor);
      const capLayout = Math.floor(limits.capDrawn / scales.max);
      // The layout rule again: a normal record (whole within
      // WELCOME_NORMAL_CAP drawn) takes its need, even past the position's
      // room, rather than lose a word; a long record pages only in B, at B's
      // cap. Outside B every record is whole (the replacement was vetted).
      const normal = need !== null && need * scales.max <= WELCOME_NORMAL_CAP;
      if (limits.name !== 'B' || normal || (need !== null && need <= capLayout)) d = need === null ? Math.max(capLayout, WELCOME_MIN_DIAMETER) : need;
      else d = Math.max(capLayout, WELCOME_MIN_DIAMETER);
      limits.floor = floor;
      limits.scales = scales;
    }
    let fit = remeasure ? null : WELCOME_FIT_CACHE.get(`${welcomeRecordKey(r)}|${d}|${floor}`);
    if (!fit && host) fit = welcomeFitAt(host, r, d, floor);
    if (fit) welcomeApplyFit(a, r, d, fit, limits);
  }

  function welcomeFitAll(remeasure) {
    if (!V.actors || !V.actors.length) return;
    welcomeWithHost((host) => V.actors.forEach((a) => welcomeFitActor(a, host, remeasure)));
  }

  function welcomeBubbles() {
    WELCOME_SLOT_LIMITS.clear();
    WELCOME_FIT_CACHE = new Map();
    const forced = S.forceId;
    S.forceId = null;
    return welcomeWithHost((host) => {
      const { set, layout } = welcomeChooseSet(host);
      if (!set.length) return '';
      if (!host || !layout) {
        const fallback = [[870, 22, 300], [1228, 14, 286], [1530, 60, 270], [930, 345, 268], [1290, 336, 272], [1575, 350, 224]];
        return drawSlots(set, fallback, { readerBounds: { maxW: 1780, maxH: 625 }, forceId: forced });
      }
      let html = '';
      for (const slot of WELCOME_SLOTS) {
        const p = layout.placements[slot.name];
        if (!p) continue;
        const d = Math.round(p.layout);
        const fit = welcomeFitAt(host, p.r, d, p.floor);
        if (fit) WELCOME_FIT_CACHE.set(`${welcomeRecordKey(p.r)}|${d}|${p.floor}`, fit);
        // The home is the drawn circle's centre; the slot's box is d wide in
        // layout px around it (placeWelcome scales about the centre).
        const x = Math.round(p.home.cx - d / 2), y = Math.round(p.home.cy - d / 2);
        html += addOrb(p.r, x, y, d, { growMax: d, large: !smallFits(p.r) });
        WELCOME_SLOT_LIMITS.set('slot-' + S.slotCounter, { name: slot.name, layer: slot.layer, floor: p.floor, scales: p.scales, capDrawn: slot.name === 'B' ? p.capDrawn : p.drawn, layoutDrawn: p.drawn });
      }
      log('welcome_layout', { count: set.length, b: layout.placements.B.r.id, bDrawn: Math.round(layout.placements.B.drawn), bCap: Math.round(layout.placements.B.capDrawn), others: layout.others.map((r) => r.id) });
      return html;
    });
  }

  // The largest free circle (drawn px) in the region beside every other
  // bubble that stays on screen (leaving ones excluded; entering ones at
  // the home they fly to).
  function welcomeFreeNow(a) {
    const circles = [];
    for (const o of V.actors) {
      if (o === a || o.life === 'exiting' || o.life === 'absent') continue;
      const L = WELCOME_LAYERS[o.layer] || WELCOME_LAYERS.near;
      const entering = o.life === 'entering';
      circles.push({ cx: entering ? o.homeX : o.x, cy: entering ? o.homeY : o.y, r: (o.d * L.scale) / 2 });
    }
    return welcomeLargestFree(circles, 8);
  }

  // Drift replacement: core's replaceActor has just chosen the next record
  // for a retiring bubble. Keep that choice when the record fits the freed
  // position whole; otherwise take the next record in core's rotation that
  // does, or, for B, a long record whose pages finish inside the time left
  // in the scene. A record other than the one leaving is preferred; when no
  // other record fits whole, the bubble shows its current record again
  // rather than page a normal one.
  function welcomeVetReplacement(a) {
    const limits = WELCOME_SLOT_LIMITS.get(a.key);
    if (!limits || !a.nextId) return;
    const scales = welcomeScales(limits.layer, !!a.large);
    const floor = welcomeFloorFor(scales);
    // Room for a whole replacement: the position's own room, the largest
    // circle free beside the bubbles that stay on screen, and, outside B, WELCOME_OTHER_ROOM (drift
    // physics eases a slightly larger bubble clear of its neighbours).
    const free = welcomeFreeNow(a);
    const here = free.r * 2;
    const roomDrawn = Math.max(limits.capDrawn, here, limits.name === 'B' ? 0 : WELCOME_OTHER_ROOM);
    const capLayout = Math.floor(roomDrawn / scales.max);
    const pageLayout = Math.floor(Math.max(limits.capDrawn, here) / scales.max);
    const onScreen = new Set([...V.actors.map((x) => x.id), ...V.actors.filter((x) => x !== a).map((x) => x.nextId).filter(Boolean)]);
    const first = S.pool.find((r) => r.id === a.nextId);
    const rest = records().filter((r) => !onScreen.has(r.id) && r.id !== a.nextId);
    rest.sort((x, y) => (S.lastShown.get(x.id) ?? -10000) - (S.lastShown.get(y.id) ?? -10000) || y.createdAt - x.createdAt || x.id.localeCompare(y.id));
    const candidates = (first && eligible(first) ? [first, ...rest] : rest).filter((r) => r.id !== a.id);
    welcomeWithHost((host) => {
      if (!host) return;
      for (const r of candidates.slice(0, 60)) {
        const need = welcomeNeed(host, r, floor);
        if (need !== null && need <= capLayout) {
          if (r.id !== a.nextId) log('welcome_replacement_vetted', { slot: limits.name, was: a.nextId, now: r.id, cap: Math.round(roomDrawn) });
          a.nextId = r.id;
          // A record larger than the position's own room takes the free
          // space beside the other bubbles.
          a._welcomeHome = need * scales.max > Math.max(limits.capDrawn, limits.name === 'B' ? 0 : WELCOME_OTHER_ROOM) ? { x: free.cx, y: free.cy } : null;
          return;
        }
        // Only a long record pages, only in B, and only when every page is
        // read before the scene changes.
        const long = need === null || need * scales.max > WELCOME_NORMAL_CAP;
        if (limits.name === 'B' && long) {
          const fit = welcomeFitAt(host, r, pageLayout, floor);
          if (fit && welcomePagesFitTime(fit.pages, WELCOME_ENTRY_SECONDS)) {
            a._welcomeHome = here > limits.capDrawn ? { x: free.cx, y: free.cy } : null;
            limits.capDrawn = Math.max(limits.capDrawn, here);
            if (r.id !== a.nextId) log('welcome_replacement_vetted', { slot: limits.name, was: a.nextId, now: r.id, cap: Math.round(roomDrawn), pages: fit.pages.length, timeLeft: +welcomeTimeLeft(WELCOME_ENTRY_SECONDS).toFixed(1) });
            a.nextId = r.id;
            return;
          }
        }
      }
      log('welcome_replacement_kept', { slot: limits.name, was: a.nextId, id: a.id, room: Math.round(roomDrawn), tried: candidates.length });
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
      WELCOME_NEED_CACHE.clear();
      WELCOME_FIT_CACHE = new Map();
      checkFullFits();
      welcomeFitAll(true);
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
      // Each position carries its depth layer (Plan 17 layout); the Plan 15
      // index rule stays as the fallback when no layout was measured.
      const limits = WELCOME_SLOT_LIMITS.get(a.key);
      const layer = limits ? limits.layer : i === 3 ? 'near' : ['far', 'mid', 'near'][i % 3];
      a.layer = layer;
      const L = WELCOME_LAYERS[layer] || WELCOME_LAYERS.near;
      a.pace *= L.pace;
      if (a.el) a.el.dataset.depth = layer;
    });
  }

  function primeWelcome() {
    // Runs after core's mount-time checkFullFits, so this layout is final.
    welcomeFitAll(false);
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
    // replacement): size and lay it out for its own message before it shows.
    // (Only on a new record: settling after the entry flight also resets
    // core's born time, and must not restart the pages.)
    if (a._welcomeFitId && a.el && (a.id !== a._welcomeFitId || (a.born !== a._welcomeFitBorn && a.life === 'entering'))) {
      if (a._welcomeHome && a.life === 'entering') {
        a.homeX = a._welcomeHome.x;
        a.homeY = a._welcomeHome.y;
      }
      a._welcomeHome = null;
      welcomeWithHost((host) => welcomeFitActor(a, host, true));
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
      // A drifting bubble never rests over a large still bubble's words: it
      // is drawn clear of every large steady bubble (by 2 px), then kept
      // inside the stage.
      if (!a.large && a.life === 'steady' && !S.still) {
        for (const o of V.actors) {
          if (o === a || !o.large || o.life !== 'steady' || o._welcomeRX === undefined) continue;
          const dx = renderX - o._welcomeRX, dy = renderY - o._welcomeRY;
          const dist = Math.hypot(dx, dy) || 1;
          const min = half + o._welcomeRR + 2;
          if (dist >= min) continue;
          renderX += (dx / dist) * (min - dist);
          renderY += (dy / dist) * (min - dist);
        }
        if (minX <= maxX) renderX = clamp(renderX, minX, maxX);
        if (minY <= maxY) renderY = clamp(renderY, minY, maxY);
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
      const gx = a.screenX + Math.cos(angle) * rimR;
      const gy = a.screenY + Math.sin(angle) * rimR;
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
    // Height extended from 347 to 512 (Plan 17): the three fixed speech
    // bubbles reach down to y 516, past the title block this keepOut box
    // originally covered, so a drifting bubble could wander into them.
    keepOut: () => [{ x: 0, y: 10, w: 855, h: 512 }],
    replaceMode: 'drift'
  });
})();
