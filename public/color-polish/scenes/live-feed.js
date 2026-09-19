// Scene 12: Live Recognitions, full screen (Plan 17 Lane 13, slug live-feed).
//
// Anthony, 2026-09-19: "It's the live recognition scrolling but it fills the screen
// up to the header title." The cream rail that sits at the bottom of every other
// screen grows into one panel that runs from just under the header's rule to the
// bottom of the screen. Same data and order as the rail (records(), newest first,
// the verified public feed only), the same card markup (chatMarkup from
// core/chrome.js), drawn larger and in three columns that scroll continuously.
//
// Privacy: every card lives inside this scene's root. Neutral, Quiet, offline,
// stale and expired states replace or prune the scene through the core exactly as
// on every other screen, so nothing personal can outlive them here.
//
// Reduced motion (the scene is still): no continuous scroll. Whole cards are laid
// out as pages and the pages change with a fade.
'use strict';

const LIVE_FEED = Object.freeze({
  columns: 3,
  gap: 14, // px between cards, drawn at 1920
  speeds: [22, 25, 23.5], // px per second per column, drawn at 1920
  buffer: 260, // px of cards kept ready below the visible part of a column
  fadeMs: 600, // page fade in reduced motion
  overlap: 90, // px repeated when one card is taller than a column (paged mode)
  edge: 16, // px of soft fade at the top and bottom of a column (live-feed.css)
});

// Column membership and scroll places survive re-renders (a new recognition makes
// the core re-render the scene) and later visits, so cards never reshuffle and each
// visit continues where the last one stopped. Ids and numbers only, no content.
const liveFeedMemory = { column: new Map(), lanes: [], seeded: false };
let liveFeedView = null;

function liveFeedRecords() {
  return records().sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id));
}

// Stable columns: a record keeps its column for as long as it is shown; a new
// record joins the column that holds the fewest. Returns the ids per column
// (newest first) and the ids that are new since the last assignment.
function liveFeedAssign(list) {
  const live = new Set(list.map((r) => r.id));
  for (const id of [...liveFeedMemory.column.keys()]) if (!live.has(id)) liveFeedMemory.column.delete(id);
  const counts = Array(LIVE_FEED.columns).fill(0);
  for (const c of liveFeedMemory.column.values()) counts[c]++;
  const fresh = [];
  for (const r of list) {
    if (liveFeedMemory.column.has(r.id)) continue;
    let target = 0;
    for (let c = 1; c < LIVE_FEED.columns; c++) if (counts[c] < counts[target]) target = c;
    liveFeedMemory.column.set(r.id, target);
    counts[target]++;
    if (liveFeedMemory.seeded) fresh.push(r.id);
  }
  liveFeedMemory.seeded = true;
  const columns = Array.from({ length: LIVE_FEED.columns }, () => []);
  for (const r of list) columns[liveFeedMemory.column.get(r.id)].push(r.id);
  return { columns, fresh };
}

function liveFeedMarkup() {
  const railNote = document.querySelector('.footer .feed-title small')?.textContent || 'LIVE CAMPAIGN';
  const railUrl = document.querySelector('.footer .qr-url')?.textContent || '';
  const has = records().length > 0;
  const body = has
    ? `<div class="lf-lanes" id="lf-lanes">${Array.from({ length: LIVE_FEED.columns }, (_, i) => `<div class="lf-lane" data-lane="${i}"></div>`).join('')}</div>`
    : `<div class="lf-empty" id="lf-empty"><div class="lf-empty-heart">${heartSVG()}</div><div class="eyebrow">A quiet moment</div><h2>Kindness begins<br>with a word.</h2><p>No recognitions are currently cleared for display.<br>Scan the QR to recognize someone.</p></div>`;
  return `<section class="lf-panel" id="lf-panel" aria-label="Live Recognitions">
  <div class="lf-qr" id="lf-qr"><img id="lf-qr-img" alt="QR to the recognition form"><div class="lf-qr-label">Recognize<br>Someone<small>Who encouraged<br>you today?</small></div><div class="lf-qr-url">${esc(railUrl)}</div></div>
  <div class="lf-feed"><div class="lf-title"><span><i class="live-dot"></i> ${esc(NAMES[11].toUpperCase())}</span><small>${esc(railNote)}</small></div>${body}</div>
</section>`;
}

