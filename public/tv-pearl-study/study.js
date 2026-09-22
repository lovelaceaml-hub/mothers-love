'use strict';

// This document is a sample-only decorator of the existing TV renderer.
// The regular /color-polish/renderer.html never loads this file.
const studyApplySnapshot = applySnapshotPayload;
applySnapshotPayload = function(snapshot, control = {}) {
  if (control.source !== 'sample') {
    studyApplySnapshot(null, { ...control, status: 'unavailable' });
    return;
  }
  studyApplySnapshot(snapshot, control);
};

function studyJewels(r, d) {
  const medallions = r.ids.map((id, i) => `<span class="study-symbol" style="--angle:${-48 + i * 133}deg" aria-hidden="true">${icon(id)}</span>`).join('');
  const beads = Array.from({ length: 9 }, (_, i) => `<i class="study-bead" style="--angle:${i * 40 + 16}deg" aria-hidden="true"></i>`).join('');
  return `<div class="study-jewels" style="--diameter:${d}px" aria-hidden="true"><svg class="study-orbit-lines" viewBox="0 0 1000 1000"><ellipse cx="500" cy="500" rx="465" ry="355" transform="rotate(-28 500 500)"/><ellipse cx="500" cy="500" rx="445" ry="390" transform="rotate(43 500 500)"/><circle cx="500" cy="500" r="382"/></svg>${medallions}${beads}</div>`;
}
const studyCompleteOrb = completeOrb;
completeOrb = function(r, d, opts = {}) {
  return studyCompleteOrb(r, d, opts).replace('THANK YOU,', 'Thank you,').replace('<article class="orb ', `${studyJewels(r,d)}<article class="orb `);
};

// Keep the existing floater clock, pagination and replacement lifecycle.
SCENES[2].markup = function() {
  const pool = records();
  if (!pool.length) return emptyPanel();
  const chosen = pool.slice(0, 3);
  const pos = [[586, -3, 640], [72, 159, 354], [1386, 114, 354]];
  return `<div class="study-scene-caption"><div>RECOGNITION GARDEN</div><h1>A garden of gratitude.</h1><p>Appreciation, all around us.</p></div>` + drawSlots(chosen, pos, { readerBounds: { maxW:1812,maxH:700 } });
};
SCENES[2].mount = function() {};
SCENES[2].draw = null;
SCENES[2].onRetire = null;
SCENES[2].fxCanvas = false;
SCENES[2].replaceEvery = 50;
SCENES[2].replaceMode = 'drift';
SCENES[2].integrate = function(a) {
  if (a.life !== 'steady') return false;
  a.x = a.homeX + (S.still ? 0 : Math.sin(V.clock*.14+a.phase)*4);
  a.y = a.homeY + (S.still ? 0 : Math.cos(V.clock*.17+a.phase)*5);
  a.z = 0;
  return true;
};
SCENES[2].place = function(a) {
  if (!a.el) return;
  a.el.style.transform = `translate(${a.screenX-a.d/2}px,${a.screenY-a.d/2}px) scale(${a.screenScale})`;
  a.el.style.left = '0'; a.el.style.top = '0';
  a.el.style.opacity = String(a.opacity);
  a.el.style.filter = 'none';
  a.el.style.zIndex = a.d >= 500 ? '120' : '100';
  return true;
};
const studyRenderFloaters = renderFloaters;
renderFloaters = function() {
  studyRenderFloaters();
  $('tv').style.setProperty('--study-orbit', `${S.still ? 0 : S.t*.7}deg`);
};

// Recompose one arrival with the same director and its authoritative hold.
ARRIVAL_SINGLE.x = 906;
ARRIVAL_SINGLE.y = 442;
ARRIVAL_SINGLE.layout = 580;
ARRIVAL_SINGLE.drawn = 680;
const studyBuildEvent = buildEvent;
buildEvent = function() {
  studyBuildEvent();
  if (!active || active.kind !== 'single') return;
  const bloom = document.createElement('div');
  bloom.className = 'study-lotus'; bloom.setAttribute('aria-hidden','true');
  bloom.innerHTML = Array.from({length:9},(_,i)=>`<i style="--petal-angle:${(i-4)*17}deg;--petal-delay:${i*.055}s"></i>`).join('') + '<span></span>';
  $('event').append(bloom);
  $('event').querySelector('.event-title').innerHTML = '<div class="eyebrow">A NEW RECOGNITION</div><h2>Kindness<br>in bloom.</h2>';
};
const studyArrivalTick = arrivalStageTick;
arrivalStageTick = function(a) {
  studyArrivalTick(a);
  const lotus = $('event')?.querySelector('.study-lotus');
  if (lotus) {
    const t = S.still ? 1 : Math.min(1, Math.max(0,(S.t-a.fx.at)/2.7));
    lotus.style.setProperty('--opening',String(t));
    lotus.style.opacity = a.phase==='exit' ? String(1-clamp((S.t-a.phaseAt)/a.exit,0,1)) : '1';
  }
};
