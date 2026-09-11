// Scene 5: Recognition Calendar.
'use strict';

function calendarScene(){const month=monthKey(S.month),d=`${month}-${String(S.selectedDay).padStart(2,'0')}`,label=monthLabel(S.month),selectedLabel=fullDateLabel(S.month,S.selectedDay),offset=(()=>{const parts=month.split('-').map(Number);return parts.length===2?new Date(Date.UTC(parts[0],parts[1]-1,1)).getUTCDay():0})();let h=heading('Recognition Calendar','Every day, a little love.');h+=`<div class="calendar-info panel"><div class="selected-date">${selectedLabel}${S.selectedDay===selectedDayFor(S.nowMs)?' · Today':''}</div><div class="metric-value">${num('d:'+d+':rec')}</div><div class="metric-title">Recognitions shared</div><div class="calendar-expressions">${catalog.map(e=>`<div class="calendar-expression">${icon(e.id)}<b>${num('d:'+d+':'+e.id)}</b><span>${esc(e.name)}</span></div>`).join('')}</div><div class="rule">Original submission date · Cleared recognitions only.<br>${S.selectedDay<3?'Historical aggregate only; no expired names are retrieved.':'A recognition can celebrate more than one expression.'}</div></div><div class="calendar-month panel"><div class="calendar-top"><h2>${label}</h2><span>Original submission date</span></div><div class="calendar-days">${['SUN','MON','TUE','WED','THU','FRI','SAT'].map(x=>`<div class="dayname">${x}</div>`).join('')}${Array.from({length:offset},()=>'<div class="day blank"></div>').join('')}`;
 for(let day=1;day<=daysInMonth(S.month);day++){const key=`${month}-${String(day).padStart(2,'0')}`,future=day>S.selectedDay;h+=`<button class="day ${day===S.selectedDay?'today':''} ${future?'future':''}" ${future?'disabled':''} data-day="${day}" aria-label="${label} ${day}"><span>${day}</span>${future?'':`<b>${num('d:'+key+':rec')}</b>`}</button>`}return h+`</div><div class="calendar-rule"><span>Sunday-Saturday · original submission dates</span><span>Future dates have no counts</span></div></div>`}

function selectDay(day){const value=Math.floor(Number(day));if(!Number.isSafeInteger(value)||value<1||value>S.selectedDay)return;S.selectedDay=value;renderNow(5,{keepAge:true})}

registerScene(5,{
 markup:calendarScene,
 archOpacity:'.13',
 mount(root){
  root.querySelectorAll('.day:not(.future):not(.blank)').forEach(el=>{const day=+el.querySelector('span')?.textContent;if(day<S.selectedDay)el.classList.add('past');el.style.setProperty('--day-delay',`${-day*1.93}s`)});
  root.addEventListener('click',e=>{const b=e.target.closest('.day[data-day]');if(b&&!b.disabled)selectDay(+b.dataset.day)});
 }
});