function liveFeedScale() {
  return getScale();
}

function liveFeedHeight(el) {
  return el.getBoundingClientRect().height / liveFeedScale();
}

function liveFeedCard(id) {
  const r = S.pool.find((x) => x.id === id);
  if (!eligible(r)) return null;
  const temp = document.createElement('div');
  temp.innerHTML = chatMarkup(r, false);
  return temp.firstElementChild;
}

// The next eligible id for a column: new arrivals first, then the column's list in
// order, wrapping around. Returns null when the column has nothing eligible.
function liveFeedNextId(lane, useArrivals = true) {
  while (useArrivals && lane.next.length) {
    const id = lane.next.shift();
    if (eligible(S.pool.find((x) => x.id === id))) return id;
  }
  for (let tries = 0; tries < lane.ids.length; tries++) {
    const id = lane.ids[lane.cursor % lane.ids.length];
    lane.cursor = (lane.cursor + 1) % lane.ids.length;
    if (eligible(S.pool.find((x) => x.id === id))) return id;
  }
  return null;
}

function liveFeedRemember(lane) {
  const first = lane.track.firstElementChild;
  liveFeedMemory.lanes[lane.index] = { firstId: first?.dataset.feedId || null, offset: lane.offset, shift: lane.shift || 0 };
}

// Continuous mode. Cards are appended until the column is covered plus a buffer. A
// column whose cards all fit stays where it is (no scroll, nothing repeated).
function liveFeedFill(lane, once = false) {
  let guard = 0;
  while (liveFeedHeight(lane.track) - lane.offset < lane.h + LIVE_FEED.buffer && guard++ < 60) {
    if (once && guard > lane.ids.length) break;
    const id = liveFeedNextId(lane, !once);
    if (!id) break;
    const el = liveFeedCard(id);
    if (!el) continue;
    lane.track.append(el);
    bindNumbers(el);
  }
}

function liveFeedStartScroll(lane) {
  lane.track.replaceChildren();
  lane.track.style.transform = '';
  lane.shift = 0;
  // First pass, from the top: place every card once. If they all fit, the column is
  // fixed: it shows every card, never scrolls and never repeats one.
  lane.cursor = 0;
  lane.offset = 0;
  liveFeedFill(lane, true);
  lane.fixed = lane.track.children.length >= lane.ids.length && liveFeedHeight(lane.track) <= lane.h - LIVE_FEED.edge;
  if (!lane.fixed) {
    // Scrolling column: start again from where the last visit stopped.
    const memory = liveFeedMemory.lanes[lane.index];
    const at = memory?.firstId ? lane.ids.indexOf(memory.firstId) : -1;
    lane.track.replaceChildren();
    lane.cursor = at >= 0 ? at : 0;
    lane.offset = at >= 0 ? Math.max(0, memory.offset || 0) : 0;
    liveFeedFill(lane);
    const first = lane.track.firstElementChild;
    if (first && lane.offset >= liveFeedHeight(first) + LIVE_FEED.gap) lane.offset = 0;
  }
  lane.firstEl = null;
  lane.track.style.transform = `translate3d(0,${(-lane.offset).toFixed(2)}px,0)`;
  liveFeedRemember(lane);
}

