// Scene 8: We Are Peacemakers, the puzzle world.
'use strict';

const PEACEMAKERS_TOTAL_SLOTS = 24;
// Fill the near-equator bands first so the opening recognitions land in the
// visible face of the globe. The four latitude bands remain evenly spaced,
// with the polar rows filling after the center.
const PEACEMAKERS_LATITUDES = [-14, 14, -42, 42];
// Start the first two recognition slots on the near side of the rotating
// sphere. The globe keeps its six evenly spaced longitudes while the initial
// pair enters through the visible side.
const PEACEMAKERS_LONGITUDES = [240, 300, 0, 60, 120, 180];
const PEACEMAKERS_GLOBE_RADIUS = 290;

// Scale factors mapping from 744x691 source image to the rendered 604x482 box:
const PEACEMAKERS_SCALE_X = 604 / 744; // 0.8118279569892473
const PEACEMAKERS_SCALE_Y = 482 / 691; // 0.6975397973950796

// Measured source sockets on the 744x691 globe art:
const PEACEMAKERS_SOURCE_SOCKETS = [
  { sx: 565, sy: 180 }, // upper right lifting piece
  { sx: 372, sy: 220 }, // center upper piece
  { sx: 460, sy: 310 }, // right mid piece
  { sx: 310, sy: 270 }  // left mid piece
];

let peacemakers_root = null;
let peacemakers_activePieceEl = null;
let peacemakers_activeRecord = null;
let peacemakers_phase = 'idle';
let peacemakers_phaseAge = 0;
let peacemakers_holdDuration = 3;
let peacemakers_reading = null;
let peacemakers_currentSocket = null;
let peacemakers_joined = [];
let peacemakers_nextSlot = 0;
let peacemakers_targetSlot = 0;
let peacemakers_shownIds = [];
let peacemakers_totalJoins = 0;
let peacemakers_timers = [];
let peacemakers_globeStartedAt = 0;

function peacemakers() {
  return '<div style="position:absolute;left:12px;top:33px;width:829px">' +
    '<div class="eyebrow">Mother\u2019s Love in our community</div>' +
    '<h1 style="font-size:71px;letter-spacing:-2.2px;line-height:1.02;margin:22px 0">We Are<br>' + shimmer('Peace') + '<span class="violet">makers</span></h1>' +
    '<p class="subheading" style="font-size:26px">Recognize the kindness<br>you see around you.</p>' +
    '</div>' +
    art('globe', 'left:271px;top:134px;width:604px;height:482px') +
    '<div class="peacemakers-world-sockets" id="peacemakers-world-sockets"></div>' +
    '<div class="globe-light"></div>' +
    '<div class="peacemakers-hold-zone" id="peacemakers-hold-zone"></div>' +
    '<div class="peacemakers-globe-stage" id="peacemakers-globe-stage">' +
    '<div class="peacemakers-globe-sphere" id="peacemakers-globe-sphere"></div>' +
    '</div>';
}

function peacemakersSlotTransform(slotIndex) {
  const band = Math.floor(slotIndex / 6);
  const lonIndex = slotIndex % 6;
  const lat = PEACEMAKERS_LATITUDES[band] || 0;
  const lon = PEACEMAKERS_LONGITUDES[lonIndex] || 0;
  return `rotateY(${lon}deg) rotateX(${lat}deg) translateZ(${PEACEMAKERS_GLOBE_RADIUS}px)`;
}

function peacemakersCreateSlotElement(slotIndex) {
  const slot = document.createElement('div');
  slot.className = 'globe-slot';
  slot.dataset.slotIndex = String(slotIndex);
  slot.style.position = 'absolute';
  slot.style.left = '-48px';
  slot.style.top = '-48px';
  slot.style.width = '96px';
  slot.style.height = '96px';
  slot.style.transformOrigin = '48px 48px 0';
  slot.style.transform = peacemakersSlotTransform(slotIndex);
  slot.style.transformStyle = 'preserve-3d';
  return slot;
}

