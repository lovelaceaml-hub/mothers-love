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
 * Two additive sprites standing in for a low sun behind the world.
 * They sit inside the sky sphere and above the sea, and the caller registers
 * the returned materials and texture for disposal.
 */
export function studySunHalo() {
  const map = softDot(64);
  const at = new T.Vector3(...STUDY_SUN.direction).multiplyScalar(330);
  const sprites: T.Sprite[] = [], materials: T.SpriteMaterial[] = [];
  for (const [size, color, opacity] of [[150, "#ffe2bd", .5], [60, "#fff3dc", .45]] as Array<[number, string, number]>) {
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
