// Scene 9, Peace in Practice: the volumetric heart and the heavenly ribbons.
//
// Anthony, 2026-09-20: replace the rose solid and its thick gold hoops with the
// approved three dimensional study, Mothers_Love_Heavenly_Ribbons_3D.html: a
// sculpted rose heart, four sheer pearl and champagne ribbons that pass behind
// it and in front of it, twist and billow on their own, carry fine gold hems
// and travelling light, with sparks in the space around them and a wave that
// unfolds through the silk.
//
// This is that study's own renderer (dependency free WebGL 2: real meshes, a
// depth tested perspective scene, a shadow map, half float light, bloom and a
// filmic curve), adapted for the TV:
//   1. Only the artwork. The study's page, sliders, buttons, material panel,
//      pointer orbit, keyboard shortcuts and frame loop are not here.
//   2. It draws on a clear canvas. The study painted its own sky; here the
//      scene's paper, sunlight and raised hands show through, so every pass
//      keeps coverage (premultiplied) and light that spills past the silk
//      earns coverage of its own, or it would vanish against the pale paper.
//   3. It runs by itself. The camera is fixed at the study's calm opening
//      view, the ribbons unfold along their length when the scene opens, and
//      the wave of light returns on its own every so often.
//   4. It owns no clock and no loop. The renderer core calls draw() from its
//      one frame loop, exactly as it does for the Canvas 2D heart, so still
//      mode, reduced motion, a paused display, a hidden tab, arrivals and
//      scene changes all hold it without any code here.
//   5. It fits the scene. The ribbons rise and fall a little less than in the
//      study, because the subheading is just above the heart and the feed
//      just below the hands.
//   6. dispose() gives back every GPU object and the context itself. If
//      WebGL 2 is missing, fails to start, or the context is lost, the scene
//      falls back to the Canvas 2D heart (peace-in-practice.js).
//
// Nothing is fetched: the mesh is a script (peace-in-practice-heart-mesh.js),
// the shaders are strings, and the renderer page's content policy is unchanged.
'use strict';

// The canvas, in the scene's own pixels, relative to #heart-host (390 x 363,
// whose centre is the heart's centre). Wider than the host: the ribbons sweep
// well past the heart on both sides. The top stays under the subheading.
const PIP3D_BOX = { left: -185, top: 20, width: 760, height: 392 };
const PIP3D_UNIT = 92;                // scene pixels per unit of the study, at the heart's depth
const PIP3D_HEART_Y = 161.5;          // where the heart's centre sits, down from the canvas top (the host's own centre)
const PIP3D_CAMERA = { yaw: 0.15, pitch: 0.11, distance: 8.7, targetY: 0.12 }; // the study's opening view
const PIP3D_SPAN = 0.56;              // how much of the study's rise and fall the ribbons keep
const PIP3D_LIFT = -0.18;             // and where the middle of that sweep sits, in study units
const PIP3D_OPENING_TIME = 26;        // the study opens at this moment of its own motion
const PIP3D_UNFOLD_SECONDS = 3.4;     // the ribbons unroll along their length when the scene opens
const PIP3D_WAVE_FIRST = 0.5;         // seconds into the scene for the first wave of light
const PIP3D_WAVE_EVERY = 23;          // and between the ones that follow
const PIP3D_WAVE_SECONDS = 5;
const PIP3D_FRAME_MS = 24;            // the study paints 40 times a second at most; so does this
const PIP3D_GLOW = 0.62;              // the study's default glow
const PIP3D_SPARKS = 0.72;            // and its default share of drifting sparks
const PIP3D_SHADOW = 768;
const PIP3D_RIBBON_SEGMENTS = 288;
const PIP3D_RIBBON_ACROSS = 24;
const PIP3D_RIBBON_CHUNKS = 24;       // each ribbon is sorted back to front in this many strips
const PIP3D_SPARK_COUNT = 430;
const PIP3D_QUALITY_STEPS = [1, 0.75, 0.5];
const PIP3D_SLOW_MS = 46;             // a frame slower than this, sustained, steps the quality down
const PIP3D_SLOW_FRAMES = 120;

const PIP3D_RIBBONS = [
  // radius, turns, rise, start angle, flow rate, width
  [2.13, 4.8, 3.7, -2.25, 0.135, 0.68],
  [2.40, 4.1, 4.45, 0.65, -0.093, 0.61],
  [2.58, 3.7, 2.5, 2.20, 0.071, 0.36],
  [2.05, 3.5, 4.9, -0.20, -0.079, 0.32]
];

// The silk, shared by the surface, its shadow and the sparks that ride it.
const PIP3D_CLOTH_GLSL = `
uniform float uTime,uFlourish,uSpan,uLift;
uniform int uId;
const float PI=3.14159265358979;
vec4 configA(int id){
 if(id==0) return vec4(2.13,4.8,3.7,-2.25);
 if(id==1) return vec4(2.40,4.1,4.45,.65);
 if(id==2) return vec4(2.58,3.7,2.5,2.20);
 return vec4(2.05,3.5,4.9,-.20);
}
float rate(int id){return id==0?.135:id==1?-.093:id==2?.071:-.079;}
float widthOf(int id){return id==0?.68:id==1?.61:id==2?.36:.32;}
vec3 center(float u,int id){
 vec4 c=configA(id);
 float fi=float(id),t=uTime;
 float a=c.w+c.y*u+t*rate(id)+.13*sin(t*.37+u*5.+fi*1.7);
 float r=c.x*(1.+.055*sin(u*6.4+t*.47+fi))*(1.+uFlourish*.22);
 float h=(u-.5)*c.z+(id==2?-.38:0.);
 h+=.26*sin(a*1.3+fi)+.14*sin(u*9.0-t*.8+fi);
 h+=.10*sin(t*.58+fi*2.)+uFlourish*(u-.35)*.72;
 return vec3(cos(a)*r,h*uSpan+uLift,sin(a)*r*.69);
}
vec3 ribbon(float u,float v,int id){
 vec3 c=center(u,id);
 vec3 T=normalize(center(u+.001,id)-center(u-.001,id));
 vec3 R=normalize(vec3(c.x,0.,c.z));
 vec3 B=normalize(cross(T,R)),N=normalize(cross(T,B));
 float fi=float(id),t=uTime;
 float twist=.38+fi*.71+1.3*sin(u*5.5-t*.65+fi)+u*3.3;
 B=B*cos(twist)+N*sin(twist);N=normalize(cross(T,B));
 float taper=pow(max(0.,sin(clamp(u,0.,1.)*PI)),.58);
 float w=widthOf(id)*taper*(1.+.14*sin(u*11.-t*.95+fi));
 float flutter=(sin(u*12.-t*1.20+v*2.+fi)*.036+sin(u*22.-t*.8+v*8.)*.012)*taper;
 flutter+=.018*sin(v*8.+u*17.-t*.75)*taper;
 float bowl=(.25-v*v)*.12*taper;
 return c+B*(v*w)+N*(flutter+bowl);
}
`;

