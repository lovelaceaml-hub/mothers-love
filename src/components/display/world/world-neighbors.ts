import * as THREE from "three";
import { neighborMotion, neighborWords } from "./neighbor-dialogue";
import { WORLD_EXPRESSIONS, ZONES, type ZoneId } from "./world-data";

/** Stylized, fictional neighbors illustrate the campaign words, never real recipients. */
export function createWorldNeighbors(scene: THREE.Scene) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const roots: THREE.Group[] = [];
  const geometry = <T extends THREE.BufferGeometry>(value: T) => {
    geometries.add(value);
    return value;
  };
  const material = (color: string, luminous = false) => {
    const value = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.45,
      metalness: 0.12,
      emissive: luminous ? color : "#000000",
      emissiveIntensity: luminous ? 0.25 : 0,
    });
    materials.add(value);
    return value;
  };
  const sphere = geometry(new THREE.SphereGeometry(1, 16, 12));
  const limb = geometry(new THREE.CapsuleGeometry(0.16, 0.65, 3, 8));
  const coat = geometry(new THREE.CylinderGeometry(0.36, 0.59, 1.3, 16));
  const hair = geometry(
    new THREE.SphereGeometry(0.51, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.48),
  );
  const skins = ["#bd815d", "#f0c5a4", "#744a36", "#dca383"].map((c) =>
    material(c),
  );
  const hairs = ["#342637", "#5a3c30", "#bf9164", "#656179"].map((c) =>
    material(c),
  );
  const clothes = WORLD_EXPRESSIONS.map((e) => material(e.color));
  const shoes = material("#5d4d61");
  const light = material("#ffe8a4", true);
  const rose = material("#ef82ad", true);
  const add = (
    parent: THREE.Object3D,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    sx = 1,
    sy = sx,
    sz = sx,
  ) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    parent.add(mesh);
    return mesh;
  };
  const faceCanvas = document.createElement("canvas");
  faceCanvas.width = 128;
  faceCanvas.height = 128;
  const faceCtx = faceCanvas.getContext("2d");
  if (faceCtx) {
    faceCtx.strokeStyle = "#4c3044";
    faceCtx.lineWidth = 5;
    faceCtx.lineCap = "round";
    for (const x of [41, 87]) {
      faceCtx.beginPath();
      faceCtx.arc(x, 53, 7, Math.PI * 1.1, Math.PI * 1.9);
      faceCtx.stroke();
    }
    faceCtx.beginPath();
    faceCtx.arc(64, 63, 16, 0.2, Math.PI - 0.2);
    faceCtx.stroke();
    faceCtx.fillStyle = "#e8899c80";
    for (const x of [30, 98]) {
      faceCtx.beginPath();
      faceCtx.ellipse(x, 72, 10, 5, 0, 0, Math.PI * 2);
      faceCtx.fill();
    }
  }
  const faceTexture = new THREE.CanvasTexture(faceCanvas);
  textures.add(faceTexture);
  const faceMaterial = new THREE.MeshBasicMaterial({
    map: faceTexture,
    transparent: true,
    depthWrite: false,
  });
  materials.add(faceMaterial);
  const faceGeometry = geometry(new THREE.PlaneGeometry(0.79, 0.79));
  const heartShape = new THREE.Shape();
  heartShape.moveTo(0, -0.45);
  heartShape.bezierCurveTo(-0.8, 0.05, -0.65, 0.7, -0.25, 0.5);
  heartShape.bezierCurveTo(-0.08, 0.45, 0, 0.3, 0, 0.25);
  heartShape.bezierCurveTo(0.15, 0.65, 0.7, 0.7, 0.65, 0.25);
  heartShape.bezierCurveTo(0.62, 0, 0.3, -0.3, 0, -0.45);
  const heartGeo = geometry(
    new THREE.ExtrudeGeometry(heartShape, {
      depth: 0.12,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.08,
      bevelThickness: 0.08,
      curveSegments: 10,
    }),
  );

  function neighbor(parent: THREE.Group, index: number) {
    const body = new THREE.Group();
    parent.add(body);
    const skin = skins[index % skins.length];
    add(body, coat, clothes[index % clothes.length], 0, 1.44, 0);
    add(body, sphere, skin, 0, 2.57, 0, 0.5, 0.56, 0.48);
    add(body, hair, hairs[index % hairs.length], 0, 2.65, 0);
    add(body, faceGeometry, faceMaterial, 0, 2.54, 0.455);
    const arms = [-1, 1].map((side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.43, 1.98, 0);
      body.add(pivot);
      add(pivot, limb, clothes[index % clothes.length], 0, -0.42, 0);
      add(pivot, sphere, skin, 0, -0.89, 0, 0.17);
      return pivot;
    });
    const legs = [-1, 1].map((side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.22, 0.87, 0);
      body.add(pivot);
      add(
        pivot,
        limb,
        clothes[(index + 3) % clothes.length],
        0,
        -0.36,
        0,
        0.88,
      );
      add(pivot, sphere, shoes, 0, -0.7, 0.08, 0.2, 0.12, 0.3);
      return pivot;
    });
    return { body, arms, legs };
  }
  function speech(text: string, color: string) {
    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#fffaf2";
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(5, 5, 758, 220, 45);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(340, 220);
      ctx.lineTo(380, 252);
      ctx.lineTo(410, 220);
      ctx.fill();
      ctx.fillStyle = "#685360";
      ctx.font = "500 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("FICTIONAL NEIGHBORS", 384, 36);
      ctx.font = "500 48px Georgia";
      ctx.fillStyle = "#51354d";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const lines: string[] = [];
      let line = "";
      for (const word of text.split(" ")) {
        const proposed = line ? `${line} ${word}` : word;
        if (ctx.measureText(proposed).width > 675 && line) {
          lines.push(line);
          line = word;
        } else line = proposed;
      }
      if (line) lines.push(line);
      lines.forEach((line, i) =>
        ctx.fillText(line, 384, 134 + (i - (lines.length - 1) / 2) * 54),
      );
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.add(texture);
    const mat = new THREE.SpriteMaterial({
      map: texture,
      depthWrite: false,
      transparent: true,
    });
    materials.add(mat);
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(7.5, 2.5, 1);
    return sprite;
  }
  const pairs = ZONES.map((zone, index) => {
    const root = new THREE.Group();
    root.position.fromArray(zone.center);
    root.position.add(new THREE.Vector3(-3, 0.63, 6.5));
    scene.add(root);
    roots.push(root);
    const first = neighbor(root, index * 2),
      second = neighbor(root, index * 2 + 1);
    const words = WORLD_EXPRESSIONS[index % WORLD_EXPRESSIONS.length];
    const dialogue = neighborWords(index);
    const greeting = speech(dialogue.greeting, words.color);
    root.add(greeting);
    const response = speech(dialogue.response, "#d1aa6c");
    root.add(response);
    const gift = add(root, heartGeo, rose, 0, 2.1, 0, 0.5);
    const sparkles = Array.from({ length: 6 }, (_, i) =>
      add(root, sphere, light, 0, 2, 0, 0.055 + i * 0.006),
    );
    return {
      root,
      first,
      second,
      greeting,
      response,
      gift,
      sparkles,
      zone: zone.id,
      index,
    };
  });
  let sparkleEnabled = true;
  return {
    setEffects(sparkles: boolean) {
      sparkleEnabled = sparkles;
    },
    update(time: number, zone: ZoneId, celebrating: boolean) {
      const active = ZONES.find((z) => z.id === zone)!;
      for (const pair of pairs) {
        const center = ZONES[pair.index].center;
        pair.root.visible =
          Math.hypot(
            center[0] - active.center[0],
            center[2] - active.center[2],
          ) < 72;
        const { distance, walking } = neighborMotion(time, pair.index);
        [pair.first, pair.second].forEach((actor, i) => {
          const side = i ? 1 : -1;
          actor.body.position.set(
            side * distance,
            walking
              ? Math.abs(Math.sin(time * 3.2 + i)) * 0.07
              : Math.sin(time * 1.3 + i) * 0.025,
            0,
          );
          actor.body.rotation.y = -side * Math.PI * 0.32;
          actor.legs.forEach((leg, n) => {
            leg.rotation.x = walking
              ? Math.sin(time * 3.2 + n * Math.PI + i) * 0.22
              : 0;
          });
          actor.arms.forEach((arm, n) => {
            arm.rotation.x = walking
              ? -Math.sin(time * 3.2 + n * Math.PI + i) * 0.18
              : -0.38;
            arm.rotation.z =
              (n ? 1 : -1) *
              (walking ? 0.13 : 0.65 + Math.sin(time * 1.4 + i) * 0.12);
          });
        });
        const talking = !celebrating && pair.zone === zone && !walking;
        const speakingFirst = Math.sin(time * 0.4) >= 0;
        pair.greeting.visible = talking && speakingFirst;
        pair.response.visible = talking && !speakingFirst;
        pair.greeting.position.set(-1.5, 4.85 + Math.sin(time * 0.7) * 0.04, 0);
        pair.response.position.set(1.5, 4.85 + Math.sin(time * 0.7) * 0.04, 0);
        pair.gift.visible = !walking;
        pair.gift.position.set(
          Math.sin(time * 0.8) * 0.7,
          2.35 + Math.sin(time * 1.4) * 0.18,
          0.25,
        );
        pair.gift.rotation.y = time * 0.5;
        pair.sparkles.forEach((sparkle, i) => {
          sparkle.visible = sparkleEnabled && !walking;
          sparkle.position.set(
            Math.cos(time * 0.65 + i) * 1.1,
            2 + ((time * 0.35 + i / 3) % 1.8),
            Math.sin(time * 0.65 + i) * 0.65,
          );
        });
      }
    },
    dispose() {
      roots.forEach((root) => scene.remove(root));
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
