import * as THREE from "three";
import { batchScenery } from "./static-batch";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { createWorldNeighbors } from "./world-neighbors";
import { createHeavenlyDistricts } from "./world-districts";
import type { ArrivalState } from "./arrival-director";
import type { Recognition } from "@/lib/contracts";
import type { ZoneId } from "./world-data";
import { seededRandom, WORLD_EXPRESSIONS, ZONES } from "./world-data";

export type WorldScene = {
  scene: THREE.Scene;
  update: (time: number, zone: ZoneId, arrival?: ArrivalState) => void;
  dispose: () => void;
  anchors: THREE.Vector3[];
  recognitionPearls: THREE.Mesh[];
  setRecognitions: (records: readonly Recognition[]) => void;
  setEffects: (sparkles: boolean, trails: boolean) => void;
};
export function createWorldScene(): WorldScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#d2e2e8");
  scene.fog = new THREE.FogExp2("#e1dcf0", 0.003);
  scene.add(new THREE.HemisphereLight("#fff5e8", "#73909a", 1.15));
  const sun = new THREE.DirectionalLight("#ffe8c3", 2.1);
  sun.position.set(-30, 70, 25);
  scene.add(sun);
  const rim = new THREE.DirectionalLight("#c3d8ff", 0.9);
  rim.position.set(35, 30, -50);
  scene.add(rim);
  const materials: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const textures: THREE.Texture[] = [];
  const random = seededRandom();
  const mat = (color: string, metalness = 0.15, roughness = 0.35) => {
    const m = new THREE.MeshStandardMaterial({ color, metalness, roughness });
    materials.push(m);
    return m;
  };
  const pearl = mat("#fff7e7", 0.28, 0.24),
    gold = mat("#d6ad69", 0.65, 0.26),
    mint = mat("#85b5a0", 0.08, 0.7);
  const pink = mat("#ee648f", 0.35, 0.23),
    ground = mat("#a3c0ad", 0.02, 0.92);
  const mesh = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    parent: THREE.Object3D,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    geometries.push(geometry);
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    parent.add(object);
    return object;
  };
  const sphere = new THREE.SphereGeometry(1, 20, 14);
  geometries.push(sphere);
  const orb = (
    parent: THREE.Object3D,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    scale: number,
  ) => {
    const o = new THREE.Mesh(sphere, material);
    o.position.set(x, y, z);
    o.scale.setScalar(scale);
    parent.add(o);
    return o;
  };
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
  function platform(index: number, radius: number) {
    const group = new THREE.Group();
    group.position.fromArray(ZONES[index].center);
    scene.add(group);
    mesh(
      new THREE.CylinderGeometry(radius, radius + 1.2, 0.8, 80),
      pearl,
      group,
      0,
      0.05,
    );
    mesh(
      new THREE.TorusGeometry(radius - 0.25, 0.065, 8, 96),
      gold,
      group,
      0,
      0.5,
    ).rotation.x = Math.PI / 2;
    return group;
  }
  const garden = platform(0, 16);
  mesh(new THREE.CylinderGeometry(13.8, 14, 0.18, 64), mint, garden, 0, 0.52);
  const flowerColors = ["#ffc970", "#f28bac", "#c6a4de", "#ffebbd", "#efa280"];
  const stems = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.035, 0.06, 1, 5),
    mat("#6f9982", 0.05, 0.85),
    150,
  );
  geometries.push(stems.geometry);
  garden.add(stems);
  const petalMaterial = mat("#ffffff", 0.18, 0.35);
  const flowerSphere = new THREE.SphereGeometry(1, 10, 7);
  geometries.push(flowerSphere);
  const petals = new THREE.InstancedMesh(flowerSphere, petalMaterial, 150 * 5);
  garden.add(petals);
  const centers = new THREE.InstancedMesh(flowerSphere, gold, 150);
  garden.add(centers);
  const leaves = new THREE.InstancedMesh(flowerSphere, mint, 300);
  garden.add(leaves);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 150; i++) {
    const angle = random() * Math.PI * 2,
      radius = 4 + Math.sqrt(random()) * 9;
    const x = Math.cos(angle) * radius,
      rawZ = Math.sin(angle) * radius,
      z = x > -8 && x < 2 && rawZ > 4 && rawZ < 9 ? rawZ - 5.5 : rawZ,
      h = 0.8 + random() * 2.4;
    dummy.position.set(x, 0.65 + h / 2, z);
    dummy.scale.set(1, h, 1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    stems.setMatrixAt(i, dummy.matrix);
    for (let leaf = 0; leaf < 2; leaf++) {
      dummy.position.set(
        x + (leaf ? 0.18 : -0.18),
        0.65 + h * (leaf ? 0.55 : 0.3),
        z,
      );
      dummy.scale.set(0.38, 0.07, 0.16);
      dummy.rotation.set(0, angle, leaf ? -0.5 : 0.5);
      dummy.updateMatrix();
      leaves.setMatrixAt(i * 2 + leaf, dummy.matrix);
    }
    dummy.rotation.set(0, 0, 0);
    dummy.position.set(x, h + 0.7, z);
    dummy.scale.setScalar(0.19);
    dummy.updateMatrix();
    centers.setMatrixAt(i, dummy.matrix);
    for (let j = 0; j < 5; j++) {
      const a = (j * Math.PI * 2) / 5;
      dummy.position.set(
        x + Math.cos(a) * 0.29,
        h + 0.65,
        z + Math.sin(a) * 0.29,
      );
      dummy.scale.set(0.44, 0.13, 0.22);
      dummy.rotation.set(0, -a, -0.16);
      dummy.updateMatrix();
      petals.setMatrixAt(i * 5 + j, dummy.matrix);
      petals.setColorAt(
        i * 5 + j,
        new THREE.Color(flowerColors[i % flowerColors.length]),
      );
    }
  }
  const pearls: THREE.Mesh[] = [];
  const glass = new THREE.MeshPhysicalMaterial({
    color: "#fff0ee",
    metalness: 0.1,
    roughness: 0.1,
    clearcoat: 1,
    transparent: true,
    opacity: 0.72,
  });
  materials.push(glass);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2,
      r = i % 2 ? 9.5 : 6;
    const pearlGlass = glass.clone();
    materials.push(pearlGlass);
    const p = orb(
      garden,
      pearlGlass,
      Math.cos(a) * r,
      4 + (i % 3) * 1.1,
      Math.sin(a) * r,
      0.6 + (i % 3) * 0.23,
    );
    pearls.push(p);
    p.userData.dynamic = true;
    const ring = mesh(
      new THREE.TorusGeometry(0.65 + (i % 3) * 0.23, 0.025, 6, 40),
      gold,
      p,
    );
    ring.scale.setScalar(1 / p.scale.x);
  }
  // Slender garden arches give the camera a readable human scale.
  for (let i = 0; i < 3; i++) {
    const arch = mesh(
      new THREE.TorusGeometry(4.1, 0.17, 10, 56, Math.PI),
      pearl,
      garden,
      (i - 1) * 6,
      2,
      -8 - i * 1.5,
    );
    arch.rotation.y = -0.15;
    for (const side of [-1, 1])
      mesh(
        new THREE.CylinderGeometry(0.17, 0.22, 2, 10),
        gold,
        garden,
        (i - 1) * 6 + side * 4.1,
        1,
        -8 - i * 1.5,
      );
  }
  const sanctuary = platform(1, 17);
  for (let i = 0; i < 3; i++)
    mesh(
      new THREE.CylinderGeometry(8 - i * 1.3, 8.3 - i * 1.3, 0.42, 80),
      pearl,
      sanctuary,
      0,
      0.65 + i * 0.42,
    );
  const heartShape = new THREE.Shape();
  heartShape.moveTo(0, -3.5);
  heartShape.bezierCurveTo(-1.2, -2.1, -5.1, 0.15, -4.8, 2.55);
  heartShape.bezierCurveTo(-4.5, 5.7, -0.75, 5.5, 0, 3.25);
  heartShape.bezierCurveTo(0.75, 5.5, 4.5, 5.7, 4.8, 2.55);
  heartShape.bezierCurveTo(5.1, 0.15, 1.2, -2.1, 0, -3.5);
  const rawHeartGeometry = new THREE.ExtrudeGeometry(heartShape, {
    depth: 1.4,
    bevelEnabled: true,
    bevelSegments: 8,
    steps: 1,
    bevelSize: 0.9,
    bevelThickness: 1.15,
    curveSegments: 36,
  });
  rawHeartGeometry.translate(0, 0, -0.7);
  rawHeartGeometry.deleteAttribute("normal");
  rawHeartGeometry.deleteAttribute("uv");
  const heartGeometry = mergeVertices(rawHeartGeometry);
  rawHeartGeometry.dispose();
  heartGeometry.computeVertexNormals();
  const heart = mesh(heartGeometry, pink, sanctuary, 0, 8.3);
  heart.rotation.y = 0.2;
  heart.userData.dynamic = true;
  const heartLight = new THREE.PointLight("#ffb6c9", 45, 28, 2);
  heartLight.position.set(0, 11, 5);
  sanctuary.add(heartLight);
  const ribbonMaterial = new THREE.MeshPhysicalMaterial({
    color: "#fff1d5",
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.4,
    metalness: 0.32,
    roughness: 0.28,
    depthWrite: false,
  });
  materials.push(ribbonMaterial);
  const ribbons: THREE.BufferGeometry[] = [];
  for (let r = 0; r < 3; r++) {
    const geo = new THREE.PlaneGeometry(1, 1, 100, 6);
    ribbons.push(geo);
    mesh(geo, ribbonMaterial, sanctuary).userData.dynamic = true;
  }
  function updateSilk(time: number) {
    ribbons.forEach((geometry, r) => {
      const positions = geometry.attributes.position;
      for (let j = 0; j <= 6; j++)
        for (let i = 0; i <= 100; i++) {
          const u = i / 100,
            a = u * Math.PI * 2.15 + r * 2.1 + time * 0.085;
          const rad =
            7.2 +
            Math.sin(u * Math.PI) * 1.4 +
            Math.sin(a * 2 + time * 0.4) * 0.4;
          const width =
            Math.pow(Math.sin(u * Math.PI), 0.7) * 0.95 * (j / 3 - 1);
          positions.setXYZ(
            j * 101 + i,
            Math.cos(a) * (rad + width * 0.3),
            4.4 +
              u * 8 +
              Math.sin(a + time * 0.22) * 1.3 +
              width +
              Math.sin(u * 19 + j * 0.4 + time * 0.6) * 0.13,
            Math.sin(a) * (rad + width * 0.3),
          );
        }
      positions.needsUpdate = true;
      geometry.computeVertexNormals();
    });
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const column = mesh(
      new THREE.CylinderGeometry(0.25, 0.4, 4.5, 12),
      pearl,
      sanctuary,
      Math.cos(a) * 14.4,
      2.7,
      Math.sin(a) * 14.4,
    );
    orb(column, gold, 0, 2.35, 0, 0.4);
  }
  const grove = platform(2, 18),
    anchors: THREE.Vector3[] = [];
  WORLD_EXPRESSIONS.forEach((expression, i) => {
    const a = -Math.PI + (i / 8) * Math.PI * 1.7;
    const x = Math.cos(a) * 11.5,
      z = Math.sin(a) * 10;
    const monument = new THREE.Group();
    monument.position.set(x, 0, z);
    grove.add(monument);
    mesh(
      new THREE.CylinderGeometry(1.65, 1.95, 0.5, 32),
      gold,
      monument,
      0,
      0.85,
    );
    mesh(
      new THREE.CylinderGeometry(1.3, 1.55, 2.8, 32),
      pearl,
      monument,
      0,
      2.4,
    );
    const color = mat(expression.color, 0.3, 0.24);
    const jewel = orb(monument, color, 0, 5.1, 0, 1.55);
    const halo = mesh(
      new THREE.TorusGeometry(1.95, 0.055, 8, 56),
      gold,
      monument,
      0,
      5.1,
    );
    halo.rotation.y = 0.2;
    // The canonical number is a locally drawn, camera-facing marker, not an image download.
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#49364b";
      ctx.font = "500 76px Georgia";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(expression.id), 64, 65);
    }
    const texture = new THREE.CanvasTexture(canvas);
    textures.push(texture);
    const labelMat = new THREE.SpriteMaterial({
      map: texture,
      depthTest: true,
    });
    materials.push(labelMat);
    const label = new THREE.Sprite(labelMat);
    label.position.set(0, 5.1, 1.6);
    label.scale.set(1.7, 1.7, 1);
    monument.add(label);
    jewel.userData.expressionId = expression.id;
    anchors.push(
      new THREE.Vector3(x + ZONES[2].center[0], 5.1, z + ZONES[2].center[2]),
    );
    for (let n = 0; n < 5; n++) {
      const leaf = orb(
        monument,
        mint,
        Math.cos(n * 1.2) * 2.2,
        1 + n * 0.6,
        Math.sin(n * 1.2) * 2,
        0.9,
      );
      leaf.scale.set(0.45, 1.1, 0.5);
      leaf.rotation.z = n * 0.4;
    }
  });
  // Soft point texture avoids square particles and uses no remote asset.
  const lightCanvas = document.createElement("canvas");
  lightCanvas.width = 32;
  lightCanvas.height = 32;
  const lightCtx = lightCanvas.getContext("2d");
  if (lightCtx) {
    const gradient = lightCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, "#fff9db");
    gradient.addColorStop(0.2, "#fff4dbaa");
    gradient.addColorStop(1, "#fff4db00");
    lightCtx.fillStyle = gradient;
    lightCtx.fillRect(0, 0, 32, 32);
  }
  const lightTexture = new THREE.CanvasTexture(lightCanvas);
  textures.push(lightTexture);
  const particleGeo = new THREE.BufferGeometry(),
    positions = new Float32Array(200 * 3);
  for (let i = 0; i < 200; i++) {
    positions[i * 3] = (random() - 0.5) * 110;
    positions[i * 3 + 1] = random() * 24 + 1;
    positions[i * 3 + 2] = (random() - 0.5) * 100 - 15;
  }
  particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometries.push(particleGeo);
  const particleMat = new THREE.PointsMaterial({
    map: lightTexture,
    color: "#ffe8ac",
    size: 0.5,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });
  materials.push(particleMat);
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);
  const initialPearlY = pearls.map((p) => p.position.y);
  updateSilk(0);
  const releaseBatch = batchScenery(scene);
  const districts = createHeavenlyDistricts(scene);
  const neighbors = createWorldNeighbors(scene);
  return {
    scene,
    anchors,
    recognitionPearls: pearls,
    setRecognitions(records) {
      pearls.forEach((pearl, index) => {
        const record = records[index];
        pearl.visible = !!record;
        pearl.userData.recognitionId = record?.id;
        if (record)
          (pearl.material as THREE.MeshPhysicalMaterial).color.set(
            WORLD_EXPRESSIONS[record.expressionIds[0] - 1].color,
          );
      });
    },
    setEffects(sparkles, trails) {
      particles.visible = sparkles;
      neighbors.setEffects(sparkles);
      ribbonMaterial.visible = trails;
    },
    update(time, zone, arrival) {
      water.uniforms.time.value = time;
      districts.update(time, zone, arrival);
      neighbors.update(time, zone, !!arrival && arrival.phase !== "idle");
      pearls.forEach((p, i) => {
        p.position.y = initialPearlY[i] + Math.sin(time * 0.4 + i) * 0.24;
      });
      heart.scale.setScalar(1 + Math.sin(time * 0.65) * 0.018);
      particles.rotation.y = Math.sin(time * 0.018) * 0.1;
      if (zone === "heart" || zone === "garden") updateSilk(time);
    },
    dispose() {
      releaseBatch();
      districts.dispose();
      neighbors.dispose();
      new Set(geometries).forEach((g) => g.dispose());
      new Set(materials).forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      scene.clear();
    },
  };
}
