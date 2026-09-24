import * as THREE from "three";
import { ZONES } from "../world-data";
import type { LegacySceneKit } from "./scene-kit";

/** The ground, the soft hills, the pearl waterway and the paths between the three islands. */
export function legacyTerrain({
  mesh, ground, scene, orb, mint, random, materials, pearl, gold,
}: LegacySceneKit) {
  mesh(new THREE.CircleGeometry(235, 96), ground, scene, 0, -0.7).rotation.x =
    -Math.PI / 2;
  // Shared world terrain: soft hills behind a broad pearl waterway.
  for (let i = 0; i < 30; i++) {
    const angle = (i / 30) * Math.PI * 2;
    const hill = orb(
      scene,
      i % 3 ? mint : ground,
      Math.cos(angle) * (110 + random() * 35),
      -4,
      Math.sin(angle) * 110 - 15,
      1,
    );
    hill.scale.set(18 + random() * 20, 8 + random() * 10, 22 + random() * 20);
  }
  const water = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader:
      "varying vec2 v; void main(){v=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: `varying vec2 v; uniform float time;
    void main(){float a=sin(v.x*.18+sin(v.y*.15+time*.08)*2.+time*.12); float b=sin(v.y*.45-v.x*.21+time*.2);float glint=pow(max(0.,a*b),14.);vec3 color=mix(vec3(.38,.72,.73),vec3(.70,.86,.83),a*.25+.5);color+=vec3(.30,.24,.14)*glint;gl_FragColor=vec4(color,1.);}`,
  });
  materials.push(water);
  mesh(
    new THREE.CircleGeometry(220, 96),
    water,
    scene,
    0,
    -0.3,
    -13,
  ).rotation.x = -Math.PI / 2;
  function path(
    points: THREE.Vector3[],
    radius: number,
    material: THREE.Material,
  ) {
    return mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        80,
        radius,
        8,
        false,
      ),
      material,
      scene,
    );
  }
  // Paths physically join the islands and remain visible during travel.
  for (let i = 0; i < 3; i++) {
    const a = new THREE.Vector3(...ZONES[i].center),
      b = new THREE.Vector3(...ZONES[(i + 1) % 3].center);
    const mid = a.clone().lerp(b, 0.5);
    mid.y = 1.1;
    path([a.setY(0.1), mid, b.setY(0.1)], 1.65, pearl).scale.y = 0.3;
    for (let n = 1; n < 10; n++) {
      const p = a.clone().lerp(b, n / 10);
      orb(scene, gold, p.x + 2.1, 0.5, p.z, 0.14);
    }
  }
  return { water };
}
