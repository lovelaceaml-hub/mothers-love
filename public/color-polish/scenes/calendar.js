// Scene 5: Recognition Calendar.
'use strict';

const CALENDAR_SPARKLE_COLORS = ['#D8B452', '#ffffff', '#C98F41'];

function calendarScene(){const month=monthKey(S.month),d=`${month}-${String(S.selectedDay).padStart(2,'0')}`,label=monthLabel(S.month),selectedLabel=fullDateLabel(S.month,S.selectedDay),offset=(()=>{const parts=month.split('-').map(Number);return parts.length===2?new Date(Date.UTC(parts[0],parts[1]-1,1)).getUTCDay():0})();let h=heading('Recognition Calendar','Every day, a little love.');h+=`<div class="calendar-info panel"><div class="selected-date">${selectedLabel}${S.selectedDay===selectedDayFor(S.nowMs)?' · Today':''}</div><div class="metric-value">${num('d:'+d+':rec')}</div><div class="metric-title">Recognitions shared</div><div class="calendar-expressions">${catalog.map(e=>`<div class="calendar-expression">${icon(e.id)}<b>${num('d:'+d+':'+e.id)}</b><span>${esc(e.name)}</span></div>`).join('')}</div><div class="rule">Original submission date · Cleared recognitions only.<br>${S.selectedDay<3?'Historical aggregate only; no expired names are retrieved.':'A recognition can celebrate more than one expression.'}</div></div><div class="calendar-month panel"><div class="calendar-top"><h2>${label}</h2><span>Original submission date</span></div><div class="calendar-days">${['SUN','MON','TUE','WED','THU','FRI','SAT'].map(x=>`<div class="dayname">${x}</div>`).join('')}${Array.from({length:offset},()=>'<div class="day blank"></div>').join('')}`;
 for(let day=1;day<=daysInMonth(S.month);day++){const key=`${month}-${String(day).padStart(2,'0')}`,future=day>S.selectedDay;h+=`<button class="day ${day===S.selectedDay?'today':''} ${future?'future':''}" ${future?'disabled':''} data-day="${day}" aria-label="${label} ${day}"><span>${day}</span>${future?'':`<b>${num('d:'+key+':rec')}</b>`}</button>`}return h+`</div><div class="calendar-rule"><span>Sunday-Saturday · original submission dates</span><span>Future dates have no counts</span></div></div>`}

function selectDay(day){const value=Math.floor(Number(day));if(!Number.isSafeInteger(value)||value<1||value>S.selectedDay)return;S.selectedDay=value;renderNow(5,{keepAge:true})}

function calendarCacheCells(root){
 const rootRect = root.getBoundingClientRect();
 const scale = rootRect.width > 0 ? (rootRect.width / 1812) : 1;
 const cells = [];
 const month = monthKey(S.month);
 root.querySelectorAll('.day.past, .day.today').forEach(el=>{
  const day = el.dataset.day;
  const key = `${month}-${String(day).padStart(2,'0')}`;
  const count = numberValue('d:' + key + ':rec');
  if(count > 0){
   const rect = el.getBoundingClientRect();
   cells.push({
    x: rootRect.width > 0 ? (rect.left - rootRect.left + rect.width / 2) / scale : 800,
    y: rootRect.height > 0 ? (rect.top - rootRect.top + rect.height / 2) / scale : 300
   });
  }
 });
 if(cells.length === 0){
  root.querySelectorAll('.day.past, .day.today').forEach(el=>{
   const rect = el.getBoundingClientRect();
   cells.push({
    x: rootRect.width > 0 ? (rect.left - rootRect.left + rect.width / 2) / scale : 800,
    y: rootRect.height > 0 ? (rect.top - rootRect.top + rect.height / 2) / scale : 300
   });
  });
 }
 V.calendarCells = cells;
 const monthPanel = root.querySelector('.calendar-month');
 if(monthPanel && rootRect.width > 0){
  const mRect = monthPanel.getBoundingClientRect();
  V.calendarMonthRect = {
   x: (mRect.left - rootRect.left) / scale,
   y: (mRect.top - rootRect.top) / scale,
   w: mRect.width / scale,
   h: mRect.height / scale
  };
 } else {
  V.calendarMonthRect = { x: 535, y: 17, w: 1277, h: 605 };
 }
}

