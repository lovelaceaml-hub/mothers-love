// Scene 8: We Are Peacemakers.
'use strict';

function peacemakers(){return `<div style="position:absolute;left:12px;top:33px;width:829px"><div class="eyebrow">Mother’s Love in our community</div><h1 style="font-size:71px;letter-spacing:-2.2px;line-height:1.02;margin:22px 0">We Are<br>${shimmer('Peace')}<span class="violet">makers</span></h1><p class="subheading" style="font-size:26px">Recognize the kindness<br>you see around you.</p></div>${art('globe','left:271px;top:134px;width:604px;height:482px')}${rightBubbles()}`}

registerScene(8,{
 markup:peacemakers,
 floaters:true,
 fxCanvas:true,
 keepOut:()=>[{x:0,y:8,w:700,h:296}],
 replaceMode:'drift'
});
