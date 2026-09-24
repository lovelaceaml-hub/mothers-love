import * as T from "three";
import { ZONES } from "../world-data";
import type { HeavenlyDistrictKit } from "./district-kit";

/** The sky dome, the ring of soft clouds and the island groves. */
export function districtSky({ mesh, root, scene, random, gold }: HeavenlyDistrictKit) {
  // Smooth multicolored sky, with a broad warm sun glow instead of a flat backdrop.
  const sky = new T.ShaderMaterial({
    side: T.BackSide,
    depthWrite: false,
    uniforms: { time: { value: 0 } },
    vertexShader:
      "varying vec3 v; void main(){v=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: `varying vec3 v; uniform float time;
      void main(){
        vec3 d=normalize(v);
        float h=smoothstep(-.08,.85,d.y);
        vec3 c=mix(vec3(1.,.88,.80),vec3(.43,.70,.96),h);
        float sun=pow(max(dot(d,normalize(vec3(-.5,.4,-.6))),0.),18.);
        c+=vec3(.25,.16,.07)*sun;
        float wave=sin(d.x*5.+d.z*3.+sin(d.z*7.+time*.022)*.5+time*.018);
        float veil=pow(max(0.,1.-abs(d.y-.37-wave*.085)*9.),3.);
        float ribbons=smoothstep(.08,.38,d.y)*veil*.21;
        c=mix(c,vec3(.90,.65,.91),ribbons*(.65+.35*sin(d.z*5.+time*.025)));
        c+=vec3(.12,.15,.12)*ribbons;
        gl_FragColor=vec4(c,1.);
      }`,
  });
  mesh(new T.SphereGeometry(400, 32, 20), sky, root);
  scene.background = null;
  // Layered soft clouds from a local radial texture. Instanced foliage remains inexpensive.
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    for (let i = 0; i < 5; i++) {
      const x = 22 + i * 20,
        y = 31 + (i % 2 ? 4 : -4),
        g = ctx.createRadialGradient(x, y, 1, x, y, 26);
      g.addColorStop(0, "#fff8edee");
      g.addColorStop(0.5, "#fff8edaa");
      g.addColorStop(1, "#fff8ed00");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 64);
    }
  }
  const cloudTexture = new T.CanvasTexture(canvas),
    cloudMat = new T.SpriteMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
  for (let i = 0; i < 34; i++) {
    const c = new T.Sprite(cloudMat),
      a = (i / 34) * Math.PI * 2;
    c.position.set(
      Math.cos(a) * (145 + random() * 40),
      12 + random() * 23,
      Math.sin(a) * 145 - 25,
    );
    c.scale.set(45 + random() * 50, 20 + random() * 12, 1);
    root.add(c);
  }
  const trees = ZONES.flatMap((z) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2;
      return {
        x: z.center[0] + Math.cos(a) * 18,
        y: z.center[1],
        z: z.center[2] + Math.sin(a) * 18,
        scale: 0.65 + random() * 0.6,
      };
    }),
  );
  const trunks = new T.InstancedMesh(
    new T.CylinderGeometry(0.15, 0.38, 4, 7),
    gold,
    trees.length,
  );
  const crowns = new T.InstancedMesh(
    new T.SphereGeometry(1, 9, 7),
    new T.MeshStandardMaterial({ color: "#ffffff", roughness: 0.7 }),
    trees.length * 7,
  );
  root.add(trunks, crowns);
  const dummy = new T.Object3D();
  trees.forEach((tree, i) => {
    dummy.position.set(tree.x, tree.y + 2 * tree.scale, tree.z);
    dummy.scale.setScalar(tree.scale);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    for (let n = 0; n < 7; n++) {
      const a = n * 2.4;
      dummy.position.set(
        tree.x + Math.cos(a) * 1.3 * tree.scale,
        tree.y + (4 + random() * 1.4) * tree.scale,
        tree.z + Math.sin(a) * 1.3 * tree.scale,
      );
      dummy.scale.set(1.8 * tree.scale, 1.2 * tree.scale, 1.7 * tree.scale);
      dummy.updateMatrix();
      crowns.setMatrixAt(i * 7 + n, dummy.matrix);
      crowns.setColorAt(
        i * 7 + n,
        new T.Color(["#f69bb9", "#dca0dd", "#ffd88d", "#91c5ae"][i % 4]),
      );
    }
  });
  return { sky, cloudTexture, dummy };
}