function peacemakersFitCard(card, r, isStill) {
  const content = card.querySelector('.puzzle-card-inner');
  const msg = card.querySelector('.puzzle-message');
  const indicator = card.querySelector('.puzzle-page-indicator');
  if (!content || !msg) {
    return { pages: [r.message], index: 0, duration: peacemakers_holdDuration };
  }

  const fontFloor = 18;
  let font = 20;
  msg.style.fontSize = font + 'px';
  msg.style.lineHeight = '1.28';
  msg.textContent = r.message;

  // Measure the message element itself, not .puzzle-card-inner. The inner is
  // height:100% flex, so a message that fits naturally reports scrollHeight
  // equal to clientHeight. Only an extra pixel of scroll height indicates
  // actual overflow and should trigger pagination.
  const overflows = () => msg.scrollHeight > msg.clientHeight + 1;

  while (overflows() && font > fontFloor) {
    font -= 0.5;
    msg.style.fontSize = font + 'px';
  }

  if (!overflows()) {
    if (indicator) indicator.hidden = true;
    return { pages: [r.message], index: 0, duration: peacemakers_holdDuration };
  }

  const pages = [];
  const words = r.message.match(/\S+\s*|\s+/g) || [r.message];
  let buffer = '';

  for (const word of words) {
    msg.textContent = buffer + word;
    if (overflows() && buffer) {
      pages.push(buffer);
      buffer = word;
    } else {
      buffer += word;
    }
  }
  if (buffer) pages.push(buffer);

  log('circular_pagination', {
    id: r.id,
    pages: pages.length,
    diameter: 280,
    verbatim: pages.join('') === r.message
  });

  if (isStill) {
    // Still mode cannot cycle pages, because the page advance lives in the
    // scene tick and that tick does not run while S.still is true. Stacking
    // every page inside the message box is not an answer either: the box is
    // about 110 px tall and a 500 character message needs roughly 550 px at
    // the 18 px floor, so the extra pages would be clipped by overflow while
    // the DOM claimed they were rendered. That is truncation wearing a
    // disguise, and a reviewer rightly called the same pattern out elsewhere.
    //
    // Show page one at the floor size, state the page count, and carry the
    // remaining pages in explicitly hidden elements so no source text is lost.
    msg.innerHTML = '';
    pages.forEach((pageText, idx) => {
      const span = document.createElement('span');
      span.className = 'puzzle-message-page';
      span.dataset.pageIndex = String(idx);
      span.textContent = pageText;
      if (idx > 0) span.hidden = true;
      msg.appendChild(span);
    });
    if (indicator) {
      indicator.hidden = false;
      indicator.textContent = '01 / ' + String(pages.length).padStart(2, '0') + ' \u00B7 PAUSED';
    }
    return { pages, index: 0, duration: peacemakers_holdDuration };
  }

  msg.textContent = pages[0];
  if (indicator) {
    indicator.hidden = false;
    indicator.textContent = '01 / ' + String(pages.length).padStart(2, '0') + ' \u00B7 CONTINUED';
  }

  return { pages, index: 0, duration: peacemakers_holdDuration };
}

