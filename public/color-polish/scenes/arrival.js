// Scene 3: Recognition Arrival.
'use strict';

const SINGLE_STYLES=['Through the light','Comet sweep','A thousand kind sparks','Pearl spring','Spiral bloom','Petals into pearl'];
const GROUP_STYLES=['Cascading constellation','Two tides, one wave','Spiral constellation','Petal fountains','Ripple of kindness'];
const GROUP_TITLES=['A new wave of Mother’s Love.','Kindness is being shared.','A constellation of kind words.','A garden of appreciation blooms.','Ten expressions. One shared moment.'];

function arrivalScene(){
 const r=records()[0];return r?`<div class="scene-copy" style="position:absolute;left:32px;top:78px;width:510px"><div class="eyebrow">Recognition arrival</div><h1 style="font-size:57px;line-height:1.1;margin:24px 0">A little kindness,<br>${shimmer('a moment for you.')}</h1><p class="subheading">Six individual entrances.<br>Five choreographed waves of ten.</p></div>${addOrb(r,943,49,534,{motion:false})}`:emptyPanel();
}

function singleTrajectory(style,p){
 const tx=1070,ty=310;let x=tx,y=ty,z=0,scale=1,alpha=1;
 const q=outCubic(p);
 switch(style){
 case 0: // Through a luminous portal: approach, forward overshoot, settle.
  z=-1550*Math.pow(1-p,2.7)+Math.sin(Math.PI*p)*180;
  x=tx+170*(1-q);y=ty-65*(1-q);alpha=smooth(p/.18);break;
 case 1: // Comet with a sweeping volumetric flight path.
  x=curve(-390,80,1830,tx,q);y=curve(530,-285,5,ty,q);z=curve(-460,340,540,0,q);alpha=smooth(p/.1);break;
 case 2: // Particle aggregation: the shell resolves where sparks converge.
  x=tx;y=ty;z=-150*(1-q);scale=.68+.32*smooth((p-.24)/.62);alpha=smooth((p-.33)/.23);break;
 case 3: // A pearl drops through depth; two diminishing rebounds.
  if(p<.46){const s=p/.46;x=tx+170*(1-s);y=-670+1020*s*s;z=450*(1-s)}
  else{const s=(p-.46)/.54;x=tx;y=ty-Math.abs(Math.sin(s*Math.PI*2.1))*145*(1-s);z=100*Math.sin(s*Math.PI)*(1-s)}
  alpha=smooth(p/.13);break;
 case 4: // Loose corkscrew: wrap around the destination through depth.
  {const r=630*Math.pow(1-p,1.4),theta=-p*Math.PI*3.4;x=tx+Math.cos(theta)*r;y=ty+Math.sin(theta)*r*.48;z=-360*(1-p)+Math.sin(theta)*r*.85;alpha=smooth(p/.14)}break;
 case 5: // Bloom shell opens; pearl rises from the flower's center.
  x=tx+Math.sin(p*Math.PI)*35;y=ty+160*(1-q);z=-290*(1-q);scale=.16+.84*smooth(p/.76);alpha=smooth((p-.08)/.21);break;
 }
 const perspective=1300/(1300-z);return{x:tx+(x-tx)*perspective,y:ty+(y-ty)*perspective,z,k:perspective*scale,alpha};
}

function groupTrajectory(style,index,p,b){
 const orders=[[0,4,7,1,8,2,6,3,5,9],[0,9,1,8,2,7,3,6,4,5],[4,0,9,5,3,1,8,6,2,7],[0,5,2,7,4,9,1,3,6,8],[2,7,1,3,6,8,0,4,5,9]];
 const rank=orders[style].indexOf(index),delay=rank*(style===3?.034:.032),duration=style===3?.69:.71;
 const u=clamp((p-delay)/duration,0,1),q=outCubic(u),tx=b.x,ty=b.y;
 let x=tx,y=ty,z=0,scale=1,alpha=smooth(u/.14);
 if(p<delay)return{x:tx,y:ty,z:-1000,k:.05,alpha:0};
 switch(style){
 case 0:
  x=mix(906+(index%3-1)*150,tx,q);y=mix(80-index%2*160,ty,q);z=-1450*Math.pow(1-u,2.5)+Math.sin(Math.PI*u)*70;break;
 case 1:
  {const left=rank%2===0;x=curve(left?-350:2162,left?240:1572,tx+(left?170:-170),tx,q);y=curve(170+(rank%3)*125,-160+index*45,ty+75,ty,q);z=Math.sin(Math.PI*u)*340-350*(1-u)}break;
 case 2:
  {const angle=index*2.4+(1-q)*Math.PI*3,rad=(1-q)*570;x=mix(906,tx,q)+Math.cos(angle)*rad;y=mix(315,ty,q)+Math.sin(angle)*rad*.33;z=Math.sin(angle)*rad*.8-400*(1-q)}break;
 case 3:
  {const source=[300,906,1512][index%3];x=mix(source,tx,q);y=curve(940,-300,ty-130,ty,q);z=curve(-400,280,170,0,q);scale=.22+.78*q}break;
 case 4:
  {const source=[430,906,1382][index%3];x=mix(source,tx,q);y=mix(300,ty,q)+Math.sin(Math.PI*u)*(index<5?-65:65);z=-680*(1-q)+Math.sin(Math.PI*u)*190;scale=.15+.85*smooth(u/.65);alpha=smooth((u-.06)/.18)}break;
 }
 const k=1100/(1100-z)*scale;
 return{x:906+(x-906)*(1100/(1100-z)),y:307+(y-307)*(1100/(1100-z)),z,k,alpha};
}

registerScene(3,{
 markup:arrivalScene,
 floaters:true,
 fxCanvas:true,
 pace:0,
 replaceMode:null
});