function calendarTick(dt){
 if(!V.calendarCanvas) return;
 const ctx = V.calendarCanvas.getContext('2d');
 if(!ctx) return;
 ctx.clearRect(0, 0, 1812, 636);
 if(S.still || ['offline', 'neutral', 'empty'].includes(S.mode)) return;

 if((!V.calendarCells || V.calendarCells.length === 0) && V.root) calendarCacheCells(V.root);

 V.calendarTimer = (V.calendarTimer || 0) + dt;
 V.calendarSweepTimer = (V.calendarSweepTimer || 0) + dt;
 if(!V.calendarFx) V.calendarFx = [];

 while(V.calendarTimer >= 0.35){
  V.calendarTimer -= 0.35;
  if(V.calendarFx.length < 60 && V.calendarCells && V.calendarCells.length > 0){
   const cell = V.calendarCells[Math.floor(Math.random() * V.calendarCells.length)];
   V.calendarFx.push({
    x0: cell.x + (Math.random() - 0.5) * 36,
    y0: cell.y + (Math.random() - 0.5) * 24,
    rise: 60 + Math.random() * 60,
    duration: 2.2 + Math.random() * 0.8,
    age: 0,
    radius: 1.4 + Math.random() * 1.6,
    color: CALENDAR_SPARKLE_COLORS[Math.floor(Math.random() * CALENDAR_SPARKLE_COLORS.length)],
    phase: Math.random() * Math.PI * 2,
    sway: 6 + Math.random() * 8,
    freq: 1.5 + Math.random() * 1.5
   });
  }
 }

 for(const p of V.calendarFx){
  p.age += dt;
 }
 V.calendarFx = V.calendarFx.filter(p => p.age < p.duration);

 const sweepCycle = V.calendarSweepTimer % 14;
 if(sweepCycle < 2.4 && V.calendarMonthRect){
  const m = V.calendarMonthRect;
  const t = sweepCycle / 2.4;
  const angle = Math.PI / 4;
  const nx = Math.cos(angle);
  const ny = Math.sin(angle);
  const p0 = m.x * nx + m.y * ny;
  const p1 = (m.x + m.w) * nx + (m.y + m.h) * ny;
  const pCenter = (p0 - 80) + t * ((p1 + 80) - (p0 - 80));
  ctx.save();
  ctx.beginPath();
  ctx.rect(m.x, m.y, m.w, m.h);
  ctx.clip();
  const grad = ctx.createLinearGradient((pCenter - 60) * nx, (pCenter - 60) * ny, (pCenter + 60) * nx, (pCenter + 60) * ny);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.12)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(m.x, m.y, m.w, m.h);
  ctx.restore();
 }

 for(const p of V.calendarFx){
  const progress = p.age / p.duration;
  const opacity = Math.sin(progress * Math.PI);
  const x = p.x0 + Math.sin(progress * Math.PI * 2 * p.freq + p.phase) * p.sway;
  const y = p.y0 - p.rise * progress;
  drawSpark(ctx, x, y, p.radius, opacity, p.color);
 }
}

registerScene(5,{
 markup:calendarScene,
 archOpacity:'.13',
 mount(root){
  root.querySelectorAll('.day:not(.future):not(.blank)').forEach(el=>{const day=+el.querySelector('span')?.textContent;if(day<S.selectedDay)el.classList.add('past');el.style.setProperty('--day-delay',`${-day*1.93}s`);el.style.setProperty('--day-index',String(day))});
  root.querySelectorAll('.calendar-expression').forEach((el,i)=>el.style.setProperty('--expr-index',String(i)));
  const canvas = document.createElement('canvas');
  canvas.className = 'calendar-fx';
  canvas.width = 1812;
  canvas.height = 636;
  canvas.setAttribute('aria-hidden', 'true');
  root.append(canvas);
  V.calendarCanvas = canvas;
  V.calendarFx = [];
  V.calendarTimer = 0.35;
  V.calendarSweepTimer = 0;
  calendarCacheCells(root);
  if(S.still){
   const ctx = canvas.getContext('2d');
   ctx?.clearRect(0, 0, 1812, 636);
  }
  root.addEventListener('click',e=>{const b=e.target.closest('.day[data-day]');if(b&&!b.disabled)selectDay(+b.dataset.day)});
 },
 tick(dt){
  calendarTick(dt);
 }
});