function peacemakersBuildCard(r, isFaceOn, bgPos) {
  const card = document.createElement('div');
  const exprId = (r.ids && r.ids[0]) || 1;
  const expr = catalog[exprId - 1] || catalog[0];
  const color = expr.color || '#FFD05F';

  if (bgPos) {
    card.style.setProperty('--bg-pos', bgPos);
  }

  if (isFaceOn) {
    card.className = 'puzzle-card face-on held-card';
    card.id = 'peacemakers-held-card';
    card.dataset.recordId = r.id;
    card.style.setProperty('--tint', color);
    card.style.setProperty('--tint-alpha', color + '2b');

    card.innerHTML =
      '<div class="puzzle-card-inner">' +
      '<div class="puzzle-card-header">' +
      '<div class="puzzle-badge" style="--tint:' + color + '">' + icon(exprId) + '</div>' +
      '<div class="puzzle-recipient-block">' +
      '<div class="puzzle-thanks">THANK YOU,</div>' +
      '<h3 class="puzzle-recipient">' + esc(r.name) + '</h3>' +
      '</div>' +
      '</div>' +
      '<p class="puzzle-message" data-full-message="' + esc(r.id) + '">' + esc(r.message) + '</p>' +
      chips(r.ids) +
      reactionMarkup(r) +
      '<div class="puzzle-page-indicator" hidden></div>' +
      '</div>';
  } else {
    card.className = 'puzzle-card globe-card joined-card';
    card.dataset.recordId = r.id;
    card.style.setProperty('--tint', color);
    card.style.setProperty('--tint-alpha', color + '2b');

    card.innerHTML =
      '<div class="globe-card-inner">' +
      '<div class="globe-badge" style="--tint:' + color + '">' + icon(exprId) + '</div>' +
      '<div class="globe-recipient">' + esc(r.name) + '</div>' +
      '<p class="puzzle-message" style="display:none" data-full-message="' + esc(r.id) + '">' + esc(r.message) + '</p>' +
      '</div>';
  }
  return card;
}

function peacemakersJoinCard(r, slotIndex, bgPos) {
  const sphere = document.getElementById('peacemakers-globe-sphere');
  if (!sphere) return;

  if (peacemakers_joined.length >= PEACEMAKERS_TOTAL_SLOTS) {
    const oldest = peacemakers_joined.shift();
    if (oldest && oldest.cardEl) {
      const oldCard = oldest.cardEl;
      oldCard.classList.add('dissolving');
      const removeTimer = setTimeout(() => {
        oldCard.remove();
      }, 500);
      peacemakers_timers.push(removeTimer);
    }
  }

  let slotEl = sphere.querySelector(`.globe-slot[data-slot-index="${slotIndex}"]`);
  if (!slotEl) {
    slotEl = peacemakersCreateSlotElement(slotIndex);
    sphere.appendChild(slotEl);
  }

  const staleCards = slotEl.querySelectorAll('.globe-card:not(.dissolving)');
  staleCards.forEach((c) => c.remove());

  const card = peacemakersBuildCard(r, false, bgPos);
  const band = Math.floor(slotIndex / 6);
  const lat = PEACEMAKERS_LATITUDES[band] || 0;
  const lon = PEACEMAKERS_LONGITUDES[slotIndex % 6] || 0;
  card.style.setProperty('--face-lat', `${-lat}deg`);
  card.style.setProperty('--face-lon', `${-lon}deg`);
  const globeAge = Math.max(0, (performance.now() - peacemakers_globeStartedAt) / 1000);
  card.style.setProperty('--globe-animation-delay', `${-globeAge}s`);
  slotEl.appendChild(card);

  peacemakers_totalJoins++;
  peacemakers_joined.push({
    id: r.id,
    record: r,
    slotIndex,
    slotEl,
    cardEl: card
  });

  log('peacemakers_piece_joined', {
    id: r.id,
    count: peacemakers_joined.length,
    totalJoins: peacemakers_totalJoins,
    slot: slotIndex
  });
}

