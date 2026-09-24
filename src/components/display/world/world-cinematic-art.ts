import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { ZONES, seededRandom, type ZoneId } from "./world-data";

/** Decorative art only. Never receives, copies, caches or renders a recognition. */
export type CinematicArt = {
  update(time: number, zone: ZoneId): void;
  setEffects(sparkles: boolean, trails: boolean): void;
  dispose(): void;
};

const PALETTE = ["#f4a9c4", "#dfaee8", "#ffe1aa", "#c3dfd0"];
const TAU = Math.PI * 2;

/** One reversible layer around the existing world, not another renderer or clock. */
export function attachCinematicArt(scene: T.Scene): CinematicArt {
  const root = new T.Group();
  root.name = "Cinematic world art";
  root.userData.dynamic = true;
  const geometries = new Set<T.BufferGeometry>();
  const materials = new Set<T.Material>();
  const textures = new Set<T.Texture>();
  const instances = new Set<T.InstancedMesh>();
  const undo: Array<() => void> = [];
  const zones: Array<{ id: ZoneId; group: T.Group; detail: T.Group }> = [];
  const clock = { value: 0 };
  let disposed = false, sparkleEnabled = true, trailsEnabled = true;
  const geo = <G extends T.BufferGeometry>(g: G): G => { geometries.add(g); return g; };
  const material = <M extends T.Material>(m: M): M => { materials.add(m); return m; };
  const texture = <X extends T.Texture>(t: X): X => { textures.add(t); return t; };
  const pearl = material(new T.MeshPhysicalMaterial({ color: "#fff1df", roughness: .31, metalness: .08, clearcoat: .35, clearcoatRoughness: .24, sheen: .18, sheenColor: new T.Color("#fce7ef") }));
  const gold = material(new T.MeshStandardMaterial({ color: "#cfad76", roughness: .30, metalness: .76 }));
  const bark = material(new T.MeshStandardMaterial({ color: "#997158", roughness: .86 }));
  const leaf = material(new T.MeshStandardMaterial({ color: "#86b5a0", roughness: .8, side: T.DoubleSide }));
  const petals = material(new T.MeshPhysicalMaterial({ color: "#ffffff", roughness: .58, metalness: 0, side: T.DoubleSide, sheen: .42, sheenRoughness: .7, sheenColor: new T.Color("#ffe7e7") }));
  const stone = material(new T.MeshStandardMaterial({ color: "#bbd2c8", roughness: .92 }));
  const cylinder = geo(new T.CylinderGeometry(1, 1, 1, 24));
  const plane = geo(new T.PlaneGeometry(1, 1));
  const dummy = new T.Object3D();
  const color = new T.Color();

  function add(parent: T.Object3D, g: T.BufferGeometry, m: T.Material, p: readonly number[] = [0, 0, 0], s: readonly number[] = [1, 1, 1]) {
    const mesh = new T.Mesh(g, m); mesh.position.set(p[0], p[1], p[2]); mesh.scale.set(s[0], s[1], s[2]); parent.add(mesh); return mesh;
  }
  function curve(parent: T.Object3D, points: T.Vector3[], radius: number, m: T.Material = gold) {
    return add(parent, geo(new T.TubeGeometry(new T.CatmullRomCurve3(points), 36, radius, 6, false)), m);
  }
  function instanced(parent: T.Object3D, g: T.BufferGeometry, m: T.Material, count: number) {
    const result = new T.InstancedMesh(g, m, count); instances.add(result); parent.add(result); return result;
  }
  function stamp(target: T.InstancedMesh, index: number, p: T.Vector3, scale: T.Vector3, rotation: T.Euler, tint?: string) {
    dummy.position.copy(p); dummy.scale.copy(scale); dummy.rotation.copy(rotation); dummy.updateMatrix(); target.setMatrixAt(index, dummy.matrix);
    if (tint) target.setColorAt(index, color.set(tint));
  }
  function finish(target: T.InstancedMesh) {
    target.instanceMatrix.needsUpdate = true; if (target.instanceColor) target.instanceColor.needsUpdate = true;
    target.computeBoundingBox(); target.computeBoundingSphere();
  }

  function batchOpaque(parent: T.Group) {
    parent.updateWorldMatrix(true, true);
    const inverse = parent.matrixWorld.clone().invert();
    const byMaterial = new Map<T.Material, T.Mesh[]>();
    parent.traverse(node => {
      if (!(node instanceof T.Mesh) || node instanceof T.InstancedMesh || Array.isArray(node.material) || node.material.transparent || node.children.length) return;
      const list = byMaterial.get(node.material) ?? []; list.push(node); byMaterial.set(node.material, list);
    });
    byMaterial.forEach((list, mat) => {
      if (list.length < 3) return;
      const copies = list.map(mesh => {
        const copy = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
        copy.deleteAttribute("uv"); copy.applyMatrix4(inverse.clone().multiply(mesh.matrixWorld)); return copy;
      });
      const merged = mergeGeometries(copies, false); copies.forEach(copy => copy.dispose());
      if (!merged) return;
      list.forEach(mesh => mesh.removeFromParent()); parent.add(new T.Mesh(geo(merged), mat));
    });
  }

  // One shared sculpted petal surface. Leaf veins remain geometry, not noisy opacity.
  const petal = geo(new T.PlaneGeometry(1, 1, 10, 6));
  const pa = petal.getAttribute("position"), puv = petal.getAttribute("uv");
  for (let i = 0; i < pa.count; i++) {
    const u = puv.getY(i), v = puv.getX(i) * 2 - 1;
    const span = Math.pow(Math.max(0, Math.sin(Math.PI * u)), .72);
    pa.setXYZ(i, v * span * .48, .42 * u * u - .17 * Math.sin(Math.PI * u) + v * v * .12 * span, u);
  }
  petal.computeVertexNormals(); petal.computeBoundingSphere();

  // Shared soft contact shadow texture: no global darkening of reading textures.
  const shadowCanvas = document.createElement("canvas"); shadowCanvas.width = shadowCanvas.height = 64;
  const ctx = shadowCanvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(66,66,81,.32)"); g.addColorStop(.4, "rgba(85,76,91,.15)"); g.addColorStop(1, "rgba(85,76,91,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  }
  const shadowMap = texture(new T.CanvasTexture(shadowCanvas)); shadowMap.colorSpace = T.SRGBColorSpace;
  const shadow = material(new T.MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false, toneMapped: false }));
  function contact(parent: T.Object3D, x: number, z: number, sx: number, sz: number, y = .62) {
    const m = add(parent, plane, shadow, [x, y, z], [sx, sz, 1]); m.rotation.x = -Math.PI / 2; return m;
  }

  // Delicate PBR updates are restricted to opaque architectural source materials.
  // The original material references are restored before legacy disposal.
  const replacements = new Map<T.Material, T.Material>();
  const architecturalColors = new Set(["fff7e7", "fff0d6", "d6ad69", "e9b969"]);
  scene.traverse((node) => {
    if (!(node instanceof T.Mesh) || Array.isArray(node.material)) return;
    const original = node.material;
    if (!(original instanceof T.MeshStandardMaterial) || original.transparent || node.userData.dynamic) return;
    if (!architecturalColors.has(original.color.getHexString())) return;
    let replacement = replacements.get(original);
    if (!replacement) {
      const metallic = ["d6ad69", "e9b969"].includes(original.color.getHexString());
      replacement = material(new T.MeshPhysicalMaterial({ color: metallic ? "#d1ad78" : "#fff2e0", roughness: metallic ? .30 : .35, metalness: metallic ? .72 : .08, clearcoat: metallic ? .08 : .28, clearcoatRoughness: .26 }));
      replacements.set(original, replacement);
    }
    node.material = replacement; undo.push(() => { node.material = original; });
  });

  // Only known low-detail canopy/trunk batches are replaced; unrelated instancing survives.
  scene.traverse((node) => {
    if (!(node instanceof T.InstancedMesh)) return;
    const type = node.geometry.type;
    if ((type === "SphereGeometry" && node.count === ZONES.length * 6 * 7) || (type === "CylinderGeometry" && node.count === ZONES.length * 6)) {
      const wasVisible = node.visible; node.visible = false; undo.push(() => { node.visible = wasVisible; });
    }
  });

  // Clouds are an atmospheric background, not more foreground particles.
  const skyMaterial = material(new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, uniforms: { uTime: clock },
    vertexShader: `varying vec3 direction; void main(){ direction=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 direction; uniform float uTime;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
      float cloud(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=n(p)*a;p=p*2.03+vec2(.2,1.3);a*=.5;}return v;}
      void main(){vec3 d=normalize(direction);float y=smoothstep(-.14,.85,d.y);
        vec3 c=mix(vec3(.99,.82,.74),vec3(.57,.66,.85),y);
        float az=atan(d.z,d.x), f=cloud(vec2(az*4.+uTime*.002,d.y*9.));
        float bank=smoothstep(.39,.75,f)*exp(-pow((d.y-.18)*2.9,2.));
        c=mix(c,vec3(.98,.96,.96),bank*.74);
        float sun=pow(max(0.,dot(d,normalize(vec3(-.5,.30,.4)))),24.);
        c+=sun*vec3(.18,.13,.075);gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` }));
  scene.traverse((node) => {
    if (!(node instanceof T.Mesh) || Array.isArray(node.material)) return;
    if (node.geometry.type === "SphereGeometry" && node.material instanceof T.ShaderMaterial && node.material.side === T.BackSide) {
      const was = node.visible; node.visible = false; undo.push(() => { node.visible = was; });
    }
  });
  const sky = add(root, geo(new T.SphereGeometry(395, 24, 16)), skyMaterial); sky.renderOrder = -100;
  const originalFog = scene.fog;
  scene.fog = new T.FogExp2("#d9dce9", .0036);
  undo.push(() => { scene.fog = originalFog; });

  const waterMaterial = material(new T.ShaderMaterial({ uniforms: { uTime: clock },
    vertexShader: `varying vec3 world; void main(){vec4 w=modelMatrix*vec4(position,1.);world=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `varying vec3 world; uniform float uTime;
      void main(){vec2 p=world.xz;float a=sin(p.x*.17+sin(p.y*.11+uTime*.09)*1.6);float b=sin(p.y*.29+p.x*.08-uTime*.16);
        float glint=pow(max(0.,a*b),22.);vec3 c=mix(vec3(.26,.57,.61),vec3(.64,.80,.79),.48+a*.11);
        c+=glint*vec3(.18,.15,.095);float horizon=smoothstep(40.,220.,length(cameraPosition.xz-p));
        c=mix(c,vec3(.83,.83,.88),horizon*.65);gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` }));
  scene.traverse((node) => {
    if (!(node instanceof T.Mesh) || Array.isArray(node.material)) return;
    const params = (node.geometry as T.CircleGeometry).parameters;
    if (node.geometry.type === "CircleGeometry" && params.radius > 180 && node.material instanceof T.ShaderMaterial) {
      const old = node.material; node.material = waterMaterial; undo.push(() => { node.material = old; });
    }
  });

  function blossomTree(parent: T.Group, x: number, z: number, scale: number, tint: string, variant: number) {
    const random = seededRandom(1100 + variant);
    const group = new T.Group(); group.position.set(x, .55, z); group.scale.setScalar(scale); parent.add(group);
    curve(group, [new T.Vector3(0, 0, 0), new T.Vector3(.16, 2, .08), new T.Vector3(-.10, 4.4, 0)], .13, bark);
    const blooms = instanced(group, petal, petals, 28 * 6);
    let k = 0;
    for (let branch = 0; branch < 7; branch++) {
      const a = branch * 2.399, reach = 1.65 + random() * .55, y = 2.55 + random() * 1.2;
      curve(group, [new T.Vector3(.02, 1.45, 0), new T.Vector3(Math.cos(a) * reach * .48, y, Math.sin(a) * reach * .48), new T.Vector3(Math.cos(a) * reach, y + .85, Math.sin(a) * reach)], .045, bark);
      for (let flower = 0; flower < 4; flower++) {
        const p = new T.Vector3(Math.cos(a) * reach + (random() - .5) * 1.4, y + .3 + random() * 1.1, Math.sin(a) * reach + (random() - .5) * 1.4);
        for (let j = 0; j < 6; j++) stamp(blooms, k++, p, new T.Vector3(.69, .69, .69), new T.Euler(.22, j * TAU / 6 + flower, .10), tint);
      }
    }
    finish(blooms); contact(parent, x, z, scale * 5.5, scale * 4);
    return group;
  }

  function flowerBed(parent: T.Group, x: number, z: number, seed: number, tint: string) {
    const random = seededRandom(seed), count = 16;
    const b = instanced(parent, petal, petals, count * 9), s = instanced(parent, cylinder, leaf, count);
    let k = 0;
    for (let i = 0; i < count; i++) {
      const a = random() * TAU, r = Math.sqrt(random()) * 2.2;
      const p = new T.Vector3(x + Math.cos(a) * r, .85 + random() * .9, z + Math.sin(a) * r), size = .36 + random() * .18;
      stamp(s, i, new T.Vector3(p.x, .6 + (p.y - .6) / 2, p.z), new T.Vector3(.04, p.y - .6, .04), new T.Euler());
      for (let j = 0; j < 9; j++) stamp(b, k++, p, new T.Vector3(size, size, size), new T.Euler(.35, j * TAU / 9, .0), j % 3 ? tint : "#fff0d3");
    }
    finish(b); finish(s); contact(parent, x, z, 5.8, 4.2);
  }

  function arcade(parent: T.Group, width: number, height: number, count: number) {
    for (let i = 0; i < count; i++) {
      const x = (i - (count - 1) / 2) * width * 1.2;
      const points = Array.from({ length: 20 }, (_, j) => { const a = j / 19 * Math.PI; return new T.Vector3(x + Math.cos(a) * width / 2, height * .53 + Math.sin(a) * height * .47, 0); });
      curve(parent, points, .20, pearl);
      curve(parent, points.map(p => p.clone().add(new T.Vector3(0, .03, .18))), .018, gold);
      for (const side of [-1, 1]) {
        const cx = x + side * width / 2;
        add(parent, cylinder, pearl, [cx, height * .265, 0], [.24, height * .53, .24]);
        for (const y of [.15, height * .51]) add(parent, cylinder, gold, [cx, y, 0], [.32, .08, .32]);
        contact(parent, cx, 0, 1.7, 1.2, .01);
      }
    }
  }

  const terrace = geo(new T.LatheGeometry([new T.Vector2(0, -.5), new T.Vector2(.82, -.5), new T.Vector2(1, -.30), new T.Vector2(1, -.12), new T.Vector2(.985, 0), new T.Vector2(0, 0)], 72));
  const waterfalls: T.Mesh[] = [];
  const fallMaterial = material(new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec2 v;uniform float uTime;void main(){float edge=pow(sin(v.x*3.1415926),.75);float strands=.64+.36*sin(v.x*85.+sin(v.y*8.-uTime*.8)*.5);float light=pow(max(0.,sin(v.x*39.+v.y*11.-uTime)),10.);vec3 c=mix(vec3(.68,.85,.85),vec3(.97,.97,.96),strands);gl_FragColor=vec4(c,(.13+strands*.16+light*.07)*edge*smoothstep(0.,.10,v.y));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` }));

  // An ornament family is shared, but each destination has a distinct composition.
  ZONES.forEach((zone, index) => {
    const group = new T.Group(), detail = new T.Group();
    group.name = `Art district: ${zone.id}`; group.position.fromArray(zone.center); root.add(group); group.add(detail);
    const facing = new T.Vector3(zone.eye[0] - zone.center[0], 0, zone.eye[2] - zone.center[2]).normalize();
    const side = new T.Vector3(facing.z, 0, -facing.x);
    const back = facing.clone().multiplyScalar(-11);
    const frame = new T.Group(); frame.position.copy(back); frame.rotation.y = Math.atan2(facing.x, facing.z); group.add(frame);
    if (["heart", "featured", "welcome"].includes(zone.id)) {
      arcade(frame, zone.id === "heart" ? 7 : 5.5, zone.id === "heart" ? 13 : 10, 3);
      const canopy = new T.Group(); canopy.position.set(0, 9, -1.2); frame.add(canopy);
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 5;
        curve(canopy, [new T.Vector3(Math.cos(a) * 8, 0, -2), new T.Vector3(Math.cos(a) * 4, 4, -2), new T.Vector3(0, 5.3, -2)], .055, gold);
      }
    } else if (["garden", "practice", "promise", "expressions"].includes(zone.id)) {
      arcade(frame, 4.4, 8, zone.id === "expressions" ? 5 : 3);
    } else if (["status", "calendar"].includes(zone.id)) {
      arcade(frame, 3.6, 8, 5);
      for (let i = 0; i < 3; i++) {
        const p = side.clone().multiplyScalar((i - 1) * 5).add(back.clone().multiplyScalar(.65));
        add(group, terrace, pearl, [p.x, .75, p.z], [2, .50, 2]);
      }
    } else if (["orbit", "milestone"].includes(zone.id)) {
      arcade(frame, 5.5, 11, 3);
      // Curtains descend from high islands, not through the active reading volume.
      for (const sign of [-1, 1]) {
        const p = side.clone().multiplyScalar(sign * 14).add(back.clone().multiplyScalar(.4));
        const fall = add(group, plane, fallMaterial, [p.x, -8, p.z], [2.2, 18, 1]);
        fall.rotation.y = frame.rotation.y; waterfalls.push(fall);
      }
    } else if (zone.id === "peacemakers") {
      arcade(frame, 5.2, 10, 3);
    } else {
      arcade(frame, 5.5, 7.5, 2);
    }
    // The visitor-facing forecourt is deliberately left clear for world-space messages.
    for (const sign of [-1, 1]) {
      const p = side.clone().multiplyScalar(sign * 14).add(back.clone().multiplyScalar(.30));
      blossomTree(detail, p.x, p.z, 1.25 + index % 3 * .12, PALETTE[(index + (sign > 0 ? 1 : 0)) % 4], index * 7 + (sign > 0 ? 3 : 1));
      const q = side.clone().multiplyScalar(sign * 10).add(back.clone().multiplyScalar(.15));
      flowerBed(detail, q.x, q.z, 350 + index * 2 + sign, PALETTE[index % 4]);
    }
    // Background planting anchors the arcade, rather than placing more objects over the bubble.
    for (let j = 0; j < 3; j++) {
      const p = back.clone().addScaledVector(side, (j - 1) * 6);
      flowerBed(detail, p.x, p.z, 510 + index * 3 + j, PALETTE[(index + j) % 4]);
    }
    batchOpaque(frame); batchOpaque(detail);
    zones.push({ id: zone.id, group, detail });
  });

  // Floating landscape silhouettes and waterfalls create anticipation between destinations.
  const distant = new T.Group(); distant.name = "Distant floating gardens"; root.add(distant);
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * TAU, g = new T.Group(); g.position.set(Math.cos(a) * 130, 28 + i % 3 * 13, -20 + Math.sin(a) * 132); distant.add(g);
    const radius = 8 + i % 3 * 2;
    add(g, terrace, pearl, [0, 0, 0], [radius, 2, radius * .76]);
    const underside = geo(new T.ConeGeometry(radius * .92, 13, 36, 5));
    const pos = underside.getAttribute("position");
    for (let k = 0; k < pos.count; k++) { const x = pos.getX(k), z = pos.getZ(k); const f = 1 + Math.sin(x * .46 + z * .23) * .065; pos.setXYZ(k, x * f, pos.getY(k), z * f); }
    underside.computeVertexNormals(); add(g, underside, stone, [0, -6.8, 0]).rotation.z = Math.PI;
    const p = new T.Group(); p.position.set(0, 0, -2); p.scale.setScalar(.48); g.add(p); arcade(p, 4.5, 7.5, 2);
    blossomTree(g, -radius * .50, 1, .55, PALETTE[i % 4], 1700 + i);
    if (i % 2 === 0) {
      const fall = add(g, plane, fallMaterial, [radius * .55, -13, 2], [1.9, 25, 1]); fall.rotation.y = -a + Math.PI / 2; waterfalls.push(fall);
    }
  }

  batchOpaque(distant);

  // A few soft, correctly textured lights; no uniform screen-sized spray of dots.
  const lightCanvas = document.createElement("canvas"); lightCanvas.width = lightCanvas.height = 32;
  const lc = lightCanvas.getContext("2d");
  if (lc) { const g = lc.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, "#fff9e8"); g.addColorStop(.16, "#fff2c1a0"); g.addColorStop(1, "#fff2c100"); lc.fillStyle = g; lc.fillRect(0, 0, 32, 32); }
  const lightMap = texture(new T.CanvasTexture(lightCanvas)); lightMap.colorSpace = T.SRGBColorSpace;
  const lightMat = material(new T.PointsMaterial({ map: lightMap, size: .26, opacity: .55, transparent: true, depthWrite: false, toneMapped: false, color: "#fff1c8" }));
  const points = new Float32Array(128 * 3), random = seededRandom(6631);
  for (let i = 0; i < 128; i++) { points[i * 3] = (random() - .5) * 34; points[i * 3 + 1] = 3 + random() * 14; points[i * 3 + 2] = (random() - .5) * 24; }
  const pointsGeo = geo(new T.BufferGeometry()); pointsGeo.setAttribute("position", new T.BufferAttribute(points, 3));
  const lights = new T.Points(pointsGeo, lightMat); root.add(lights);
  scene.add(root);

  const activeCenter = new T.Vector3();
  const inspection = { zoneCount: zones.length, active: "garden" as ZoneId, disposed: false, source: "decorative-only" };
  root.userData.inspect = inspection;

  // Do not change tone mapping, camera paths, source data or reading clocks.
  // Detail activity follows the existing zone director and its pause/still time.
  return {
    update(time, activeId) {
      if (disposed) return;
      clock.value = time;
      const active = ZONES.find(z => z.id === activeId) ?? ZONES[0];
      const center = activeCenter.fromArray(active.center);
      for (const district of zones) {
        const distance = district.group.position.distanceTo(center);
        district.group.visible = distance < 175;
        district.detail.visible = distance < 78;
      }
      lights.position.copy(center);
      lights.rotation.y = Math.sin(time * .028) * .1;
      lights.visible = sparkleEnabled;
      fallMaterial.uniforms.uTime.value = trailsEnabled ? time : 0;
      for (const fall of waterfalls) fall.visible = true;
      inspection.active = activeId;
    },
    setEffects(sparkles, trails) {
      sparkleEnabled = sparkles; trailsEnabled = trails;
      lights.visible = sparkles;
      // The decorative waterfalls remain scenery when trails are disabled, but do not animate.
    },
    dispose() {
      if (disposed) return; disposed = true; inspection.disposed = true;
      root.removeFromParent(); undo.reverse().forEach(restore => restore());
      instances.forEach(mesh => mesh.dispose()); geometries.forEach(g => g.dispose());
      materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
      root.clear();
    },
  };
}