// Paged mode (reduced motion). A page is as many whole cards as fit the column. One
// card taller than the column is shown in overlapping steps so every line is whole
// on at least one step.
function liveFeedStartPage(lane) {
  lane.track.replaceChildren();
  lane.track.style.transform = '';
  lane.offset = 0;
  lane.shift = 0;
  lane.shiftMax = 0;
  let used = 0, count = 0;
  const room = lane.h - LIVE_FEED.edge * 2; // whole cards sit clear of the soft edges
  const start = lane.cursor;
  while (count < lane.ids.length) {
    const id = lane.ids[(start + count) % lane.ids.length];
    const el = liveFeedCard(id);
    if (!el) { count++; continue; }
    lane.track.append(el);
    const h = liveFeedHeight(el);
    if (lane.track.children.length > 1 && used + h > room) { el.remove(); break; }
    bindNumbers(el);
    used += h + LIVE_FEED.gap;
    count++;
    if (h > room) { lane.shiftMax = h - room; break; }
  }
  lane.pageCount = Math.max(1, count);
  lane.fixed = count >= lane.ids.length && lane.shiftMax === 0;
  liveFeedRemember(lane);
}

function liveFeedTurnLane(lane) {
  if (lane.fixed) return;
  if (lane.shift < lane.shiftMax) {
    lane.shift = Math.min(lane.shiftMax, lane.shift + lane.h - LIVE_FEED.overlap);
    lane.track.style.transform = `translate3d(0,${(-lane.shift).toFixed(2)}px,0)`;
    return;
  }
  lane.cursor = (lane.cursor + lane.pageCount) % lane.ids.length;
  liveFeedStartPage(lane);
}

function liveFeedLayout(view, mode) {
  view.mode = mode;
  view.pageClock = 0;
  view.turning = false;
  view.lanesEl?.classList.remove('lf-turning');
  for (const lane of view.lanes) {
    lane.h = liveFeedHeight(lane.el);
    if (mode === 'scroll') liveFeedStartScroll(lane);
    else {
      const memory = liveFeedMemory.lanes[lane.index];
      const at = memory?.firstId ? lane.ids.indexOf(memory.firstId) : -1;
      lane.cursor = at >= 0 ? at : 0;
      liveFeedStartPage(lane);
    }
  }
}

// Seconds each page stays up in reduced motion: a share of this screen's own dwell
// from state, never a fixed number of its own.
function liveFeedPageSeconds() {
  const dwell = S.dwell?.[12] ?? DWELL[12];
  return clamp(dwell / 5, 6, 15);
}

function liveFeedWantedMode(view) {
  if (!S.still) return 'scroll';
  // Still because of a pause or the owner's still setting: hold the frame as it is.
  if (S.playing === false || S.motion === 'still') return view.mode || 'paged';
  return 'paged';
}

function liveFeedSyncQr(view) {
  const img = view.root.querySelector('#lf-qr-img');
  if (!img) return;
  if (S.qrDataUrl) {
    if (img.getAttribute('src') !== S.qrDataUrl) img.src = S.qrDataUrl;
    img.hidden = false;
  } else {
    img.removeAttribute('src');
    img.hidden = true;
  }
}

function liveFeedStop(view) {
  if (!view) return;
  if (view.timer) clearInterval(view.timer);
  if (view.turnTimer) clearTimeout(view.turnTimer);
  view.timer = null;
  view.turnTimer = null;
  if (liveFeedView === view) liveFeedView = null;
}