function peacemakersStartNextPiece() {
  const holdZone = document.getElementById('peacemakers-hold-zone');
  if (!holdZone) return;

  const r = chooseRandom(peacemakers_shownIds) || records()[0];
  if (!r) return;

  markShown(r.id);
  peacemakers_shownIds.push(r.id);
  if (peacemakers_shownIds.length > 50) peacemakers_shownIds.shift();

  const socketIdx = peacemakers_totalJoins % PEACEMAKERS_SOURCE_SOCKETS.length;
  const srcSocket = PEACEMAKERS_SOURCE_SOCKETS[socketIdx];
  const relX = Math.round(srcSocket.sx * PEACEMAKERS_SCALE_X);
  const relY = Math.round(srcSocket.sy * PEACEMAKERS_SCALE_Y);
  const startStageX = 271 + relX;
  const startStageY = 134 + relY;
  const bgPos = `-${relX}px -${relY}px`;

  const socketContainer = document.getElementById('peacemakers-world-sockets');
  if (socketContainer) {
    const socketEl = document.createElement('div');
    socketEl.className = 'peacemakers-socket';
    socketEl.style.left = relX + 'px';
    socketEl.style.top = relY + 'px';
    socketContainer.appendChild(socketEl);
    while (socketContainer.children.length > 4) {
      socketContainer.firstElementChild.remove();
    }
  }

  peacemakers_activeRecord = r;
  peacemakers_holdDuration = 3 + r.message.length / 40;
  peacemakers_phase = 'detaching';
  peacemakers_phaseAge = 0;
  peacemakers_currentSocket = { relX, relY, startX: startStageX, startY: startStageY, bgPos };

  holdZone.replaceChildren();

  const card = peacemakersBuildCard(r, true, bgPos);
  card.classList.add('flying');

  card.style.position = 'absolute';
  card.style.left = '0px';
  card.style.top = '0px';
  card.style.width = '280px';
  card.style.height = '360px';
  card.style.transformOrigin = '0 0';

  const initDx = startStageX - 900;
  const initDy = startStageY - 188;
  const initScale = 96 / 280;
  card.style.transform = `translate3d(${initDx.toFixed(1)}px, ${initDy.toFixed(1)}px, 0) scale(${initScale.toFixed(4)})`;
  card.style.opacity = '0.8';

  holdZone.appendChild(card);
  peacemakers_activePieceEl = card;
  peacemakers_reading = peacemakersFitCard(card, r, false);
}

function peacemakersInitStill(root) {
  peacemakers_phase = 'idle';
  peacemakers_phaseAge = 0;
  peacemakers_joined = [];
  peacemakers_totalJoins = 0;

  const holdZone = root.querySelector('#peacemakers-hold-zone');
  const pool = records();
  const heldRec = pool[0] || normalizedRecord({
    id: 'rec-still-hold',
    recipient: 'Kind Neighbor',
    message: 'Thank you for your warmth and peaceful consideration.',
    expressionIds: [2],
    createdAt: '2026-09-08T08:00:00.000Z',
    firstPublishedAt: '2026-09-08T08:00:00.000Z',
    expiresAt: '2026-09-15T08:00:00.000Z',
    status: 'published'
  }, {});

  if (holdZone && heldRec) {
    holdZone.replaceChildren();
    const s = PEACEMAKERS_SOURCE_SOCKETS[0];
    const rx = Math.round(s.sx * PEACEMAKERS_SCALE_X);
    const ry = Math.round(s.sy * PEACEMAKERS_SCALE_Y);
    const bgPos = `-${rx}px -${ry}px`;

    const heldCard = peacemakersBuildCard(heldRec, true, bgPos);
    heldCard.style.position = 'absolute';
    heldCard.style.left = '0px';
    heldCard.style.top = '0px';
    heldCard.style.width = '280px';
    heldCard.style.height = '360px';
    heldCard.style.transform = 'translate3d(0px, 0px, 0) scale(1)';
    holdZone.appendChild(heldCard);
    peacemakers_activePieceEl = heldCard;
    peacemakers_reading = peacemakersFitCard(heldCard, heldRec, true);
  }

  for (let i = 0; i < 8; i++) {
    const rec = pool[(i + 1) % pool.length] || pool[0] || heldRec;
    const s = PEACEMAKERS_SOURCE_SOCKETS[i % PEACEMAKERS_SOURCE_SOCKETS.length];
    const rx = Math.round(s.sx * PEACEMAKERS_SCALE_X);
    const ry = Math.round(s.sy * PEACEMAKERS_SCALE_Y);
    if (rec) peacemakersJoinCard(rec, i, `-${rx}px -${ry}px`);
  }
}

