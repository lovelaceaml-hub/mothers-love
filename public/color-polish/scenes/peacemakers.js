// Scene 8: We Are Peacemakers, the puzzle world.
'use strict';

const PEACEMAKERS_TOTAL_SLOTS = 24;
const PEACEMAKERS_LATITUDES = [-42, -14, 14, 42];
const PEACEMAKERS_LONGITUDES = [0, 60, 120, 180, 240, 300];
const PEACEMAKERS_GLOBE_RADIUS = 242;

let peacemakers_root = null;
let peacemakers_activePieceEl = null;
let peacemakers_activeRecord = null;
let peacemakers_phase = 'idle';
let peacemakers_phaseAge = 0;
let peacemakers_holdDuration = 3;
let peacemakers_joined = [];
let peacemakers_nextSlot = 0;
let peacemakers_targetSlot = 0;
let peacemakers_shownIds = [];
let peacemakers_totalJoins = 0;
let peacemakers_timers = [];

function peacemakers() {
  return `<div style="position:absolute;left:12px;top:33px;width:829px">` +
    `<div class="eyebrow">Mother’s Love in our community</div>` +
    `<h1 style="font-size:71px;letter-spacing:-2.2px;line-height:1.02;margin:22px 0">We Are<br>${shimmer('Peace')}<span class="violet">makers</span></h1>` +
    `<p class="subheading" style="font-size:26px">Recognize the kindness<br>you see around you.</p>` +
    `</div>` +
    `${art('globe', 'left:271px;top:134px;width:604px;height:482px')}` +
    `<div class="globe-light"></div>` +
    `<div class="peacemakers-hold-zone" id="peacemakers-hold-zone"></div>` +
    `<div class="peacemakers-globe-stage" id="peacemakers-globe-stage">` +
    `<div class="peacemakers-globe-sphere" id="peacemakers-globe-sphere"></div>` +
    `</div>`;
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

function peacemakersBuildCard(r, isFaceOn) {
  const card = document.createElement('div');
  const exprId = (r.ids && r.ids[0]) || 1;
  const expr = catalog[exprId - 1] || catalog[0];
  const color = expr.color || '#FFD05F';

  if (isFaceOn) {
    card.className = 'puzzle-card face-on held-card';
    card.id = 'peacemakers-held-card';
    card.dataset.recordId = r.id;
    card.style.setProperty('--tint', color);

    card.innerHTML =
      `<div class="puzzle-card-inner">` +
      `<div class="puzzle-card-header">` +
      `<div class="puzzle-badge" style="--tint:${color}">${icon(exprId)}</div>` +
      `<div class="puzzle-recipient-block">` +
      `<div class="puzzle-thanks">THANK YOU,</div>` +
      `<h3 class="puzzle-recipient">${esc(r.name)}</h3>` +
      `</div>` +
      `</div>` +
      `<p class="puzzle-message" data-full-message="${esc(r.id)}">${esc(r.message)}</p>` +
      chips(r.ids) +
      reactionMarkup(r) +
      `</div>`;
  } else {
    card.className = 'globe-card joined-card';
    card.dataset.recordId = r.id;
    card.style.setProperty('--tint', color);

    card.innerHTML =
      `<div class="globe-card-inner">` +
      `<div class="globe-badge" style="--tint:${color}">${icon(exprId)}</div>` +
      `<div class="globe-recipient">${esc(r.name)}</div>` +
      `<p class="puzzle-message" style="display:none" data-full-message="${esc(r.id)}">${esc(r.message)}</p>` +
      `</div>`;
  }
  return card;
}

function peacemakersJoinCard(r, slotIndex) {
  const sphere = document.getElementById('peacemakers-globe-sphere');
  if (!sphere) return;

  if (peacemakers_joined.length >= PEACEMAKERS_TOTAL_SLOTS) {
    const oldest = peacemakers_joined.shift();
    if (oldest && oldest.el) {
      oldest.el.classList.add('dissolving');
      const elToRemove = oldest.el;
      const removeTimer = setTimeout(() => {
        elToRemove.remove();
      }, 500);
      peacemakers_timers.push(removeTimer);
    }
  }

  let slotEl = sphere.querySelector(`.globe-slot[data-slot-index="${slotIndex}"]`);
  if (!slotEl) {
    slotEl = peacemakersCreateSlotElement(slotIndex);
    sphere.appendChild(slotEl);
  } else {
    slotEl.replaceChildren();
  }

  const card = peacemakersBuildCard(r, false);
  slotEl.appendChild(card);

  peacemakers_totalJoins++;
  peacemakers_joined.push({
    id: r.id,
    record: r,
    slotIndex,
    el: slotEl
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

  peacemakers_activeRecord = r;
  peacemakers_holdDuration = 3 + r.message.length / 40;
  peacemakers_phase = 'detaching';
  peacemakers_phaseAge = 0;

  holdZone.replaceChildren();

  const card = peacemakersBuildCard(r, true);
  card.classList.add('flying');
  card.style.left = '730px';
  card.style.top = '250px';
  card.style.width = '96px';
  card.style.height = '96px';
  card.style.opacity = '0.8';

  holdZone.appendChild(card);
  peacemakers_activePieceEl = card;
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
    const heldCard = peacemakersBuildCard(heldRec, true);
    holdZone.appendChild(heldCard);
    peacemakers_activePieceEl = heldCard;
  }

  for (let i = 0; i < 8; i++) {
    const rec = pool[(i + 1) % pool.length] || pool[0] || heldRec;
    if (rec) peacemakersJoinCard(rec, i);
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
    const curX = lerp(730, 750, eased);
    const curY = lerp(250, 168, eased);
    const curW = lerp(96, 300, eased);
    const curH = lerp(96, 300, eased);
    const curOp = lerp(0.8, 1.0, eased);

    peacemakers_activePieceEl.style.left = curX.toFixed(1) + 'px';
    peacemakers_activePieceEl.style.top = curY.toFixed(1) + 'px';
    peacemakers_activePieceEl.style.width = curW.toFixed(1) + 'px';
    peacemakers_activePieceEl.style.height = curH.toFixed(1) + 'px';
    peacemakers_activePieceEl.style.opacity = curOp.toFixed(3);

    if (p >= 1) {
      peacemakers_phase = 'holding';
      peacemakers_phaseAge = 0;
      peacemakers_activePieceEl.classList.remove('flying');
      peacemakers_activePieceEl.style.left = '750px';
      peacemakers_activePieceEl.style.top = '168px';
      peacemakers_activePieceEl.style.width = '300px';
      peacemakers_activePieceEl.style.height = '300px';
      peacemakers_activePieceEl.style.opacity = '1';
    }
  } else if (peacemakers_phase === 'holding') {
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
    const targetX = 1400 + PEACEMAKERS_GLOBE_RADIUS * Math.cos(latRad) * Math.sin(lonRad) - 48;
    const targetY = 318 - PEACEMAKERS_GLOBE_RADIUS * Math.sin(latRad) - 48;

    const curX = lerp(750, targetX, eased);
    const curY = lerp(168, targetY, eased);
    const curW = lerp(300, 96, eased);
    const curH = lerp(300, 96, eased);
    const curOp = lerp(1.0, 0.85, eased);

    peacemakers_activePieceEl.style.left = curX.toFixed(1) + 'px';
    peacemakers_activePieceEl.style.top = curY.toFixed(1) + 'px';
    peacemakers_activePieceEl.style.width = curW.toFixed(1) + 'px';
    peacemakers_activePieceEl.style.height = curH.toFixed(1) + 'px';
    peacemakers_activePieceEl.style.opacity = curOp.toFixed(3);

    if (p >= 1) {
      peacemakersJoinCard(peacemakers_activeRecord, peacemakers_targetSlot);
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
  peacemakers_joined = [];
}

function peacemakersKeepOut() {
  return [
    { x: 12, y: 33, w: 829, h: 260 },
    { x: 271, y: 134, w: 604, h: 482 }
  ];
}

registerScene(8, {
  markup: peacemakers,
  floaters: false,
  fxCanvas: true,
  keepOut: peacemakersKeepOut,
  speakers: [
    { x: 394, y: 375 },
    { x: 504, y: 410 },
    { x: 626, y: 412 },
    { x: 753, y: 343 }
  ],
  mount: peacemakersMount,
  prime: peacemakersPrime,
  tickAge: peacemakersTickAge,
  onLeave: peacemakersOnLeave
});