const PIP3D_VERTEX = `#version 300 es
precision highp float;
precision highp int;
layout(location=0)in vec3 aPos;
layout(location=1)in vec3 aNorm;
layout(location=2)in vec2 aUV;
uniform mat4 uModel,uVP,uLightVP;
uniform int uKind;
${PIP3D_CLOTH_GLSL}
out vec3 vPos,vNorm,vLocal;
out vec2 vUV;
out vec4 vShadow;
void main(){
 vec3 p=aPos,n=aNorm;
 if(uKind==1){
  float u=aUV.x,v=aUV.y-.5;
  p=ribbon(u,v,uId);
  n=normalize(cross(ribbon(u+.0008,v,uId)-ribbon(u-.0008,v,uId),ribbon(u,v+.001,uId)-ribbon(u,v-.001,uId))+vec3(0.,0.,.00000001));
 }
 vLocal=p; vec4 w=uModel*vec4(p,1.);vPos=w.xyz;vNorm=mat3(uModel)*n;vUV=aUV;vShadow=uLightVP*w;gl_Position=uVP*w;
}`;

// The shadow pass: silk that has not unrolled yet casts nothing.
const PIP3D_DEPTH_FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
in vec2 vUV;
uniform int uKind;
uniform float uReveal;
void main(){ if(uKind==1&&vUV.x>uReveal)discard; }
`;

const PIP3D_FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
in vec3 vPos,vNorm,vLocal;
in vec2 vUV;
in vec4 vShadow;
uniform vec3 uEye;
uniform sampler2D uShadow;
uniform int uKind,uId;
uniform float uTime,uGlow,uFlourish,uReveal;
out vec4 color;
const float PI=3.14159265359;
float shadow(){
 vec3 p=vShadow.xyz/vShadow.w*.5+.5;
 if(p.x<.005||p.x>.995||p.y<.005||p.y>.995||p.z>1.)return 1.;
 float total=0.;
 for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++)total+=p.z-.003<texture(uShadow,p.xy+vec2(i,j)/${PIP3D_SHADOW}.).r?1.:.77;
 return total/9.;
}
vec3 fresnel(float vh,vec3 f0){return f0+(1.-f0)*pow(clamp(1.-vh,0.,1.),5.);}
vec3 lit(vec3 L,vec3 rad,vec3 N,vec3 V,vec3 albedo,float rough,float metallic){
 vec3 H=normalize(V+L);float nv=max(dot(N,V),.001),nl=max(dot(N,L),0.);
 float nh=max(dot(N,H),0.),vh=max(dot(V,H),0.);
 float a=rough*rough,a2=a*a,d=nh*nh*(a2-1.)+1.;
 float D=a2/(PI*d*d+.0001),k=(rough+1.)*(rough+1.)/8.;
 float G=nv/(nv*(1.-k)+k)*nl/(nl*(1.-k)+k);
 vec3 F=fresnel(vh,mix(vec3(.065),albedo,metallic));
 vec3 spec=F*(D*G/(4.*nv*max(nl,.001)+.0001));
 return ((1.-F)*(1.-metallic)*albedo/PI+spec)*rad*nl;
}
void main(){
 vec3 N=normalize(vNorm+vec3(0.,0.,.00000001)),V=normalize(uEye-vPos);
 if(dot(N,V)<0.)N=-N;
 vec3 albedo;float rough,metal,alpha=1.,hem=0.;
 if(uKind==0){
  float g=clamp((vLocal.x-vLocal.y+2.)/5.,0.,1.);
  albedo=mix(vec3(.76,.17,.31),vec3(.40,.055,.22),g);
  albedo=mix(albedo,vec3(.68,.20,.43),smoothstep(.5,1.5,vLocal.x)*.24);
  rough=.29;metal=.12;
 }else{
  float edge=min(vUV.y,1.-vUV.y);
  hem=1.-smoothstep(.010,.030,edge);
  float s=.5+.5*sin(vUV.x*12.-uTime*.36+float(uId));
  // The study's silk was seen against a dusk sky. Against this scene's pale
  // paper the same pearl would all but vanish, so here it is a shade deeper
  // (champagne, with a warm pearl for the two finer ribbons) and a little
  // less sheer. It is still sheer: the heart and the hands show through it.
  vec3 silk=mix(vec3(.86,.60,.26),vec3(.95,.87,.62),s*.65);
  if(uId==1||uId==3)silk=mix(silk,vec3(.92,.82,.76),.35);
  albedo=mix(silk,vec3(.84,.47,.09),hem*.80);
  rough=mix(.43,.29,hem);metal=mix(.08,.63,hem);
  float nv=abs(dot(N,V));
  alpha=mix(.56,.80,pow(1.-nv,.8));
  alpha=mix(alpha,.96,hem);
  alpha*=smoothstep(0.,.018,vUV.x)*smoothstep(0.,.018,1.-vUV.x);
  // The unfolding: the silk unrolls along its length, with a soft leading edge.
  alpha*=1.-smoothstep(uReveal-.09,uReveal,vUV.x);
  float threads=sin(vUV.y*390.)*sin(vUV.x*1300.);
  albedo*=1.+threads*.013;
 }
 float sh=uKind==0?shadow():1.;
 vec3 col=albedo*.24*mix(vec3(.60,.68,.86),vec3(1.15,.98,.86),N.y*.5+.5);
 col+=lit(normalize(vec3(-4.,7.,5.)-vPos),vec3(5.8,4.8,3.9)*sh,N,V,albedo,rough,metal);
 col+=lit(normalize(vec3(4.,1.5,-3.)-vPos),vec3(2.6,2.6,4.0),N,V,albedo,rough+.07,metal);
 col+=lit(normalize(vec3(-2.,-2.,3.)-vPos),vec3(.60,.26,.44),N,V,albedo,.5,metal);
 col+=lit(normalize(vec3(.0,5.,-5.)-vPos),vec3(2.5,2.7,2.5),N,V,albedo,rough,metal);
 float rim=pow(1.-max(0.,dot(N,V)),3.);
 if(uKind==0){
  col+=vec3(.16,.045,.095)+rim*vec3(.28,.15,.22);
  // Broad, reflected studio windows, shaped by actual surface normals.
  vec3 R=reflect(-V,N);
  float area=pow(max(0.,dot(R,normalize(vec3(-.65,.65,1.2)))),32.);
  col+=area*vec3(.80,.63,.52);
 }else{
  float back=pow(max(0.,dot(-N,normalize(vec3(-.4,.8,.6)))),2.);
  col+=albedo*(.16+back*.31)+rim*vec3(.20,.19,.14);
  float p=fract(uTime*.105+float(uId)*.247);
  float travel=exp(-pow((vUV.x-p)*28.,2.));
  col+=hem*vec3(1.25,1.0,.48)*(.18+travel*(1.2+uGlow*2.0));
  col+=albedo*travel*.14;
  col+=uFlourish*hem*vec3(.8,.56,.2);
  // Less light on the silk than the study gave it, for the same reason: lit
  // that brightly it turns paper white. The travelling gold stays bright.
  col*=mix(.84,1.,max(hem*.6,travel));
 }
 color=vec4(max(col,vec3(0.)),alpha);
}`;