// Runs twice a second while the scene is mounted. It keeps the QR current, moves
// between continuous and paged layouts when stillness changes, and turns pages in
// reduced motion (the core does not tick a still scene).
function liveFeedHeartbeat(view) {
  if (!view.root.isConnected) { liveFeedStop(view); return; }
  const now = performance.now();
  const dt = Math.min(1, Math.max(0, (now - view.beatAt) / 1000));
  view.beatAt = now;
  liveFeedSyncQr(view);
  if (S.mode !== 'normal') return;
  // Every card expired or was removed while the screen was up: show the calm empty
  // state instead of blank columns.
  if (view.lanes.length && !records().length && S.s === 12 && !active && !transition) { renderNow(12, { keepAge: true }); return; }
  if (!view.lanes.length) return;
  const wanted = liveFeedWantedMode(view);
  if (wanted !== view.mode && !view.turning) liveFeedLayout(view, wanted);
  if (view.mode !== 'paged' || view.turning) return;
  const paging = S.still && S.playing !== false && S.motion !== 'still' && !active && !transition && !frozen && !document.hidden;
  if (!paging || view.lanes.every((lane) => lane.fixed)) return;
  view.pageClock += dt;
  if (view.pageClock < liveFeedPageSeconds()) return;
  view.pageClock = 0;
  view.turning = true;
  view.lanesEl.classList.add('lf-turning');
  view.turnTimer = setTimeout(() => {
    view.turnTimer = null;
    if (!view.root.isConnected) return;
    view.lanes.forEach(liveFeedTurnLane);
    view.lanesEl.classList.remove('lf-turning');
    view.turning = false;
    log('live_feed_page', { lanes: view.lanes.map((lane) => lane.cursor) });
  }, LIVE_FEED.fadeMs + 50);
}

function liveFeedMount(root) {
  liveFeedStop(liveFeedView);
  const view = { root, lanes: [], lanesEl: root.querySelector('#lf-lanes'), mode: null, pageClock: 0, turning: false, timer: null, turnTimer: null, beatAt: performance.now() };
  liveFeedView = view;
  liveFeedSyncQr(view);
  if (view.lanesEl) {
    const { columns, fresh } = liveFeedAssign(liveFeedRecords());
    view.lanesEl.querySelectorAll('.lf-lane').forEach((el, index) => {
      const ids = columns[index];
      if (!ids.length) return;
      const track = document.createElement('div');
      track.className = 'lf-track';
      el.append(track);
      view.lanes.push({ index, el, track, ids, cursor: 0, offset: 0, shift: 0, shiftMax: 0, next: fresh.filter((id) => ids.includes(id)), h: 0, fixed: false, firstEl: null, firstH: 0, pageCount: 1 });
    });
    liveFeedLayout(view, liveFeedWantedMode(view));
  }
  view.timer = setInterval(() => liveFeedHeartbeat(view), 500);
}

// Continuous scroll. Called by the core only while the scene is moving (never in
// still mode, during an arrival or during a scene change).
function liveFeedTick(dt) {
  const view = liveFeedView;
  if (!view || view.mode !== 'scroll' || !view.root.isConnected) return;
  for (const lane of view.lanes) {
    if (lane.fixed) continue;
    let first = lane.track.firstElementChild;
    if (!first) { liveFeedFill(lane); continue; }
    if (first !== lane.firstEl) { lane.firstEl = first; lane.firstH = liveFeedHeight(first); }
    lane.offset += dt * LIVE_FEED.speeds[lane.index % LIVE_FEED.speeds.length];
    let recycled = false;
    while (first && lane.offset >= lane.firstH + LIVE_FEED.gap) {
      lane.offset -= lane.firstH + LIVE_FEED.gap;
      first.remove();
      first = lane.track.firstElementChild;
      lane.firstEl = first;
      lane.firstH = first ? liveFeedHeight(first) : 0;
      recycled = true;
    }
    if (recycled) { liveFeedFill(lane); liveFeedRemember(lane); }
    lane.track.style.transform = `translate3d(0,${(-lane.offset).toFixed(2)}px,0)`;
  }
}

function liveFeedLeave(root) {
  const view = liveFeedView;
  // Only the view that owns the leaving root: a forced re-entry mounts the next view
  // before the core reports the old root as gone.
  if (!view || (root && view.root !== root)) return;
  view.lanes.forEach(liveFeedRemember);
  liveFeedStop(view);
}

document.getElementById('tv')?.style.setProperty('--lf-fade', `${TRANSITION_DURATION}s`);

registerScene(12, {
  markup: liveFeedMarkup,
  mount: liveFeedMount,
  tick: liveFeedTick,
  onLeave: liveFeedLeave,
  archOpacity: '.2',
});
