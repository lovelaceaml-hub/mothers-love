import * as T from "three";
import { batchScenery } from "./static-batch";
import {
  seededRandom,
  WORLD_EXPRESSIONS,
  ZONES,
  zoneIndex,
  type ZoneId,
} from "./world-data";
import type { ArrivalState } from "./arrival-director";

export function createHeavenlyDistricts(scene: T.Scene) {
  const root = new T.Group();
  scene.add(root);
  const random = seededRandom(92),
    animated: Array<(time: number, zone: ZoneId) => void> = [];
  const pearl = new T.MeshStandardMaterial({
    color: "#fff0d6",
    roughness: 0.3,
    metalness: 0.15,
  });
  const gold = new T.MeshStandardMaterial({
    color: "#e9b969",
    roughness: 0.3,
    metalness: 0.65,
  });
  const leaf = new T.MeshStandardMaterial({
    color: "#85baab",
    roughness: 0.65,
  });
  const rose = new T.MeshStandardMaterial({
    color: "#f28da6",
    roughness: 0.32,
    metalness: 0.15,
  });
  const glow = new T.MeshBasicMaterial({ color: "#ffe6a5", toneMapped: false });
  const glass = new T.MeshPhysicalMaterial({
    color: "#ace3e7",
    transparent: true,
    opacity: 0.35,
    roughness: 0.12,
    metalness: 0.25,
    depthWrite: false,
    side: T.DoubleSide,
  });
  const sphere = new T.SphereGeometry(1, 18, 12);
  function mesh(
    geo: T.BufferGeometry,
    mat: T.Material,
    parent: T.Object3D,
    pos: [number, number, number] = [0, 0, 0],
  ) {
    const object = new T.Mesh(geo, mat);
    object.position.set(...pos);
    parent.add(object);
    return object;
  }
  function orb(
    parent: T.Object3D,
    mat: T.Material,
    x: number,
    y: number,
    z: number,
    r: number,
  ) {
    const o = mesh(sphere, mat, parent, [x, y, z]);
    o.scale.setScalar(r);
    return o;
  }
  function ring(
    parent: T.Object3D,
    r: number,
    y: number,
    material: T.Material = gold,
    tube = 0.06,
  ) {
    const o = mesh(new T.TorusGeometry(r, tube, 8, 80), material, parent, [
      0,
      y,
      0,
    ]);
    o.rotation.x = Math.PI / 2;
    return o;
  }
  function tube(
    parent: T.Object3D,
    points: T.Vector3[],
    radius: number,
    material: T.Material = gold,
  ) {
    return mesh(
      new T.TubeGeometry(new T.CatmullRomCurve3(points), 60, radius, 6, false),
      material,
      parent,
    );
  }
  function island(id: ZoneId, radius = 15) {
    const zone = ZONES[zoneIndex(id)],
      group = new T.Group();
    group.position.fromArray(zone.center);
    root.add(group);
    mesh(
      new T.CylinderGeometry(radius, radius + 0.6, 0.8, 64),
      pearl,
      group,
      [0, 0.1, 0],
    );
    mesh(
      new T.ConeGeometry(radius, 9, 24),
      new T.MeshStandardMaterial({
        color: "#aacdc2",
        roughness: 0.9,
        flatShading: true,
      }),
      group,
      [0, -4.7, 0],
    ).rotation.z = Math.PI;
    ring(group, radius - 0.3, 0.6);
    return group;
  }
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
  // Welcome: layered pearl arch with petal-shaped butterfly forms.
  const welcome = island("welcome", 17);
  for (let n = 0; n < 3; n++) {
    const arch = mesh(
      new T.TorusGeometry(7.5 + n * 0.7, 0.16, 10, 80, Math.PI),
      n === 1 ? gold : pearl,
      welcome,
      [0, 3, -n * 0.8],
    );
    for (const side of [-1, 1])
      mesh(new T.CylinderGeometry(0.16, 0.3, 3, 10), pearl, welcome, [
        side * (7.5 + n * 0.7),
        1.5,
        -n * 0.8,
      ]);
    arch.rotation.y = 0.08;
  }
  const butterflies = new T.Group();
  welcome.add(butterflies);
  for (let i = 0; i < 14; i++) {
    const b = new T.Group();
    const a = i * 2.4;
    b.position.set(
      Math.cos(a) * (4 + random() * 4),
      3 + random() * 7,
      Math.sin(a) * 4,
    );
    b.rotation.z = random() - 0.5;
    butterflies.add(b);
    for (const side of [-1, 1]) {
      const wing = orb(b, i % 2 ? rose : gold, side * 0.34, 0, 0, 0.55);
      wing.scale.set(0.5, 0.7, 0.075);
      wing.rotation.z = -side * 0.5;
    }
  }
  animated.push((t) => {
    butterflies.rotation.y = Math.sin(t * 0.1) * 0.12;
  });
  // Featured pavilion: a pearl canopy and illuminated central jewel.
  const pavilion = island("featured", 14);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    mesh(new T.CylinderGeometry(0.2, 0.35, 7, 12), pearl, pavilion, [
      Math.cos(a) * 7,
      4,
      Math.sin(a) * 7,
    ]);
    orb(pavilion, gold, Math.cos(a) * 7, 7.7, Math.sin(a) * 7, 0.3);
  }
  const canopy = mesh(
    new T.SphereGeometry(8, 40, 18, 0, Math.PI * 2, 0, Math.PI / 2),
    glass,
    pavilion,
    [0, 7.6, 0],
  );
  canopy.scale.y = 0.38;
  ring(pavilion, 8, 7.6);
  orb(pavilion, rose, 0, 4, 0, 2);
  ring(pavilion, 3.2, 1.1);
  // Calendar: thirty-one architectural tiles following a real calendar rhythm.
  const calendar = island("calendar", 17);
  for (let i = 0; i < 31; i++) {
    const x = ((i % 7) - 3) * 3.3,
      z = (Math.floor(i / 7) - 2) * 3.3;
    mesh(
      new T.BoxGeometry(2.7, 0.35 + (i % 4) * 0.15, 2.7),
      i % 5 ? pearl : rose,
      calendar,
      [x, 1 + (i % 4) * 0.075, z],
    );
  }
  ring(calendar, 15.4, 0.7);
  // Globe: luminous meridians and abstract land constellations. Not a geographic map.
  const globe = island("peacemakers", 16),
    earth = new T.Group();
  earth.position.y = 8;
  globe.add(earth);
  orb(earth, glass, 0, 0, 0, 6.5);
  for (let i = 0; i < 7; i++) {
    const r = mesh(new T.TorusGeometry(6.6, 0.026, 6, 80), gold, earth);
    r.rotation.y = (i * Math.PI) / 7;
  }
  for (let i = -2; i <= 2; i++) {
    const y = i * 1.9;
    ring(earth, Math.sqrt(6.6 * 6.6 - y * y), y, gold, 0.025);
  }
  for (let i = 0; i < 85; i++) {
    const phi = Math.acos(2 * random() - 1),
      theta = random() * Math.PI * 2;
    if (Math.sin(theta * 3 + phi * 2) > 0.05)
      orb(
        earth,
        leaf,
        6.55 * Math.sin(phi) * Math.cos(theta),
        6.55 * Math.cos(phi),
        6.55 * Math.sin(phi) * Math.sin(theta),
        0.18 + random() * 0.18,
      );
  }
  const arcPoints = Array.from({ length: 35 }, (_, i) => {
    const a = (i / 34) * Math.PI;
    return new T.Vector3(
      Math.cos(a) * 8.4,
      Math.sin(a) * 9 - 1,
      1.8 * Math.sin(a),
    );
  });
  tube(earth, arcPoints, 0.045, glow);
  animated.push((t, z) => {
    if (z === "peacemakers") earth.rotation.y = t * 0.035;
  });
  // Observatory: nine living, colored columns beneath a suspended astrolabe.
  const observatory = island("status", 16);
  WORLD_EXPRESSIONS.forEach((e, i) => {
    const a = (i / 9) * Math.PI * 2,
      h = 2 + (i % 4) * 0.8;
    mesh(
      new T.CylinderGeometry(1, 1.4, h, 24),
      new T.MeshStandardMaterial({
        color: e.color,
        roughness: 0.3,
        metalness: 0.25,
      }),
      observatory,
      [Math.cos(a) * 9, h / 2 + 0.8, Math.sin(a) * 9],
    );
    orb(observatory, pearl, Math.cos(a) * 9, h + 1, Math.sin(a) * 9, 0.5);
  });
  const astrolabe = new T.Group();
  astrolabe.position.y = 8;
  observatory.add(astrolabe);
  for (let i = 0; i < 3; i++) {
    const ring = mesh(
      new T.TorusGeometry(4 + i * 0.4, 0.065, 8, 80),
      gold,
      astrolabe,
    );
    ring.rotation.set(i * 0.7, i * 0.8, 0);
  }
  orb(astrolabe, glass, 0, 0, 0, 2.2);
  animated.push((t, z) => {
    if (z === "status") astrolabe.rotation.y = t * 0.08;
  });
  // Genuine XYZ orbital paths, with foreground and background pearls.
  const cosmos = island("orbit", 17),
    orbits = new T.Group();
  orbits.position.y = 7;
  cosmos.add(orbits);
  orb(orbits, rose, 0, 0, 0, 2.8);
  const planets: T.Mesh[] = [];
  for (let i = 0; i < 18; i++) {
    const p = orb(orbits, i % 3 ? pearl : gold, 0, 0, 0, 0.35 + (i % 3) * 0.22);
    planets.push(p);
  }
  for (let i = 0; i < 3; i++) {
    const r = ring(orbits, 6 + i * 2.2, 0, gold, 0.03);
    r.rotation.z = 0.25 + i * 0.33;
  }
  animated.push((t, z) => {
    if (z === "orbit" || t === 0)
      planets.forEach((p, i) => {
        const a = (i / 18) * Math.PI * 2 + t * (0.09 + (i % 3) * 0.015),
          r = 6 + (i % 3) * 2.2;
        p.position.set(
          Math.cos(a) * r,
          Math.sin(a * 0.7 + i) * 2.5,
          Math.sin(a) * r,
        );
      });
  });
  // Milestone fountain: a true rising helix of pearls and champagne filaments.
  const fountain = island("milestone", 17),
    vortex = new T.Group();
  fountain.add(vortex);
  const vortexPearls: T.Mesh[] = [];
  for (let i = 0; i < 65; i++)
    vortexPearls.push(
      orb(vortex, i % 5 ? pearl : gold, 0, 0, 0, 0.18 + (i % 6) * 0.1),
    );
  for (let n = 0; n < 4; n++) {
    const points = Array.from({ length: 100 }, (_, i) => {
      const u = i / 99,
        a = u * Math.PI * 5 + (n * Math.PI) / 2,
        r = 2 + u * 7;
      return new T.Vector3(Math.cos(a) * r, 1 + u * 18, Math.sin(a) * r);
    });
    tube(vortex, points, 0.05, n % 2 ? gold : glow);
  }
  animated.push((t, z) => {
    if (z === "milestone" || t === 0)
      vortexPearls.forEach((p, i) => {
        const u = (i / 65 + t * 0.013) % 1,
          a = i * 2.4 + t * 0.22,
          r = 2 + u * 7;
        p.position.set(Math.cos(a) * r, 1 + u * 18, Math.sin(a) * r);
      });
  });
  // Recognition river: layered bridges and quiet floating pearls.
  const river = island("live-feed", 18);
  for (let i = 0; i < 4; i++) {
    const points = Array.from({ length: 24 }, (_, n) => {
      const x = (n / 23) * 27 - 13.5;
      return new T.Vector3(
        x,
        1 + i * 0.4,
        Math.sin(x * 0.15 + i) * 4 + (i - 1.5) * 3,
      );
    });
    tube(river, points, 0.35, i % 2 ? glass : pearl);
  }
  for (let i = 0; i < 14; i++)
    orb(
      river,
      i % 3 ? pearl : rose,
      ((i % 7) - 3) * 3.6,
      3 + Math.sin(i) * 1.2,
      (Math.floor(i / 7) - 0.5) * 7,
      0.65,
    );
  // Practice terrace and promise sculpture give the campaign's actions real homes.
  const practice = island("practice", 13);
  for (let i = 0; i < 5; i++) {
    mesh(new T.BoxGeometry(14 - i * 1.5, 0.45, 8 - i * 0.6), pearl, practice, [
      0,
      0.8 + i * 0.45,
      -i * 0.5,
    ]);
  }
  for (let i = 0; i < 9; i++)
    orb(
      practice,
      i % 2 ? leaf : rose,
      Math.cos(i) * 7,
      2 + random() * 3,
      Math.sin(i) * 7,
      0.8,
    );
  const promise = island("promise", 14);
  for (let i = 0; i < 2; i++) {
    const ribbon = mesh(
      new T.TorusKnotGeometry(3.6, 0.16, 140, 10, 2, 3),
      i ? rose : gold,
      promise,
      [0, 6, 0],
    );
    ribbon.rotation.y = (i * Math.PI) / 2;
    ribbon.scale.y = 1.35;
    animated.push((t, z) => {
      if (z === "promise") ribbon.rotation.y = (i * Math.PI) / 2 + t * 0.025;
    });
  }
  // Connect every district to the same central world, with bright arched bridges.
  for (const zone of ZONES.slice(3)) {
    const start = new T.Vector3(...zone.center),
      end = new T.Vector3(zone.center[0] * 0.3, 0, zone.center[2] * 0.3),
      mid = start.clone().lerp(end, 0.5);
    mid.y += 3;
    const bridge = tube(root, [start, mid, end], 0.7, pearl);
    bridge.scale.y = 1;
  }
  // New recognition portal: all geometry preallocated, only its state changes.
  const portal = new T.Group();
  portal.position.set(0, 0, 10);
  root.add(portal);
  portal.visible = false;
  const arches: T.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const a = mesh(
      new T.TorusGeometry(8 + i * 0.4, 0.06 + i * 0.015, 8, 100, Math.PI),
      i % 2 ? gold : glow,
      portal,
      [0, 4, -i * 0.6],
    );
    arches.push(a);
    for (const side of [-1, 1])
      mesh(new T.CylinderGeometry(0.055, 0.1, 4, 8), glow, portal, [
        side * (8 + i * 0.4),
        2,
        -i * 0.6,
      ]);
  }
  const arrivalPearl = orb(
    portal,
    new T.MeshPhysicalMaterial({
      color: "#ffacc8",
      roughness: 0.16,
      metalness: 0.25,
      clearcoat: 1,
      emissive: "#c55c84",
      emissiveIntensity: 0.14,
    }),
    0,
    8,
    0,
    2.2,
  );
  const petalGeo = new T.SphereGeometry(1, 8, 5),
    petalMat = new T.MeshStandardMaterial({
      color: "#fff0d0",
      roughness: 0.4,
      metalness: 0.2,
    });
  const shower = new T.InstancedMesh(petalGeo, petalMat, 160);
  portal.add(shower);
  const beams: T.Mesh[] = [];
  for (let i = 0; i < 9; i++) {
    const material = new T.MeshBasicMaterial({
      color: WORLD_EXPRESSIONS[i].color,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      side: T.DoubleSide,
      blending: T.AdditiveBlending,
    });
    const beam = mesh(
      new T.ConeGeometry(0.6, 26, 8, 1, true),
      material,
      portal,
      [Math.cos(i) * 6, 14, Math.sin(i) * 5],
    );
    beam.rotation.z = Math.sin(i) * 0.25;
    beams.push(beam);
  }
  // Cascading streams descend from the floating upper gardens.
  for (const id of ["orbit", "milestone"] as const) {
    const zone = ZONES[zoneIndex(id)];
    for (let n = 0; n < 3; n++) {
      const stream = mesh(
        new T.CylinderGeometry(0.18, 0.7, 25, 10, 1, true),
        glass,
        root,
        [zone.center[0] + 11 + n * 0.5, 12, zone.center[2] + 3],
      );
      stream.rotation.z = 0.08 + n * 0.015;
    }
  }
  for (const group of [
    butterflies,
    earth,
    astrolabe,
    orbits,
    vortex,
    promise,
    portal,
  ])
    group.userData.dynamic = true;
  const releaseBatch = batchScenery(root);
  animated.forEach((fn) => fn(0, "garden"));
  return {
    update(time: number, zone: ZoneId, arrival?: ArrivalState) {
      sky.uniforms.time.value = time;
      animated.forEach((fn) => fn(time, zone));
      portal.visible =
        !!arrival && arrival.phase !== "idle" && arrival.phase !== "return";
      if (!portal.visible || !arrival) return;
      const opening = arrival.phase === "approach" ? arrival.progress : 1;
      arches.forEach((a, i) =>
        a.scale.setScalar(
          0.9 + opening * 0.1 + Math.sin(time * 0.4 + i) * 0.01,
        ),
      );
      arrivalPearl.position.y =
        arrival.phase === "settle"
          ? 8 - arrival.progress * 6
          : 8 + Math.sin(time * 0.6) * 0.2;
      arrivalPearl.scale.setScalar(
        arrival.phase === "reveal"
          ? 0.2 + arrival.progress * 2
          : arrival.phase === "settle"
            ? 2.2 - arrival.progress * 1.6
            : 2.2,
      );
      for (let i = 0; i < 160; i++) {
        const u = (i / 160 + time * 0.035) % 1,
          a = i * 2.399 + time * 0.15,
          r = 3 + u * 9;
        dummy.position.set(Math.cos(a) * r, 3 + u * 17, Math.sin(a) * r);
        dummy.rotation.set(a, a * 0.4, time * 0.2 + i);
        dummy.scale.set(0.12, 0.04, 0.25);
        dummy.updateMatrix();
        shower.setMatrixAt(i, dummy.matrix);
      }
      shower.instanceMatrix.needsUpdate = true;
      beams.forEach((b, i) => {
        b.rotation.z = Math.sin(time * 0.2 + i) * 0.15;
      });
    },
    dispose() {
      releaseBatch();
      const geometries = new Set<T.BufferGeometry>(),
        materials = new Set<T.Material>();
      root.traverse((obj) => {
        const o = obj as T.Mesh;
        if (o.geometry) geometries.add(o.geometry);
        if (o.material)
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            materials.add(m),
          );
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      cloudTexture.dispose();
      scene.remove(root);
    },
  };
}