const PIP3D_QUAD_VERTEX = `#version 300 es
precision highp float;
precision highp int;
layout(location=0)in vec2 aPos;
out vec2 vUV;
void main(){vUV=aPos*.5+.5;gl_Position=vec4(aPos,0.,1.);}`;

// The study lit its sky behind the heart. Here only that light remains, as a
// soft warm glow with coverage of its own, laid down before everything else.
const PIP3D_HALO_FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
in vec2 vUV;
uniform vec2 uCentre,uSize;
uniform float uFlourish,uGlow;
out vec4 color;
void main(){
 vec2 q=(vUV-uCentre)*uSize/uSize.y;
 float halo=exp(-dot(q,q)*7.5);
 float a=halo*(.30+uGlow*.20+uFlourish*.22);
 vec3 sun=vec3(1.16,1.0,.70)+uFlourish*vec3(.20,.08,.0);
 color=vec4(sun*a,a);
}`;

const PIP3D_SPARK_VERTEX = `#version 300 es
precision highp float;
precision highp int;
layout(location=0)in vec4 aSeed;
uniform mat4 uVP;
uniform float uPixelRatio,uParticleAmount,uBurstAge,uReveal;
${PIP3D_CLOTH_GLSL}
out float vAlpha,vKind;
out vec3 vColor;
void main(){
 float a=aSeed.x,b=aSeed.y,c=aSeed.z,d=aSeed.w;
 vec3 p;float size=1.;vKind=0.;
 if(d<.55){
  // Sparks adrift in the space around the heart, rising.
  float angle=a*6.28318+uTime*(.03+c*.045);
  float r=1.8+b*1.65;
  float span=4.1;
  p=vec3(cos(angle)*r,mod(b*span+uTime*(.045+c*.06),span)-span*.5+uLift,sin(angle)*r*.72);
  float rise=fract(b+uTime*(.045+c*.06)/span);
  size=8.+c*20.;vAlpha=(.28+.44*pow(.5+.5*sin(uTime*(1.+b)+a*50.),3.))*smoothstep(0.,.15,rise)*smoothstep(1.,.82,rise);
  vAlpha*=step(d,uParticleAmount*.55);vKind=step(.92,c);
 }else if(d<.89){
  // Sparks that ride the hems of the silk.
  int id=int(floor(a*4.));float u=fract(b+uTime*(.032+c*.035));
  p=ribbon(u,c>.5?.5:-.5,id);
  p+=vec3(sin(b*90.+uTime)*.012,cos(a*70.+uTime)*.014,0.);
  size=9.+c*20.;vAlpha=pow(max(0.,sin(u*3.14159)),.35)*(.38+c*.45)*(1.-smoothstep(uReveal-.09,uReveal,u));vKind=step(.85,c);
 }else{
  // The burst that opens with each wave of light.
  float age=clamp(uBurstAge,0.,6.),angle=a*6.283185+age*(.3+b*.5);
  float r=.7+age*(.42+b*.31);
  p=vec3(cos(angle)*r,((b-.5)*2.+age*(.36+c*.3))*.7+uLift,sin(angle)*r*.74);
  size=20.+c*18.;vAlpha=exp(-age*.75)*(1.-smoothstep(3.2,4.5,age))*step(0.,uBurstAge);vKind=step(.7,c);
 }
 vec4 clip=uVP*vec4(p,1.);gl_Position=clip;gl_PointSize=clamp(size*(6.0/max(1.,clip.w))*uPixelRatio,1.,80.);
 vColor=mix(vec3(1.55,1.01,.32),vec3(2.2,1.75,1.05),b);
}`;

const PIP3D_SPARK_FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
in float vAlpha,vKind;in vec3 vColor;
out vec4 color;
void main(){
 vec2 p=(gl_PointCoord-.5)*2.;float r=length(p);
 float disk=exp(-r*r*18.)*.90+exp(-r*r*4.5)*.085;
 float star=exp(-abs(p.x)*35.-abs(p.y)*3.)+exp(-abs(p.y)*35.-abs(p.x)*3.);
 float a=(disk+star*vKind*.40)*vAlpha*smoothstep(1.,.7,r);
 if(a<.002)discard;color=vec4(vColor,a);
}`;

