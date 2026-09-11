// Scene 6: Participation Status.
'use strict';

function statusScene(){return `${heading('Participation Status','Mother’s Love, recognized.')}<div class="stat-top panel"><div><div class="metric-title">Expressions of Mother’s Love<br>Recognized This Month</div><div style="font-size:16px;color:#97937e;margin-top:13px">${monthLabel(S.month)}</div></div><div class="metric-value" style="padding:0 28px;border-right:1px solid #ded7c8">${num('month:expr')}</div><div><div class="metric-value" style="font-size:58px">${num('month:rec')}</div><div class="metric-title" style="font-size:20px;margin-top:9px">Recognitions shared<br>this month</div></div><div style="flex:1"></div>${art('puzzle','position:relative;width:133px;height:125px;margin-right:25px')}</div><div class="expression-stats">${catalog.map(e=>`<div class="stat-expression panel">${medallion(e.id)}<div><h3>${esc(e.name)}</h3><b>${num('month:'+e.id)}</b></div></div>`).join('')}</div><div class="periods">${[['today','Today'],['all','Overall']].map(([k,t])=>`<div class="period panel"><div><h3>${t}</h3><b>${num(k+':rec')}</b><small>Recognitions</small></div><div style="text-align:right"><h3>&nbsp;</h3><b>${num(k+':expr')}</b><small>Expressions</small></div></div>`).join('')}</div><div class="body-note">All nine expressions · same period · equal appreciation</div>`}

function mountStatus(){
 V.status=[...sceneRoot.querySelectorAll('.stat-expression .medallion img')].map((el,i)=>({el,phase:i*2.399,rate:.4+i*.037,amplitude:2.2+i%3}));
}

function tickStatus(dt){V.status.forEach((a,i)=>{let t=V.clock,breath=Math.sin(t*a.rate+a.phase),tilt=Math.sin(t*.29+a.phase*2)*4.5;a.el.style.transform=`translate(${Math.sin(t*.19+a.phase)*2}px,${breath*a.amplitude}px) rotate(${tilt}deg) scale(${1+Math.sin(t*.21+a.phase)*.018})`;a.el.parentElement.style.boxShadow=`inset 3px 5px 9px #fff,inset -6px -8px 14px #ae95512b,0 6px 17px rgba(213,188,121,${.1+.1*(breath+1)/2})`})}

registerScene(6,{
 markup:statusScene,
 mount:mountStatus,
 tick:tickStatus,
 archOpacity:'.13'
});
