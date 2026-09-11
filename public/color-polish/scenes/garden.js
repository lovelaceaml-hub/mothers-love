// Scene 2: Recognition Garden.
'use strict';

function garden(){
 let h=heading('Recognition Garden','Appreciation, all around us.');
 const chosen=[];for(let i=0;i<Math.min(5,records().length);i++){const r=choose(chosen.map(a=>a.id));if(r)chosen.push(r)}
 if(!chosen.length)return h+emptyPanel();
 const long=chosen.find(r=>!smallFits(r));
 const ps=long?[[18,88,508],[597,96,284],[927,286,294],[1266,83,285],[1497,332,278]]:[[29,141,304],[389,307,299],[751,96,303],[1121,297,302],[1462,128,300]];
 if(long)chosen.sort((a,b)=>a.id===long.id?-1:b.id===long.id?1:0);
 h+='<canvas class="garden-canvas" id="living-garden" width="1812" height="636" aria-hidden="true"></canvas>';
 h+=chosen.map((r,i)=>addOrb(r,...ps[i])).join('');
 return h+'<div class="garden-caption">Every expression of Mother’s Love helps the garden grow.</div>';
}

function mountGarden(){
 const rng=randSeed(89001);V.garden={canvas:$('living-garden'),plants:[],pending:[],glows:[]};
 for(let i=0;i<28;i++)V.garden.plants.push({x:20+i*66+(rng()-.5)*35,y:617+rng()*15,height:20+rng()*35,phase:rng()*TAU,born:-20,color:['#edc66e','#e1acae','#d6bdcf','#f7e6ab'][i%4],leaves:rng()>.3});
 drawGarden();
}

function gardenGlow(x,born){V.garden?.glows.push({x,born})}

function plant(c,p,t){
 let grow=p.born<0?1:outCubic((t-p.born)/2.9);if(grow<=0)return;
 let sway=Math.sin(t*.62+p.phase)*3.8+Math.sin(t*.27+p.phase*2)*1.8;
 c.save();c.translate(p.x,p.y);c.scale(grow,grow);
 c.strokeStyle='#8caa7787';c.lineWidth=2.3;c.lineCap='round';c.beginPath();c.moveTo(0,0);c.bezierCurveTo(4,-p.height*.3,-5+sway,-p.height*.62,sway,-p.height);c.stroke();
 if(p.leaves)for(let side of [-1,1]){c.save();c.translate(sway*.3,-p.height*.4);c.rotate(side*.52+sway*.02);c.fillStyle=side<0?'#a3bc80ab':'#b8c58b9c';c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(side*25,-26,side*28,-20);c.quadraticCurveTo(side*20,5,0,0);c.fill();c.restore()}
 c.translate(sway,-p.height);c.rotate(sway*.04);
 const bloom=smooth((grow-.38)/.62);c.scale(bloom,bloom);
 for(let k=0;k<6;k++){c.save();c.rotate(k*TAU/6);const g=c.createLinearGradient(0,0,0,-22);g.addColorStop(0,p.color);g.addColorStop(1,'#fff8e8');c.fillStyle=g;c.beginPath();c.ellipse(0,-9,6.5,12,Math.sin(t*.4+p.phase+k)*.08,0,TAU);c.fill();c.restore()}
 c.fillStyle='#d8ad50';c.beginPath();c.arc(0,0,4.2,0,TAU);c.fill();c.restore();
}

function drawGarden(){
 const g=V.garden;if(!g)return;const c=g.canvas.getContext('2d'),t=V.clock;c.clearRect(0,0,1812,636);
 const wash=c.createLinearGradient(0,490,0,636);wash.addColorStop(0,'#cbdcaa00');wash.addColorStop(1,'#c1d19b43');c.fillStyle=wash;c.fillRect(0,490,1812,146);
 g.pending=g.pending.filter(p=>{if(t>=p.born){g.plants.push({x:p.x,y:628,height:53+(g.plants.length%4)*13,phase:g.plants.length*2.4,born:t,color:p.color,leaves:true});if(g.plants.length>72)g.plants.splice(0,1);log('garden_flower_grown',{flowers:g.plants.length});return false}return true});
 g.plants.forEach(p=>plant(c,p,t));
 for(const glow of g.glows){const age=t-glow.born;if(age>3)continue;const r=80*smooth(age/2)+15,grad=c.createRadialGradient(glow.x,625,0,glow.x,625,r);grad.addColorStop(0,`rgba(234,199,107,${Math.sin(Math.PI*age/3)*.65})`);grad.addColorStop(1,'#ffe7a900');c.fillStyle=grad;c.fillRect(glow.x-r,625-r,2*r,2*r)}
 g.glows=g.glows.filter(a=>t-a.born<3);
 for(const a of V.actors)if(a.life==='sprout'){
  const age=t-a.lifeAt,q=smooth(age/2.65);c.save();c.strokeStyle=`rgba(168,190,124,${.7*(1-q)})`;c.lineWidth=4;c.beginPath();c.moveTo(a.originX,633);c.bezierCurveTo(a.originX-25,570,a.screenX+15,a.screenY+90,a.screenX,a.screenY);c.stroke();c.restore();
 }
}

function gardenReplace(){
 const ready=V.actors.filter(a=>a.life==='steady'&&V.clock-a.born>=Math.max(13,a.minRead||0)).sort((a,b)=>a.born-b.born||a.serial-b.serial);
 if(ready.length&&replaceActor(ready[0],'petals'))log('garden_replacement',{scene:2,index:++V.serial,active:V.actors.length});
 V.next+=7;
}

registerScene(2,{
 markup:garden,
 mount:mountGarden,
 draw:drawGarden,
 floaters:true,
 fxCanvas:true,
 topMargin:87,
 replaceEvery:14,
 replaceMode:'garden',
 entrance:'sprout',
 burst:'petals',
 keepOut:()=>[{x:0,y:0,w:1812,h:78}],
 onRetire(a){
  const x=clamp(a.x+(a.rng()-.5)*190,50,1762);
  V.garden.pending.push({x,born:V.clock+2.15,color:catalog[S.pool.find(r=>r.id===a.id).ids[0]-1].color});
  V.fx.push({kind:'return',x:a.x,y:a.y,tx:x,ty:603,start:V.clock,life:2.2,color:'#e3b95c'});
 }
});
