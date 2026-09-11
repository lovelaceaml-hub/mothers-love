// Scene 9: Peace in Practice.
'use strict';

function peaceScene(){return `<div style="position:absolute;left:12px;top:36px;width:861px"><div class="eyebrow">Peace in practice</div><h1 style="font-size:61px;letter-spacing:-2px;line-height:1.1;margin:23px 0">May Mother’s ${shimmer('love')}<br>bring ${shimmer('peace')} to the world!</h1><p class="subheading">Love expressed through words and actions.</p></div>${art('hands_banner','left:20px;top:393px;width:823px;height:238px;opacity:.8;mask-image:linear-gradient(transparent,#000 20%,#000 85%,transparent)')}<div class="heart-host" id="heart-host" style="left:198px;top:232px;width:390px;height:363px"></div><div id="heart-field"></div>${rightBubbles()}`}

function mountHearts(){const root=$('heart-field');if(!root)return;hearts=[];for(let i=0;i<14;i++){const el=document.createElement('div');el.className='floating-heart';const size=27+i%4*13;el.style.width=size+'px';el.style.height=size+'px';el.innerHTML=heartSVG(i%3===0?'#d6bbc9':'#e9b1b9');root.append(el);hearts.push({el,x:24+i%7*106,y:276+Math.floor(i/7)*135,phase:i,size})}}
function tickHearts(dt){if(S.still)return;hearts.forEach((h,i)=>{const y=250+((h.y-250-S.t*(3+i%3))%330+330)%330;h.el.style.transform=`translate(${h.x+Math.sin(S.t/10+i)*22}px,${y}px) rotate(${Math.sin(S.t/14+i)*12}deg) scale(${1+Math.sin(S.t/3+i)*.025})`})}
function mountHeart(){const host=$('heart-host');if(!host)return;if(!heartRenderer)heartRenderer=createHeart();host.append(heartRenderer.canvas);heartRenderer.draw(S.t)}
function createHeart(){
 const img=document.createElement('img');img.src=ASSETS.heart_render;img.alt='Sculpted rotating heart';img.style='width:100%;height:100%;object-fit:contain';
 return{canvas:img,draw:t=>{img.style.transform=`perspective(800px) rotateY(${t*7.5}deg)`}};
}

registerScene(9,{
 markup:peaceScene,
 mount(root){
  mountHeart();
  mountHearts();
 },
 floaters:true,
 fxCanvas:true,
 keepOut:()=>[{x:0,y:10,w:870,h:276}],
 replaceMode:'hearts'
});