const PIP3D_BLOOM_FRAGMENT = `#version 300 es
precision highp float;
precision highp int;in vec2 vUV;uniform sampler2D uTex;uniform vec2 uStep;uniform int uMode;uniform float uThreshold;out vec4 color;
void main(){
 if(uMode==0){vec3 c=texture(uTex,vUV).rgb;float l=max(c.r,max(c.g,c.b));float k=max(0.,l-uThreshold)/max(.0001,l);color=vec4(c*k,1.);}
 else {vec3 c=texture(uTex,vUV).rgb*.227027;
 c+=(texture(uTex,vUV+uStep*1.384615).rgb+texture(uTex,vUV-uStep*1.384615).rgb)*.316216;
 c+=(texture(uTex,vUV+uStep*3.230769).rgb+texture(uTex,vUV-uStep*3.230769).rgb)*.070270;
 color=vec4(c,1.);}
}`;

// The study ended on an opaque frame. This ends on a clear one: light is added
// while it is still light, then coverage is worked out, so an opaque heart
// keeps the study's exact tones, sheer silk stays sheer, and a spark or a
// bloom with nothing behind it becomes a soft patch of its own colour. The
// last few percent at each edge of the canvas fade out, so nothing can ever
// meet the edge as a hard line.
const PIP3D_FINAL_FRAGMENT = `#version 300 es
precision highp float;
precision highp int;in vec2 vUV;uniform sampler2D uScene,uBloom;uniform vec2 uPixel;uniform float uGlow;out vec4 color;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){
 vec4 c=texture(uScene,vUV);
 // Gentle five-sample antialiasing for the offscreen color buffer.
 vec4 n=texture(uScene,vUV+vec2(0,uPixel.y)),s=texture(uScene,vUV-vec2(0,uPixel.y));
 vec4 e=texture(uScene,vUV+vec2(uPixel.x,0)),w=texture(uScene,vUV-vec2(uPixel.x,0));
 float contrast=length(max(max(n,s),max(e,w))-min(min(n,s),min(e,w)));
 c=mix(c,(n+s+e+w+c*4.)/8.,smoothstep(.3,1.4,contrast)*.50);
 vec3 light=c.rgb+texture(uBloom,vUV).rgb*(.24+uGlow*.8);
 float glow=max(light.r,max(light.g,light.b));
 float cover=clamp(max(c.a,1.-exp(-glow*1.5)),0.,1.);
 vec3 tone=pow(aces(light/max(cover,.0001)*.91),vec3(1./2.2));
 vec2 f=smoothstep(vec2(0.),vec2(.05,.07),vUV)*smoothstep(vec2(0.),vec2(.05,.07),1.-vUV);
 cover*=f.x*f.y;
 color=vec4(tone*cover,cover);
}`;

let pip3dMesh = null;

// The heart's points, normals and triangles, decoded once.
function pip3dDecodeMesh() {
  if (pip3dMesh) return pip3dMesh;
  if (typeof PIP3D_HEART_MESH === 'undefined') return null;
  const bytes = (text) => {
    const raw = atob(text);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out.buffer;
  };
  const points = new Int16Array(bytes(PIP3D_HEART_MESH.p));
  const normals = new Int16Array(bytes(PIP3D_HEART_MESH.n));
  pip3dMesh = {
    positions: Float32Array.from(points, (v) => v / 16000),
    normals: Float32Array.from(normals, (v) => v / 32760),
    indices: new Uint16Array(bytes(PIP3D_HEART_MESH.i))
  };
  return pip3dMesh;
}

// Minimal vector and matrix helpers. Matrices are column major, as in GLSL.
const pip3dSub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const pip3dDot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const pip3dCross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const pip3dNorm = (a) => { const n = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };
function pip3dMul(a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}
// A perspective whose centre of view sits at (shiftX, shiftY) in clip space,
// so the heart can sit above the middle of a canvas that reaches lower than
// it reaches high.
function pip3dPerspective(fov, aspect, near, far, shiftX, shiftY) {
  const k = 1 / Math.tan(fov / 2);
  return new Float32Array([k / aspect, 0, 0, 0, 0, k, 0, 0, -shiftX, -shiftY, (far + near) / (near - far), -1, 0, 0, 2 * far * near / (near - far), 0]);
}
function pip3dOrtho(l, r, b, t, n, f) {
  return new Float32Array([2 / (r - l), 0, 0, 0, 0, 2 / (t - b), 0, 0, 0, 0, -2 / (f - n), 0, -(r + l) / (r - l), -(t + b) / (t - b), -(f + n) / (f - n), 1]);
}
function pip3dLook(eye, target) {
  const z = pip3dNorm(pip3dSub(eye, target));
  const x = pip3dNorm(pip3dCross([0, 1, 0], z));
  const y = pip3dCross(z, x);
  return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -pip3dDot(x, eye), -pip3dDot(y, eye), -pip3dDot(z, eye), 1]);
}
function pip3dModel(rx, ry, rz, s, y) {
  const a = Math.cos(rx), b = Math.sin(rx), c = Math.cos(ry), d = Math.sin(ry), e = Math.cos(rz), f = Math.sin(rz);
  return new Float32Array([c * e * s, (a * f + b * d * e) * s, (b * f - a * d * e) * s, 0, -c * f * s, (a * e - b * d * f) * s, (b * e + a * d * f) * s, 0, d * s, -b * c * s, a * c * s, 0, 0, y, 0, 1]);
}