function peacemakersInitActive(root) {
  peacemakers_joined = [];
  peacemakers_totalJoins = 0;
  peacemakers_nextSlot = 0;
  peacemakersStartNextPiece();
}

function peacemakersMount(root) {
  peacemakers_root = root;
  peacemakers_timers = [];
  peacemakers_shownIds = [];
  peacemakers_globeStartedAt = performance.now();

  if (S.still) {
    peacemakersInitStill(root);
  } else {
    peacemakersInitActive(root);
  }
}

function peacemakersPrime(checkpoint) {
  if (Array.isArray(V.speech) && V.speech.length >= 4) {
    const offsets = [0, 2.2, 4.4, 6.6];
    V.speech.forEach((sp, i) => {
      sp.age = 0;
      sp.fadeAge = 0;
      const offset = offsets[i] || 0;
      if (S.still) {
        sp.phase = 'showing';
        if (sp.el) sp.el.classList.remove('fading');
      } else if (offset > 0) {
        sp.phase = 'fading_out';
        sp.fadeAge = -(offset - 0.5);
        if (sp.el) sp.el.classList.add('fading');
      } else {
        sp.phase = 'showing';
        if (sp.el) sp.el.classList.remove('fading');
      }
    });
  }
}

function peacemakersTickAge(dt) {
  if (S.still || !peacemakers_activePieceEl) return;

  peacemakers_phaseAge += dt;

  if (peacemakers_phase === 'detaching') {
    const p = clamp(peacemakers_phaseAge / 1.1, 0, 1);
    const eased = ease(p);
    const curDx = lerp(peacemakers_currentSocket.startX - 900, 0, eased);
    const curDy = lerp(peacemakers_currentSocket.startY - 188, 0, eased);
    const curScale = lerp(96 / 280, 1.0, eased);
    const curOp = lerp(0.8, 1.0, eased);

    peacemakers_activePieceEl.style.transform = `translate3d(${curDx.toFixed(1)}px, ${curDy.toFixed(1)}px, 0) scale(${curScale.toFixed(4)})`;
    peacemakers_activePieceEl.style.opacity = curOp.toFixed(3);

    if (p >= 1) {
      peacemakers_phase = 'holding';
      peacemakers_phaseAge = 0;
      peacemakers_activePieceEl.classList.remove('flying');
      peacemakers_activePieceEl.style.transform = 'translate3d(0px, 0px, 0) scale(1)';
      peacemakers_activePieceEl.style.opacity = '1';
    }
  } else if (peacemakers_phase === 'holding') {
    if (peacemakers_reading && peacemakers_reading.pages.length > 1) {
      const pageDur = peacemakers_holdDuration / peacemakers_reading.pages.length;
      const targetIdx = Math.min(peacemakers_reading.pages.length - 1, Math.floor(peacemakers_phaseAge / pageDur));
      if (targetIdx !== peacemakers_reading.index) {
        peacemakers_reading.index = targetIdx;
        const msgEl = peacemakers_activePieceEl.querySelector('.puzzle-message');
        const indEl = peacemakers_activePieceEl.querySelector('.puzzle-page-indicator');
        if (msgEl) msgEl.textContent = peacemakers_reading.pages[targetIdx];
        if (indEl) {
          const isLast = (targetIdx === peacemakers_reading.pages.length - 1);
          indEl.textContent = `${String(targetIdx + 1).padStart(2, '0')} / ${String(peacemakers_reading.pages.length).padStart(2, '0')} \u00B7 ${isLast ? 'COMPLETE' : 'CONTINUED'}`;
        }
      }
    }

    if (peacemakers_phaseAge >= peacemakers_holdDuration) {
      log('peacemakers_piece_hold', {
        id: peacemakers_activeRecord ? peacemakers_activeRecord.id : '',
        duration: +peacemakers_phaseAge.toFixed(3),
        expected: +peacemakers_holdDuration.toFixed(3),
        msgLen: peacemakers_activeRecord ? peacemakers_activeRecord.message.length : 0
      });

      peacemakers_phase = 'snapping';
      peacemakers_phaseAge = 0;
      peacemakers_targetSlot = peacemakers_nextSlot % PEACEMAKERS_TOTAL_SLOTS;
      peacemakers_nextSlot++;

      peacemakers_activePieceEl.classList.add('snapping');
      peacemakers_activePieceEl.classList.remove('face-on');
    }
  } else if (peacemakers_phase === 'snapping') {
    const p = clamp(peacemakers_phaseAge / 0.9, 0, 1);
    const eased = ease(p);

    const band = Math.floor(peacemakers_targetSlot / 6);
    const lonIndex = peacemakers_targetSlot % 6;
    const lat = PEACEMAKERS_LATITUDES[band] || 0;
    const lon = PEACEMAKERS_LONGITUDES[lonIndex] || 0;
    const latRad = (lat * Math.PI) / 180;
    const lonRad = (lon * Math.PI) / 180;
    const targetStageX = 1510 + PEACEMAKERS_GLOBE_RADIUS * Math.cos(latRad) * Math.sin(lonRad) - 48;
    const targetStageY = 318 - PEACEMAKERS_GLOBE_RADIUS * Math.sin(latRad) - 48;

    const curDx = lerp(0, targetStageX - 900, eased);
    const curDy = lerp(0, targetStageY - 188, eased);
    const curScale = lerp(1.0, 96 / 280, eased);
    const curOp = lerp(1.0, 0.85, eased);

    peacemakers_activePieceEl.style.transform = `translate3d(${curDx.toFixed(1)}px, ${curDy.toFixed(1)}px, 0) scale(${curScale.toFixed(4)})`;
    peacemakers_activePieceEl.style.opacity = curOp.toFixed(3);

    if (p >= 1) {
      peacemakersJoinCard(peacemakers_activeRecord, peacemakers_targetSlot, peacemakers_currentSocket.bgPos);
      peacemakers_activePieceEl.remove();
      peacemakers_activePieceEl = null;
      peacemakersStartNextPiece();
    }
  }
}

