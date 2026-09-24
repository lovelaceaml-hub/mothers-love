import * as T from "three";
import { STUDY_SUN } from "./study-palette";
import { softDot } from "./study-materials";

/** An authored outdoor radiance field. Linear HDR radiance goes into the existing PMREM pipeline. */
export function studyEnvironment(renderer: T.WebGLRenderer) {
  const scene = new T.Scene();
  const geometry = new T.SphereGeometry(50, 32, 16);
  const material = new T.ShaderMaterial({
    side: T.BackSide, toneMapped: false,
    uniforms: {
      zenith: { value: new T.Color("#b9b8e4") }, horizon: { value: new T.Color("#ffd9bf") },
      ground: { value: new T.Color("#c9a39c") }, sun: { value: new T.Vector3(...STUDY_SUN.direction) },
    },
    vertexShader: "varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: `varying vec3 direction;uniform vec3 zenith,horizon,ground,sun;
      void main(){vec3 d=normalize(direction);vec3 c=mix(horizon,zenith,smoothstep(0.,.8,d.y));
        c=mix(ground*.42,c,smoothstep(-.35,.08,d.y));
        float key=max(0.,dot(d,sun));
        c+=vec3(1.,.941,.847)*(pow(key,40.)*4.+pow(key,4.)*.5);
        c+=vec3(.45,.42,.65)*pow(max(0.,dot(d,normalize(vec3(.7,.4,-.6)))),6.);
        gl_FragColor=vec4(c,1.);}`,
  });
  scene.add(new T.Mesh(geometry, material));
  const generator = new T.PMREMGenerator(renderer);
  const target = generator.fromScene(scene, .025, .1, 100);
  generator.dispose(); geometry.dispose(); material.dispose(); scene.clear();
  return target;
}

/**
 * The TV page's sky (clear air), as the three numbers the sky dome's fragment takes in their
 * place. The wide warm glow round the sun (.20 to .08) and the painted cloud band (.55 to .30)
 * together laid a pale veil over the lower sky; the tight sun core (.5 to .32) was a white
 * glare patch low over the River. The sky colours stay, and the horizon is still the fog colour.
 * GLSL literals, written into the source by `studySkyFragment`.
 */
export const STUDY_TV_SKY = { sunGlow: ".08", sunCore: ".32", cloudBand: ".30" } as const;

/**
 * The sky dome's fragment. Written into the source rather than read from a uniform, so
 * without the TV page it is character for character the study's (the same program), and the
 * TV page's (`STUDY_TV_SKY`) differs and compiles its own. `studyExposure` is Section 8's mood
 * envelope, which dips the whole backdrop a little in flight (the engine dips the TV page's fog
 * colour by the same factor, `studyHazeColor`, so the horizon stays one colour).
 */
export function studySkyFragment(tv = false) {
  const glow = tv ? STUDY_TV_SKY.sunGlow : ".20", core = tv ? STUDY_TV_SKY.sunCore : ".5", band = tv ? STUDY_TV_SKY.cloudBand : ".55";
  return `varying vec3 p;uniform float time,studyExposure;uniform vec3 top,mid,horizon,sun;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
      float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.02+1.71;a*=.5;}return v;}
      void main(){vec3 d=normalize(p);vec3 c=mix(horizon,mid,smoothstep(0.,.18,d.y));c=mix(c,top,smoothstep(.18,.75,d.y));
      float lift=smoothstep(0.,.16,d.y);
      vec2 q=vec2(atan(d.z,d.x)*3.8,d.y*8.);float cloud=smoothstep(.38,.70,fbm(q+vec2(time*.001,0.)))*exp(-pow((d.y-.12)*3.,2.));c=mix(c,vec3(.965,.831,.871),cloud*${band}*lift);
      float key=max(0.,dot(d,sun));c+=vec3(1.,.914,.824)*(pow(key,5.)*${glow}+pow(key,60.)*${core})*lift;c=min(c,vec3(1.))*studyExposure;gl_FragColor=vec4(c,1.);
      #include <colorspace_fragment>
      }`;
}

/**
 * The TV page's sun (clear air): the wide halo was a 150 unit bloom of warm white across the
 * top of the frame, which read as haze. On the TV the two sprites shrink and fade to a sun
 * rather than a veil, in the same colours; the inner one a little further again (from 36 and
 * .32), so it no longer sits on the sky's own core as a white glare patch over the River.
 * Size in world units, then opacity.
 */
export const STUDY_TV_SUN_HALO: ReadonlyArray<readonly [number, number]> = [[90, .2], [30, .24]];

/**
 * Two additive sprites standing in for a low sun behind the world.
 * They sit inside the sky sphere and above the sea, and the caller registers
 * the returned materials and texture for disposal. `tv` (the TV page) takes the
 * `STUDY_TV_SUN_HALO` sizes and opacities; without it both are the study's.
 */
export function studySunHalo(tv = false) {
  const map = softDot(64);
  const at = new T.Vector3(...STUDY_SUN.direction).multiplyScalar(330);
  const sprites: T.Sprite[] = [], materials: T.SpriteMaterial[] = [];
  const authored: Array<[number, string, number]> = [[150, "#ffe2bd", .5], [60, "#fff3dc", .45]];
  const layers = tv ? authored.map(([, color], i) => [STUDY_TV_SUN_HALO[i][0], color, STUDY_TV_SUN_HALO[i][1]] as [number, string, number]) : authored;
  for (const [size, color, opacity] of layers) {
    const material = new T.SpriteMaterial({
      map, color, transparent: true, opacity,
      blending: T.AdditiveBlending, depthWrite: false, depthTest: true, fog: false,
    });
    const sprite = new T.Sprite(material);
    sprite.position.copy(at); sprite.scale.set(size, size, 1); sprite.renderOrder = -50;
    sprites.push(sprite); materials.push(material);
  }
  return { sprites, materials, map };
}

/** Native 4K for the explicit High study tier, with conservative Auto and Low alternatives. */
export function studyPixelRatio(width: number, height: number, dpr: number, quality: string, lowered: boolean) {
  const low = quality === "low" || (quality === "auto" && lowered);
  const budget = low ? 1_050_000 : quality === "high" ? 8_294_400 : 4_147_200;
  return Math.min(dpr || 1, 2, Math.sqrt(budget / (width * height)));
}