// 0 to 1: how far the wave of light has opened, `age` seconds after it began.
function pip3dWave(age) {
  return age >= 0 && age < PIP3D_WAVE_SECONDS ? Math.sin(Math.min(1, age / PIP3D_WAVE_SECONDS) * Math.PI) * Math.exp(-age * 0.12) : 0;
}

/**
 * Builds the WebGL 2 heart and ribbons. Returns null when WebGL 2 cannot be
 * had or fails to start, and the scene then uses the Canvas 2D heart.
 * `onLost` is called once if the graphics context is lost later.
 * Called by pipMountHeart (peace-in-practice.js).
 */
function pipCreateHeart3D(onLost) {
  const data = pip3dDecodeMesh();
  if (!data) return null;
  const canvas = document.createElement('canvas');
  canvas.className = 'pip-heart3d';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'A sculpted rose heart with sheer ribbons of pearl and gold flowing around it');
  const rig = document.createElement('div');
  rig.className = 'pip-heart3d-rig';
  rig.style.cssText = `left:${PIP3D_BOX.left}px;top:${PIP3D_BOX.top}px;width:${PIP3D_BOX.width}px;height:${PIP3D_BOX.height}px`;
  rig.append(canvas);

  let gl = null;
  try {
    gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' });
  } catch (error) {
    gl = null;
  }
  if (!gl) return null;

  const owned = { programs: [], buffers: [], arrays: [], textures: [], framebuffers: [], renderbuffers: [] };
  let alive = true;
  let trailing = 0;
  let sceneTarget = null, bloomA = null, bloomB = null;

  function program(vertexSource, fragmentSource) {
    const shader = (type, source) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s) || 'shader');
      return s;
    };
    const p = gl.createProgram();
    const vs = shader(gl.VERTEX_SHADER, vertexSource);
    const fs = shader(gl.FRAGMENT_SHADER, fragmentSource);
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(p) || 'program');
    p.u = {};
    owned.programs.push(p);
    return p;
  }
  const loc = (p, name) => p.u[name] ?? (p.u[name] = gl.getUniformLocation(p, name));
  const f1 = (p, name, v) => gl.uniform1f(loc(p, name), v);
  const i1 = (p, name, v) => gl.uniform1i(loc(p, name), v);
  const v2 = (p, name, a, b) => gl.uniform2f(loc(p, name), a, b);
  const v3 = (p, name, a) => gl.uniform3fv(loc(p, name), a);
  const m4 = (p, name, a) => gl.uniformMatrix4fv(loc(p, name), false, a);

  function buffer(target, contents) {
    const b = gl.createBuffer();
    gl.bindBuffer(target, b);
    gl.bufferData(target, contents, gl.STATIC_DRAW);
    owned.buffers.push(b);
    return b;
  }
  function vertexArray() {
    const vao = gl.createVertexArray();
    owned.arrays.push(vao);
    gl.bindVertexArray(vao);
    return vao;
  }
  function mesh(positions, normals, uvs, indices) {
    const vao = vertexArray();
    [[0, positions, 3], [1, normals, 3], [2, uvs, 2]].forEach(([index, contents, size]) => {
      buffer(gl.ARRAY_BUFFER, contents);
      gl.enableVertexAttribArray(index);
      gl.vertexAttribPointer(index, size, gl.FLOAT, false, 0, 0);
    });
    buffer(gl.ELEMENT_ARRAY_BUFFER, indices);
    gl.bindVertexArray(null);
    return { vao, count: indices.length };
  }
  function ribbonMesh() {
    const across = PIP3D_RIBBON_ACROSS + 1;
    const count = (PIP3D_RIBBON_SEGMENTS + 1) * across;
    const positions = new Float32Array(count * 3);
    const normals = new Float32Array(count * 3);
    const uvs = new Float32Array(count * 2);
    const indices = new Uint16Array(PIP3D_RIBBON_SEGMENTS * PIP3D_RIBBON_ACROSS * 6);
    for (let i = 0, k = 0; i <= PIP3D_RIBBON_SEGMENTS; i++) for (let j = 0; j <= PIP3D_RIBBON_ACROSS; j++, k++) {
      normals[k * 3 + 2] = 1;
      uvs[k * 2] = i / PIP3D_RIBBON_SEGMENTS;
      uvs[k * 2 + 1] = j / PIP3D_RIBBON_ACROSS;
    }
    for (let i = 0, k = 0; i < PIP3D_RIBBON_SEGMENTS; i++) for (let j = 0; j < PIP3D_RIBBON_ACROSS; j++) {
      const a = i * across + j, b = a + across;
      indices[k++] = a; indices[k++] = b; indices[k++] = a + 1;
      indices[k++] = a + 1; indices[k++] = b; indices[k++] = b + 1;
    }
    return mesh(positions, normals, uvs, indices);
  }
  function renderTarget(w, h, hdr, depth) {
    const tex = gl.createTexture();
    owned.textures.push(tex);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, hdr ? gl.RGBA16F : gl.RGBA8, w, h, 0, gl.RGBA, hdr ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fbo = gl.createFramebuffer();
    owned.framebuffers.push(fbo);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    let dep = null;
    if (depth) {
      dep = gl.createRenderbuffer();
      owned.renderbuffers.push(dep);
      gl.bindRenderbuffer(gl.RENDERBUFFER, dep);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, dep);
    }
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw Error('render target');
    return { tex, fbo, dep, w, h };
  }
  function releaseTarget(t) {
    if (!t) return;
    gl.deleteTexture(t.tex);
    gl.deleteFramebuffer(t.fbo);
    if (t.dep) gl.deleteRenderbuffer(t.dep);
    owned.textures = owned.textures.filter((x) => x !== t.tex);
    owned.framebuffers = owned.framebuffers.filter((x) => x !== t.fbo);
    owned.renderbuffers = owned.renderbuffers.filter((x) => x !== t.dep);
  }

  let programs, heart, cloth, quad, sparks, shadowTex, shadowFbo, hdr;
  try {
    programs = {
      main: program(PIP3D_VERTEX, PIP3D_FRAGMENT),
      shadow: program(PIP3D_VERTEX, PIP3D_DEPTH_FRAGMENT),
      halo: program(PIP3D_QUAD_VERTEX, PIP3D_HALO_FRAGMENT),
      sparks: program(PIP3D_SPARK_VERTEX, PIP3D_SPARK_FRAGMENT),
      bloom: program(PIP3D_QUAD_VERTEX, PIP3D_BLOOM_FRAGMENT),
      final: program(PIP3D_QUAD_VERTEX, PIP3D_FINAL_FRAGMENT)
    };
    heart = mesh(data.positions, data.normals, new Float32Array(data.positions.length / 3 * 2), data.indices);
    cloth = ribbonMesh();
    quad = vertexArray();
    buffer(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]));
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    sparks = vertexArray();
    // The study's own seeded sparks, so they sit where they sat there.
    let seed = 94621;
    const seeds = new Float32Array(PIP3D_SPARK_COUNT * 4);
    for (let i = 0; i < seeds.length; i++) { seed = (1664525 * seed + 1013904223) >>> 0; seeds[i] = seed / 4294967296; }
    buffer(gl.ARRAY_BUFFER, seeds);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    hdr = !!gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('OES_texture_float_linear');
    shadowTex = gl.createTexture();
    owned.textures.push(shadowTex);
    gl.bindTexture(gl.TEXTURE_2D, shadowTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, PIP3D_SHADOW, PIP3D_SHADOW, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    shadowFbo = gl.createFramebuffer();
    owned.framebuffers.push(shadowFbo);
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, shadowTex, 0);
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw Error('shadow target');
  } catch (error) {
    dispose();
    return null;
  }

  // The fixed, calm view: the study's opening camera, framed so that one unit
  // of the study is PIP3D_UNIT scene pixels at the heart's depth, with the
  // heart's centre at the host's centre.
  const pitch = PIP3D_CAMERA.pitch, yaw = PIP3D_CAMERA.yaw, distance = PIP3D_CAMERA.distance;
  const eye = [Math.sin(yaw) * Math.cos(pitch) * distance, Math.sin(pitch) * distance + PIP3D_CAMERA.targetY, Math.cos(yaw) * Math.cos(pitch) * distance];
  const fov = 2 * Math.atan(PIP3D_BOX.height / PIP3D_UNIT / 2 / distance);
  const shiftY = 1 - 2 * PIP3D_HEART_Y / PIP3D_BOX.height;
  const view = pip3dLook(eye, [0, PIP3D_CAMERA.targetY, 0]);
  const vp = pip3dMul(pip3dPerspective(fov, PIP3D_BOX.width / PIP3D_BOX.height, 0.1, 60, 0, shiftY), view);
  const lightVP = pip3dMul(pip3dOrtho(-5, 5, -5, 5, 0.1, 25), pip3dLook([-4, 7, 5], [0, 0, 0]));
  const identity = pip3dModel(0, 0, 0, 1, 0);
  // Where the heart's centre lands on the canvas, 0 to 1 from the lower left.
  const haloCentre = [0.5, 1 - PIP3D_HEART_Y / PIP3D_BOX.height];

  let backing = 1;
  let quality = 0;
  let time = PIP3D_OPENING_TIME;      // the study's own motion clock
  let age = 0;                        // seconds this showing has been in motion
  let lastSceneT = null;
  let waveAt = -100;                  // `time` at which the current wave of light began
  let nextWave = PIP3D_WAVE_FIRST;
  let still = false;
  let lastPaint = -Infinity;
  let lastCall = 0;
  let slow = 0;
  let paints = 0;
  let paintMs = 0;
  const order = [];
  for (let id = 0; id < PIP3D_RIBBONS.length; id++) for (let j = 0; j < PIP3D_RIBBON_CHUNKS; j++) order.push({ id, j, d: 0 });

  function sizeTargets() {
    const scale = backing * PIP3D_QUALITY_STEPS[quality];
    const w = Math.max(2, Math.round(PIP3D_BOX.width * scale));
    const h = Math.max(2, Math.round(PIP3D_BOX.height * scale));
    if (sceneTarget && canvas.width === w && canvas.height === h) return;
    canvas.width = w;
    canvas.height = h;
    releaseTarget(sceneTarget);
    releaseTarget(bloomA);
    releaseTarget(bloomB);
    sceneTarget = renderTarget(w, h, hdr, true);
    bloomA = renderTarget(Math.max(1, w >> 2), Math.max(1, h >> 2), hdr, false);
    bloomB = renderTarget(bloomA.w, bloomA.h, hdr, false);
    canvas.dataset.quality = String(PIP3D_QUALITY_STEPS[quality]);
  }

  // The centre line of ribbon `id` at u, on the CPU: the same curve the vertex
  // shader draws, used only to sort the strips of silk back to front.
  function centreOf(u, id, flourish) {
    const c = PIP3D_RIBBONS[id];
    const a = c[3] + c[1] * u + time * c[4] + 0.13 * Math.sin(time * 0.37 + u * 5 + id * 1.7);
    const r = c[0] * (1 + 0.055 * Math.sin(u * 6.4 + time * 0.47 + id)) * (1 + flourish * 0.22);
    const h = (u - 0.5) * c[2] + (id === 2 ? -0.38 : 0) + 0.26 * Math.sin(a * 1.3 + id) + 0.14 * Math.sin(u * 9 - time * 0.8 + id) + 0.10 * Math.sin(time * 0.58 + id * 2) + flourish * (u - 0.35) * 0.72;
    return [Math.cos(a) * r, h * PIP3D_SPAN + PIP3D_LIFT, Math.sin(a) * r * 0.69];
  }

  function shared(p, flourish, reveal) {
    gl.useProgram(p);
    f1(p, 'uTime', time);
    f1(p, 'uFlourish', flourish);
    f1(p, 'uSpan', PIP3D_SPAN);
    f1(p, 'uLift', PIP3D_LIFT);
    f1(p, 'uReveal', reveal);
  }
  function bindTexture(p, name, tex, unit) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    i1(p, name, unit);
  }
  function fullQuad() {
    gl.bindVertexArray(quad);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function paint() {
    if (!alive || gl.isContextLost()) return;
    if (trailing) { clearTimeout(trailing); trailing = 0; }
    const started = performance.now();
    sizeTargets();
    const flourish = still ? 0 : pip3dWave(time - waveAt);
    const unrolled = still ? 1 : Math.min(1, age / PIP3D_UNFOLD_SECONDS);
    const reveal = (1 - (1 - unrolled) ** 3) * 1.1;
    const breath = 1 + 0.027 * Math.sin(time * 1.05);
    const heartModel = pip3dModel(0.075 * Math.sin(time * 0.31), -0.18 + 0.22 * Math.sin(time * 0.34), 0.025 * Math.sin(time * 0.4), breath, -0.11 + 0.10 * Math.sin(time * 0.70));

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);
    // The heart and the silk share a real directional depth map.
    let p = programs.shadow;
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFbo);
    gl.viewport(0, 0, PIP3D_SHADOW, PIP3D_SHADOW);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.2, 2);
    shared(p, flourish, reveal);
    m4(p, 'uVP', lightVP);
    m4(p, 'uLightVP', lightVP);
    m4(p, 'uModel', heartModel);
    i1(p, 'uKind', 0);
    i1(p, 'uId', 0);
    gl.bindVertexArray(heart.vao);
    gl.drawElements(gl.TRIANGLES, heart.count, gl.UNSIGNED_SHORT, 0);
    m4(p, 'uModel', identity);
    i1(p, 'uKind', 1);
    gl.bindVertexArray(cloth.vao);
    for (let id = 0; id < PIP3D_RIBBONS.length; id++) { i1(p, 'uId', id); gl.drawElements(gl.TRIANGLES, cloth.count, gl.UNSIGNED_SHORT, 0); }
    gl.disable(gl.POLYGON_OFFSET_FILL);

    gl.bindFramebuffer(gl.FRAMEBUFFER, sceneTarget.fbo);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    p = programs.halo;
    gl.useProgram(p);
    v2(p, 'uCentre', haloCentre[0], haloCentre[1]);
    v2(p, 'uSize', PIP3D_BOX.width, PIP3D_BOX.height);
    f1(p, 'uFlourish', flourish);
    f1(p, 'uGlow', PIP3D_GLOW);
    fullQuad();

    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    p = programs.main;
    shared(p, flourish, reveal);
    m4(p, 'uVP', vp);
    m4(p, 'uLightVP', lightVP);
    f1(p, 'uGlow', PIP3D_GLOW);
    v3(p, 'uEye', eye);
    bindTexture(p, 'uShadow', shadowTex, 0);
    m4(p, 'uModel', heartModel);
    i1(p, 'uKind', 0);
    i1(p, 'uId', 0);
    gl.bindVertexArray(heart.vao);
    gl.drawElements(gl.TRIANGLES, heart.count, gl.UNSIGNED_SHORT, 0);
    // Small strips of silk, sorted back to front, not whole ribbons. The
    // heart's depth hides the silk behind it; the silk in front lies over it,
    // sheer. Colour blends as usual and coverage adds up, so the target holds
    // premultiplied light over a clear ground.
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    m4(p, 'uModel', identity);
    i1(p, 'uKind', 1);
    for (const strip of order) {
      const c = centreOf((strip.j + 0.5) / PIP3D_RIBBON_CHUNKS, strip.id, flourish);
      strip.d = Math.hypot(eye[0] - c[0], eye[1] - c[1], eye[2] - c[2]);
    }
    order.sort((a, b) => b.d - a.d);
    gl.bindVertexArray(cloth.vao);
    const stripCount = (PIP3D_RIBBON_SEGMENTS / PIP3D_RIBBON_CHUNKS) * PIP3D_RIBBON_ACROSS * 6;
    for (const strip of order) {
      i1(p, 'uId', strip.id);
      gl.drawElements(gl.TRIANGLES, stripCount, gl.UNSIGNED_SHORT, strip.j * stripCount * 2);
    }
    // Sparks are light: they add, and leave coverage to the last pass.
    p = programs.sparks;
    shared(p, flourish, reveal);
    m4(p, 'uVP', vp);
    f1(p, 'uPixelRatio', canvas.width / PIP3D_BOX.width);
    f1(p, 'uParticleAmount', PIP3D_SPARKS);
    f1(p, 'uBurstAge', still ? -1 : time - waveAt);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ZERO, gl.ONE);
    gl.bindVertexArray(sparks);
    gl.drawArrays(gl.POINTS, 0, PIP3D_SPARK_COUNT);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);

    // Bright light is lifted out, blurred in four passes, then added back
    // under the filmic curve.
    p = programs.bloom;
    gl.useProgram(p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, bloomA.fbo);
    gl.viewport(0, 0, bloomA.w, bloomA.h);
    bindTexture(p, 'uTex', sceneTarget.tex, 0);
    i1(p, 'uMode', 0);
    f1(p, 'uThreshold', hdr ? 1.08 : 0.82);
    v2(p, 'uStep', 0, 0);
    fullQuad();
    for (let i = 0; i < 4; i++) {
      const out = i % 2 === 0 ? bloomB : bloomA;
      const from = i % 2 === 0 ? bloomA : bloomB;
      gl.bindFramebuffer(gl.FRAMEBUFFER, out.fbo);
      bindTexture(p, 'uTex', from.tex, 0);
      i1(p, 'uMode', 1);
      v2(p, 'uStep', i % 2 === 0 ? 1.5 / out.w : 0, i % 2 === 1 ? 1.5 / out.h : 0);
      fullQuad();
    }
    p = programs.final;
    gl.useProgram(p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    bindTexture(p, 'uScene', sceneTarget.tex, 0);
    bindTexture(p, 'uBloom', bloomA.tex, 1);
    f1(p, 'uGlow', PIP3D_GLOW);
    v2(p, 'uPixel', 1 / canvas.width, 1 / canvas.height);
    fullQuad();
    gl.bindVertexArray(null);
    gl.depthMask(true);
    lastPaint = started;
    paints++;
    paintMs += (performance.now() - started - paintMs) / Math.min(paints, 60);
  }

  // A display too slow to keep up gets a smaller picture, never a different
  // one: the canvas is drawn at 75 percent, then 50 percent, and enlarged.
  function watchPace(now) {
    const gap = now - lastCall;
    lastCall = now;
    if (gap < 4 || gap > 250) return;
    slow = gap > PIP3D_SLOW_MS ? slow + 1 : Math.max(0, slow - 2);
    if (slow >= PIP3D_SLOW_FRAMES && quality < PIP3D_QUALITY_STEPS.length - 1) { quality++; slow = 0; }
  }

  /**
   * Draws the moment `sceneT` seconds into the scene's own clock. The core
   * calls this every frame while the scene is in motion; time only ever moves
   * forward here, by what the scene clock moved, so a scene that is redrawn in
   * place (a new recognition arriving) never makes the ribbons jump.
   */
  function draw(sceneT, force, isStill) {
    if (!alive) return;
    const now = performance.now();
    still = !!isStill;
    if (still) {
      time = PIP3D_OPENING_TIME;
    } else {
      const step = lastSceneT === null || sceneT < lastSceneT ? 0 : Math.min(0.1, sceneT - lastSceneT);
      lastSceneT = sceneT;
      time += step;
      age += step;
      if (age >= nextWave) { waveAt = time; nextWave += PIP3D_WAVE_EVERY; }
      if (!force) watchPace(now);
    }
    if (force || now - lastPaint >= PIP3D_FRAME_MS) {
      paint();
    } else if (!trailing) {
      // A frame skipped for pace is still owed, once, so the canvas always ends
      // on the latest moment (a stepped clock, a pause right after a skip). The
      // next paint, whichever comes first, settles the debt.
      trailing = setTimeout(() => { trailing = 0; if (alive && canvas.isConnected) paint(); }, PIP3D_FRAME_MS - (now - lastPaint));
    }
  }

  /** A fresh showing of the scene: the ribbons unfold again and the wave returns. */
  function restart() {
    age = 0;
    lastSceneT = null;
    waveAt = -100;
    nextWave = PIP3D_WAVE_FIRST;
    slow = 0;
  }

  /** One canvas pixel per TV pixel, from half size (a phone) to double (a 3840 screen). */
  function setBacking(scale) {
    const next = Math.max(0.5, Math.min(2, Math.round((Number.isFinite(scale) && scale > 0 ? scale : 1) * 20) / 20));
    if (next === backing) return;
    backing = next;
    lastPaint = -Infinity;
  }

  function lost(event) {
    event.preventDefault();
    if (!alive) return;
    dispose();
    if (typeof onLost === 'function') onLost();
  }
  canvas.addEventListener('webglcontextlost', lost);

  /** Gives back every GPU object, the pending frame, the listener and the context itself. */
  function dispose() {
    if (!alive) return;
    alive = false;
    if (trailing) clearTimeout(trailing);
    trailing = 0;
    canvas.removeEventListener('webglcontextlost', lost);
    if (!gl.isContextLost()) {
      owned.arrays.forEach((x) => gl.deleteVertexArray(x));
      owned.buffers.forEach((x) => gl.deleteBuffer(x));
      owned.textures.forEach((x) => gl.deleteTexture(x));
      owned.renderbuffers.forEach((x) => gl.deleteRenderbuffer(x));
      owned.framebuffers.forEach((x) => gl.deleteFramebuffer(x));
      owned.programs.forEach((x) => gl.deleteProgram(x));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    Object.keys(owned).forEach((key) => { owned[key] = []; });
    sceneTarget = bloomA = bloomB = null;
    rig.remove();
    canvas.width = canvas.height = 1;
  }

  canvas.dataset.technique = 'webgl2-volumetric';
  return {
    canvas, rig, draw, restart, setBacking, dispose,
    technique: 'webgl2-volumetric',
    get alive() { return alive; },
    get backing() { return backing; },
    // For checking the picture and the frame cost by hand, and for the scene spec.
    get stats() { return { hdr, quality: PIP3D_QUALITY_STEPS[quality], width: canvas.width, height: canvas.height, paints, paintMs, time, age, triangles: heart.count / 3 + cloth.count / 3 * PIP3D_RIBBONS.length }; },
    // Asking WebGL for its error stalls the GPU, so it is not part of stats.
    get glError() { return alive ? gl.getError() : 0; }
  };
}