function peacemakersOnLeave() {
  for (const t of peacemakers_timers) {
    clearTimeout(t);
  }
  peacemakers_timers = [];
  peacemakers_phase = 'idle';
  peacemakers_activePieceEl = null;
  peacemakers_reading = null;
  peacemakers_joined = [];
  peacemakers_globeStartedAt = 0;
}

registerScene(8, {
  markup: peacemakers,
  floaters: false,
  fxCanvas: true,
  // Speech bubble anchors. core/speech.js positions each bubble AT its anchor
  // (it sets inline left and top from these values), so these are the bubble
  // boxes themselves, not the figures' heads. The four sit in a 2 by 2 block
  // over the world art, below the title copy and clear of the hold zone:
  // each box is at most 200 by 92, so the block spans x 300 to 710 and y 320
  // to 522. The title copy ends near y 302, the hold zone starts at x 900,
  // and the art runs to y 616, so nothing collides. An earlier round tried to
  // reposition these from CSS with .speech-bubble:nth-of-type(n); that never
  // matched, because mountSpeech appends the bubbles after the scene's other
  // div children so their type indices are not 1 to 4, which left every
  // bubble sitting on a figure's head and bubble four overlapping the hold
  // zone. Position them here instead, where the scene owns the data.
  speakers: [
    { x: 300, y: 320 },
    { x: 300, y: 430 },
    { x: 510, y: 430 },
    { x: 510, y: 320 }
  ],
  mount: peacemakersMount,
  prime: peacemakersPrime,
  tickAge: peacemakersTickAge,
  onLeave: peacemakersOnLeave
});
