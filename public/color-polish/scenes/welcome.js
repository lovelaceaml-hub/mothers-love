// Scene 1: Welcome / Living campaign.
'use strict';

function welcome(){return `<div style="position:absolute;left:15px;top:43px;width:831px"><div class="eyebrow">A living campaign of appreciation</div><h1 style="font-size:74px;letter-spacing:-2.2px;line-height:1.08;margin:20px 0 22px">The Words of<br>${shimmer('Mother’s Love')}</h1><p class="serif" style="font-size:29px;line-height:1.4;color:#89836b">Where a mother's love resides,<br>peace abides.</p></div>${art('community','left:-20px;top:325px;width:910px;height:298px')}${rightBubbles()}`}

registerScene(1,{
 markup:welcome,
 floaters:true,
 fxCanvas:true,
 keepOut:()=>[{x:0,y:10,w:855,h:347}],
 replaceMode:null
});
