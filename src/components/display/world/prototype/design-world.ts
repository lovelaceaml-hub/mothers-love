import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { ZONES, WORLD_EXPRESSIONS, seededRandom, type ZoneId } from "../world-data";
import type { WorldScene } from "../world-scene-legacy";
import { studyArrival } from "./design-mode";
import { studyCanopyPuffs, studyCottonMaterial } from "./study-canopy";
import { createStudyClouds, studyCloudAtlas, studyCloudLayout } from "./study-clouds";
import { arrivalPose } from "./arrival-choreography";
import { bloomStage, constellationStage, ribbonStage, type StageContext } from "./arrival-stages";
import { studyPetal, studyTerrace } from "./study-geometry";
import { studySunHalo } from "./study-lighting";
import { softDot, sparklePoints, studyRim, studySilk } from "./study-materials";
import { STUDY_FOG, STUDY_SKY, STUDY_SUN, STUDY_TONE } from "./study-palette";

/** An opt-in visual study on the real world engine, camera, data fixture and clock. */
export function createDesignWorld(): WorldScene {
  const scene = new T.Scene();
  scene.name = "Mother's Love, visual study 02";
  scene.background = new T.Color(STUDY_FOG.color);
  scene.fog = new T.Fog(STUDY_FOG.color, STUDY_FOG.near, STUDY_FOG.far);
  scene.userData.prototypeHeartReady = false;
  scene.userData.studyArrival = studyArrival(new URLSearchParams(window.location.search).get("entrance"));
  const geometries = new Set<T.BufferGeometry>(), materials = new Set<T.Material>(), textures = new Set<T.Texture>();
  const instances = new Set<T.InstancedMesh>();
  const motions: Array<(time: number) => void> = [];
  const time = { value: 0 };
  let disposed = false, sparkles = true, trails = true;
  const geometry = <G extends T.BufferGeometry>(g: G) => { geometries.add(g); return g; };
  const material = <M extends T.Material>(m: M) => { materials.add(m); return m; };
  const texture = <X extends T.Texture>(t: X) => { textures.add(t); return t; };
  const invalidate = () => { if (!disposed) scene.userData.invalidate?.(); };
  const ivory = studyRim(material(new T.MeshPhysicalMaterial({ color: "#fff4e4", roughness: .28, metalness: .025, clearcoat: .42, clearcoatRoughness: .25, dithering: true })), "#ffe6c9", 3, .22);
  const edge = material(new T.MeshStandardMaterial({ color: "#e1cdb7", roughness: .64, dithering: true }));
  const gold = material(new T.MeshStandardMaterial({ color: "#d3ae6c", metalness: .78, roughness: .27 }));
  const roseGold = material(new T.MeshStandardMaterial({ color: "#8d7462", metalness: .05, roughness: .77 }));
  const rose = studyRim(material(new T.MeshPhysicalMaterial({ color: "#d9567f", roughness: .44, metalness: .04, clearcoat: .45, clearcoatRoughness: .48, sheen: .2, sheenColor: new T.Color("#ffc5d5"), dithering: true })), "#ffb6c8", 2.5, .3);
  const leaf = material(new T.MeshPhysicalMaterial({ color: "#739a77", roughness: .57, sheen: .2, side: T.DoubleSide }));
  const lawn = material(new T.MeshStandardMaterial({ color: "#a8c7a8", roughness: .96, metalness: 0 }));
  const rock = material(new T.MeshStandardMaterial({ color: "#acbcb6", roughness: .95 }));
  const bloom = material(new T.MeshPhysicalMaterial({ color: "#ffffff", roughness: .46, sheen: .65, sheenColor: new T.Color("#ffe4e9"), sheenRoughness: .5, vertexColors: true, side: T.DoubleSide }));
  // Thin petals transmit a little broad backlight without a second scene render or transparency sorting.
  bloom.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace("#include <opaque_fragment>", "outgoingLight += diffuseColor.rgb * (0.07 + 0.12 * pow(1.0 - abs(normal.z), 2.0));\n#include <opaque_fragment>");
  };
  bloom.customProgramCacheKey = () => "study-petal-backlight-v1";
  const cylinder = geometry(new T.CylinderGeometry(1, 1, 1, 32));
  const bead = geometry(new T.SphereGeometry(1, 24, 16));
  const pollen = geometry(new T.SphereGeometry(1, 8, 6));
  function petalGeometry(columns: number, rows: number) {
    const g = geometry(new T.PlaneGeometry(1, 1, columns, rows));
    const pos = g.getAttribute("position"), uv = g.getAttribute("uv");
    for (let i = 0; i < pos.count; i++) {
      const u = uv.getY(i), v = uv.getX(i) * 2 - 1, span = Math.pow(Math.max(0, Math.sin(Math.PI * u)), .58);
      pos.setXYZ(i, v * span * .63, .45 * u * u - .11 * Math.sin(Math.PI * u) + v * v * span * .19, u);
    }
    g.computeVertexNormals(); g.computeBoundingSphere(); return g;
  }
  const petal = geometry(studyPetal(20, 12));
  const midPetal = geometry(studyPetal(10, 6));
  // A cheap petal for the arrival studies: drifting bloom petals and butterfly wings.
  const farPetal = geometry(studyPetal(6, 4));
  const cottonSphere = geometry(new T.SphereGeometry(1, 18, 12));
  const cotton = material(studyCottonMaterial());
  const dummy = new T.Object3D(), tint = new T.Color();
  function mesh(parent: T.Object3D, g: T.BufferGeometry, m: T.Material, p: number[] = [0, 0, 0], scale: number[] = [1, 1, 1]) {
    const o = new T.Mesh(g, m); o.position.set(p[0], p[1], p[2]); o.scale.set(scale[0], scale[1], scale[2]); o.receiveShadow = !m.transparent; parent.add(o); return o;
  }
  function tube(parent: T.Object3D, points: T.Vector3[], r: number, m: T.Material = gold, segments = 32) {
    return mesh(parent, geometry(new T.TubeGeometry(new T.CatmullRomCurve3(points), segments, r, r > .1 ? 16 : 8, false)), m);
  }
  function ring(parent: T.Object3D, r: number, y: number, thickness = .026, m: T.Material = gold) {
    const o = mesh(parent, geometry(new T.TorusGeometry(r, thickness, 6, 96)), m, [0, y, 0]); o.rotation.x = -Math.PI / 2; return o;
  }
  function instance(parent: T.Object3D, g: T.BufferGeometry, m: T.Material, count: number, shadow = false) {
    const o = new T.InstancedMesh(g, m, count); o.castShadow = shadow; o.receiveShadow = true; instances.add(o); parent.add(o); return o;
  }
  function stamp(target: T.InstancedMesh, i: number, p: T.Vector3, s: number[], rotation: T.Euler, color?: T.Color | string) {
    dummy.position.copy(p); dummy.scale.set(s[0], s[1], s[2]); dummy.rotation.copy(rotation); dummy.updateMatrix(); target.setMatrixAt(i, dummy.matrix);
    if (color) target.setColorAt(i, typeof color === "string" ? tint.set(color) : color);
  }
  function finish(o: T.InstancedMesh) { o.instanceMatrix.needsUpdate = true; if (o.instanceColor) o.instanceColor.needsUpdate = true; o.computeBoundingSphere(); }

  // Preserve attributes in compatible static batches. Imported heart and animated cloth never enter this path.
  function batch(group: T.Group) {
    group.updateMatrixWorld(true); const inverse = group.matrixWorld.clone().invert();
    const groups = new Map<string, T.Mesh[]>();
    function walk(o: T.Object3D) {
      if (o.userData.dynamic) return;
      o.children.slice().forEach(walk);
      if (!(o instanceof T.Mesh) || o instanceof T.InstancedMesh || Array.isArray(o.material) || o.material.transparent || o.children.length) return;
      const key = `${o.material.uuid}:${Object.keys(o.geometry.attributes).sort().join()}`;
      const list = groups.get(key) ?? []; list.push(o); groups.set(key, list);
    }
    group.children.slice().forEach(walk);
    for (const meshes of groups.values()) {
      if (meshes.length < 3) continue;
      const copies = meshes.map(o => { const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(inverse.clone().multiply(o.matrixWorld)); return g; });
      const merged = mergeGeometries(copies, false); copies.forEach(g => g.dispose()); if (!merged) continue;
      meshes.forEach(o => o.removeFromParent()); const out = mesh(group, geometry(merged), meshes[0].material as T.Material); out.castShadow = true;
    }
  }

  scene.add(new T.HemisphereLight("#f7dbe0", "#cfa79d", .55));
  const sun = new T.DirectionalLight(STUDY_SUN.color, 2.3); sun.position.set(...STUDY_SUN.lightPosition);
  sun.castShadow = true; sun.shadow.intensity = STUDY_TONE.shadowIntensity; sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = sun.shadow.camera.bottom = -120; sun.shadow.camera.right = sun.shadow.camera.top = 120; sun.shadow.camera.far = 300; sun.shadow.normalBias = .06; sun.shadow.bias = -.0002; scene.add(sun);
  const fill = new T.DirectionalLight("#ffd0c8", .75); fill.position.set(70, 38, 95); scene.add(fill);
  // A quiet lavender bounce from the cool side of the sky, in place of the old pink rim light.
  const cool = new T.DirectionalLight("#c9c3ff", .35); cool.position.set(80, 30, -40); scene.add(cool);
  const sky = material(new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, fog: false, uniforms: { time, top: { value: new T.Color(STUDY_SKY.zenith) }, mid: { value: new T.Color(STUDY_SKY.mid) }, horizon: { value: new T.Color(STUDY_SKY.horizon) }, sun: { value: new T.Vector3(...STUDY_SUN.direction) } },
    vertexShader: `varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 p;uniform float time;uniform vec3 top,mid,horizon,sun;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
      float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.02+1.71;a*=.5;}return v;}
      void main(){vec3 d=normalize(p);vec3 c=mix(horizon,mid,smoothstep(0.,.18,d.y));c=mix(c,top,smoothstep(.18,.75,d.y));
      float lift=smoothstep(0.,.16,d.y);
      vec2 q=vec2(atan(d.z,d.x)*3.8,d.y*8.);float cloud=smoothstep(.38,.70,fbm(q+vec2(time*.001,0.)))*exp(-pow((d.y-.12)*3.,2.));c=mix(c,vec3(.965,.831,.871),cloud*.55*lift);
      float key=max(0.,dot(d,sun));c+=vec3(1.,.914,.824)*(pow(key,5.)*.20+pow(key,60.)*.5)*lift;c=min(c,vec3(1.));gl_FragColor=vec4(c,1.);
      #include <colorspace_fragment>
      }` }));
  mesh(scene, geometry(new T.SphereGeometry(400, 32, 16)), sky).renderOrder = -100;
  const halo = studySunHalo();
  halo.sprites.forEach(sprite => scene.add(sprite)); halo.materials.forEach(material); texture(halo.map);
  const water = material(new T.MeshPhysicalMaterial({ color: "#72b9b9", roughness: .2, metalness: .36, clearcoat: .75, clearcoatRoughness: .2, dithering: true }));
  water.onBeforeCompile = shader => {
    shader.uniforms.studyTime = time;
    shader.vertexShader = "varying vec3 waterPosition;\n" + shader.vertexShader.replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nwaterPosition=(modelMatrix*vec4(position,1.)).xyz;");
    shader.fragmentShader = "varying vec3 waterPosition;uniform float studyTime;\n" + shader.fragmentShader.replace("#include <normal_fragment_begin>", `#include <normal_fragment_begin>
      vec2 q=waterPosition.xz;float dx=.034*cos(q.x*.33+q.y*.18+studyTime*.32)+.017*cos(q.x*.9-q.y*.4-studyTime*.23);
      float dz=.028*cos(q.y*.44-q.x*.13-studyTime*.28)+.009*sin(q.x*.55+q.y*.7+studyTime*.18);
      normal=normalize(mat3(viewMatrix)*vec3(-dx,1.,-dz));`);
  };
  water.customProgramCacheKey = () => "study-outdoor-water-v1";
  const sea = mesh(scene, geometry(new T.CircleGeometry(320, 96)), water, [0, -5, -30]); sea.rotation.x = -Math.PI / 2;

  // Soft pink air: a drifting ring of cloud near the horizon, and a collar of puffs
  // under every island rim so the terraces read as floating rather than cut off.
  const clouds = createStudyClouds(studyCloudLayout(777), texture(studyCloudAtlas()), time);
  clouds.geometries.forEach(geometry); clouds.materials.forEach(material);
  clouds.meshes.forEach(o => { instances.add(o); scene.add(o); });

  const shadowCanvas = document.createElement("canvas"); shadowCanvas.width = shadowCanvas.height = 128;
  const sc = shadowCanvas.getContext("2d")!, sg = sc.createRadialGradient(64, 64, 0, 64, 64, 64);
  sg.addColorStop(0, "#65566460"); sg.addColorStop(.45, "#75697424"); sg.addColorStop(1, "#75697400"); sc.fillStyle = sg; sc.fillRect(0, 0, 128, 128);
  const shadowMap = texture(new T.CanvasTexture(shadowCanvas)); shadowMap.colorSpace = T.SRGBColorSpace;
  const shadow = material(new T.MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false, toneMapped: false }));
  const contactPlane = geometry(new T.PlaneGeometry(1, 1));
  function contact(parent: T.Object3D, x: number, z: number, width: number, depth: number, y = .72) {
    const o = mesh(parent, contactPlane, shadow, [x, y, z], [width, depth, 1]); o.rotation.x = -Math.PI / 2;
  }

  // Ground beds only. Crowns are cotton puffs now, so this path no longer builds a canopy.
  function flowers(parent: T.Object3D, count: number, seed: number, base: T.Vector3, spread: number, color = "#f4b9c9") {
    const petalCount = 5;
    const rand = seededRandom(seed), petals = instance(parent, midPetal, bloom, count * petalCount), cores = instance(parent, pollen, gold, count);
    const stems = instance(parent, cylinder, leaf, count);
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * spread;
      const p = base.clone().add(new T.Vector3(Math.cos(a) * r, .45 + rand() * .8, Math.sin(a) * r));
      const size = .28 + rand() * .30;
      const normal = new T.Vector3((rand()-.5)*.6,1,(rand()-.5)*.6).normalize();
      const up = new T.Vector3(0,1,0), orientation = new T.Quaternion().setFromUnitVectors(up, normal);
      for (let j = 0; j < petalCount; j++) {
        const c = new T.Color(color).lerp(new T.Color(i % 4 ? "#ffe9dc" : "#d799ce"), rand() * .30);
        const scale = size, angle = j * Math.PI * 2 / petalCount + a;
        const rotation = new T.Euler().setFromQuaternion(orientation.clone().multiply(new T.Quaternion().setFromAxisAngle(up, angle)));
        stamp(petals, i * petalCount + j, p, [scale, scale, scale], rotation, c);
      }
      stamp(cores, i, p.clone().addScaledVector(normal, size*.10), [size * .10, size * .08, size * .10], new T.Euler().setFromQuaternion(orientation));
      stamp(stems, i, new T.Vector3(p.x, .72 + (p.y - .72) / 2, p.z), [.022, Math.max(.08, p.y - .72), .022], new T.Euler());
    }
    finish(petals); finish(cores); finish(stems);
  }
  /** One district shares a single cotton mesh, so every crown in it costs one draw call together. */
  type Crowns = { mesh: T.InstancedMesh; used: number };
  function tree(parent: T.Object3D, x: number, z: number, size: number, seed: number, color: string, crowns: Crowns) {
    const root = new T.Group(); root.position.set(x, .7, z); root.scale.setScalar(size); parent.add(root);
    const rand = seededRandom(seed);
    tube(root, [new T.Vector3(), new T.Vector3(-.18, 1.7, .1), new T.Vector3(.28, 3.6, -.12), new T.Vector3(.1, 5.4, .2)], .16, roseGold, 18);
    for (let j = 0; j < 7; j++) {
      // Tips stop short of the crown surface, so no branch pokes out of a cotton puff.
      const a = j * 2.399, r = (1.55 + rand() * .8) * .8, y = 3.4 + rand() * 1.5;
      const end = new T.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
      tube(root, [new T.Vector3(.1, 1.6 + rand(), 0), new T.Vector3(end.x * .35, y - .9, end.z * .35), end], .06, roseGold, 14);
      for (let k = 0; k < 2; k++) tube(root, [end.clone().multiplyScalar(.88), end.clone().add(new T.Vector3((rand() - .5) * 1.3, .65, (rand() - .5) * 1.3))], .022, roseGold, 8);
    }
    const crown = new T.Color(color), pale = new T.Color("#fdeef2"), shade = seededRandom(seed + 91);
    for (const puff of studyCanopyPuffs(seed + 73)) {
      const place = new T.Vector3(x + puff.x * size, .7 + puff.y * size, z + puff.z * size);
      const spin = new T.Euler((shade() - .5) * .5, shade() * Math.PI * 2, (shade() - .5) * .5);
      stamp(crowns.mesh, crowns.used++, place, [puff.r * size, puff.r * puff.squash * size, puff.r * size], spin, crown.clone().lerp(pale, .5 + shade() * .25));
    }
    // The capacity is generous, so the drawn count follows the puffs that were actually stamped.
    crowns.mesh.count = crowns.used;
    finish(crowns.mesh);
    contact(parent, x, z, 7 * size, 5.5 * size);
  }
  function arch(parent: T.Object3D, x: number, y: number, z: number, width: number, height: number) {
    const root = new T.Group(); root.position.set(x, y, z); parent.add(root);
    const points = Array.from({ length: 25 }, (_, i) => { const a = i / 24 * Math.PI; return new T.Vector3(Math.cos(a) * width / 2, height * .57 + Math.sin(a) * height * .43, 0); });
    tube(root, points, .31, ivory, 80); tube(root, points.map(p => p.clone().add(new T.Vector3(0, .025, .26))), .022, gold, 80);
    for (const s of [-1, 1]) {
      mesh(root, cylinder, ivory, [s * width / 2, height * .285, 0], [.32, height * .57, .32]);
      for (const h of [.13, .36, height * .56]) mesh(root, cylinder, h === .13 ? edge : gold, [s * width / 2, h, 0], [.45, h === .13 ? .2 : .06, .45]);
      contact(root, s * width / 2, 0, 2.3, 1.7, .035);
    }
    return root;
  }
  const islandShape = geometry(new T.LatheGeometry(new T.SplineCurve([new T.Vector2(0,-5.9),new T.Vector2(.25,-5.4),new T.Vector2(.42,-4.2),new T.Vector2(.62,-3.8),new T.Vector2(.73,-2.6),new T.Vector2(.96,-1.9),new T.Vector2(1,-.55),new T.Vector2(.98,0)]).getPoints(48), 96));
  const falls: T.Mesh[] = [];
  const fall = material(new T.ShaderMaterial({ transparent: true, side: T.DoubleSide, depthWrite: false, uniforms: { time },
    vertexShader: `varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec2 v;uniform float time;void main(){float thread=.6+.25*sin(v.x*120.+sin(v.y*8.-time)*1.1)+.15*sin(v.x*279.-time*.2);float crest=pow(max(0.,sin(v.y*28.-time*3.+v.x*3.)),12.);float edge=pow(max(0.,sin(v.x*3.14159)),.5);float fade=smoothstep(0.,.07,v.y);gl_FragColor=vec4(mix(vec3(.52,.78,.78),vec3(.99,.96,.88),thread),edge*fade*(.27+thread*.3+crest*.12));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }` }));
  function waterfall(parent: T.Object3D, x: number, z: number, height: number, width: number, rotation: number) {
    const o = mesh(parent, geometry(new T.PlaneGeometry(width, height, 8, 18)), fall, [x, .25 - height / 2, z]); o.rotation.y = rotation; falls.push(o);
  }

  const districtRoots = new Map<ZoneId, T.Group>();
  ZONES.forEach((zone, i) => {
    const root = new T.Group(); root.name = `Design district: ${zone.id}`; root.position.fromArray(zone.center); scene.add(root); districtRoots.set(zone.id, root);
    const radius = i < 3 ? 17.8 : 13.8;
    mesh(root, islandShape, rock, [0, -.9, 0], [radius * 1.01, 1.25 + i % 3 * .2, radius * .97]);
    for (let layer = 0; layer < 3; layer++) {
      mesh(root, geometry(studyTerrace(radius - layer * .65, radius - layer * .65 + .2, .38)), layer === 2 ? ivory : edge, [0, -.35 + layer * .42, 0]);
      ring(root, radius - layer * .65 - .12, -.14 + layer * .42, .018);
    }
    ring(root, radius - 2.1, .69, .021); ring(root, radius - 2.4, .691, .009);
    const facing = Math.atan2(zone.eye[0] - zone.center[0], zone.eye[2] - zone.center[2]);
    const layout = new T.Group(); layout.rotation.y = facing; root.add(layout);
    if (zone.id !== "heart") {
      const arches = zone.id === "expressions" ? 5 : 3, width = zone.id === "expressions" ? 3.8 : 4.8;
      for (let k = 0; k < arches; k++) arch(layout, (k - (arches - 1) / 2) * width * 1.1, .65, -9.3, width, i < 3 ? 10.3 + (k === 1 ? 1.2 : 0) : 8.4);
    }
    const color = ["#e893b9", "#f0a8b8", "#bc92d9", "#edb4ba"][i % 4];
    const crowns: Crowns = { mesh: instance(layout, cottonSphere, cotton, (i < 3 ? 4 : 2) * 15, true), used: 0 };
    for (const side of [-1, 1]) {
      const bed = mesh(layout, geometry(new T.RingGeometry(7.6, i < 3 ? 14.7 : 11.5, 64, 2, side === 1 ? -.75 : Math.PI - .75, 1.50)), lawn, [0, .68, 0]);
      bed.rotation.x = -Math.PI / 2;
      const foliage = instance(layout, midPetal, leaf, 48);
      const random = seededRandom(i * 12 + side + 50);
      for (let j = 0; j < 48; j++) {
        const a = (side === 1 ? -.75 : Math.PI - .75) + random() * 1.5, r = 9 + random() * (i < 3 ? 4.8 : 2);
        stamp(foliage, j, new T.Vector3(Math.cos(a)*r, .69, -Math.sin(a)*r), [.52, .75, 1.05], new T.Euler(.45, random()*Math.PI*2, .08));
      } finish(foliage);
    }
    tree(layout, -12.4, -2.8, i < 3 ? 1.16 : .95, 900 + i * 11, color, crowns);
    tree(layout, 12.3, -6.9, i < 3 ? 1.10 : .92, 980 + i * 19, color, crowns);
    if (i < 3) {
      tree(layout, -9.4, -11.5, .91, 1220 + i, "#f8dbd6", crowns);
      tree(layout, 14.1, 6.3, .94, 1290 + i, color, crowns);
    }
    for (let k = 0; k < (i < 3 ? 4 : 2); k++) {
      const x = (k % 2 ? 1 : -1) * (10 + k * .5), z = 5 - Math.floor(k / 2) * 11;
      flowers(layout, i < 3 ? 26 : 15, 1440 + i * 17 + k, new T.Vector3(x, .68, z), 2.1, k % 2 ? "#dcbde3" : "#f4b9c9");
    }
    waterfall(layout, -4.8, -radius + .35, Math.max(5.6, zone.center[1] + 5.3), 3.6, 0);
    waterfall(layout, 6.7, -radius + 1.4, Math.max(5.6, zone.center[1] + 5.3), 2.1, -.15);
  });

  // Wide, continuously connected bridges, with a flat surface and thin metal rails.
  const connections: Array<[ZoneId, ZoneId]> = [["garden","heart"],["heart","expressions"],["garden","expressions"]];
  const connected = new Set<ZoneId>(["garden","heart","expressions"]);
  while (connected.size < ZONES.length) {
    let best: [ZoneId,ZoneId] | undefined, distance = Infinity;
    for (const from of ZONES.filter(z=>connected.has(z.id))) for (const to of ZONES.filter(z=>!connected.has(z.id))) {
      const d = new T.Vector3(...from.center).distanceTo(new T.Vector3(...to.center));
      if (d < distance) { distance=d; best=[from.id,to.id]; }
    }
    if (!best) break; connections.push(best); connected.add(best[1]);
  }
  for (let i = 0; i < connections.length; i++) {
    const from = ZONES.find(z => z.id === connections[i][0])!, to = ZONES.find(z => z.id === connections[i][1])!;
    const a = new T.Vector3(...from.center).add(new T.Vector3(0, .6, 0)), b = new T.Vector3(...to.center).add(new T.Vector3(0, .6, 0));
    const direction = b.clone().sub(a); direction.y = 0; direction.normalize();
    a.addScaledVector(direction, ZONES.indexOf(from) < 3 ? 16.2 : 12.2);
    b.addScaledVector(direction, ZONES.indexOf(to) < 3 ? -16.2 : -12.2);
    const mid = a.clone().lerp(b, .5); mid.y += 2.4; mid.x += (i % 2 ? 1 : -1) * 4;
    const curve = new T.CatmullRomCurve3([a, mid, b]), positions: number[] = [], normals: number[] = [], uvs: number[] = [], indices: number[] = [];
    const rails: T.Vector3[][] = [[], []];
    for (let j = 0; j <= 48; j++) {
      const p = curve.getPoint(j / 48), tangent = curve.getTangent(j / 48), side = new T.Vector3(tangent.z, 0, -tangent.x).normalize();
      for (const sign of [-1, 1]) { const q = p.clone().addScaledVector(side, 2.15 * sign); positions.push(q.x, q.y, q.z); normals.push(0,1,0); uvs.push(j / 48, sign === 1 ? 1 : 0); rails[sign === 1 ? 1 : 0].push(q.clone().add(new T.Vector3(0, .22, 0))); }
      if (j < 48) { const n=j*2;indices.push(n,n+2,n+1,n+1,n+2,n+3); }
    }
    const g = geometry(new T.BufferGeometry()); g.setAttribute("position",new T.Float32BufferAttribute(positions,3));g.setAttribute("normal",new T.Float32BufferAttribute(normals,3));g.setAttribute("uv",new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();
    mesh(scene,g,ivory);rails.forEach(points=>tube(scene,points,.045,gold,48));
  }

  // Sanctuary silhouette: curved ivory arcade, original sculpted heart, independent silk.
  const sanctuary = districtRoots.get("heart")!;
  const arcade = new T.Group(); arcade.rotation.y = Math.atan2(14,28); sanctuary.add(arcade);
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * .05 + i / 6 * Math.PI * .90;
    const arc = arch(arcade, Math.cos(a) * 12.8, .65, -Math.sin(a) * 12.8 - 1.5, 5.15, 11.8);
    arc.rotation.y = Math.PI / 2 - a;
  }
  for (let i = 0; i < 4; i++) { mesh(sanctuary,geometry(studyTerrace(7.6-i*.8,7.9-i*.8,.28)),ivory,[0,.88+i*.28,0]);ring(sanctuary,7.6-i*.8,1.03+i*.28,.018); }
  const heartRoot = new T.Group(); heartRoot.name = "Supplied original sculpted heart"; heartRoot.userData.dynamic = true; heartRoot.position.set(0, 8.7, 0); heartRoot.rotation.y = .25; heartRoot.scale.setScalar(3.25); sanctuary.add(heartRoot);
  new GLTFLoader().load("/world-prototype/original-heart.glb", gltf => {
    gltf.scene.traverse(o => { if (o instanceof T.Mesh) { geometries.add(o.geometry); const old = Array.isArray(o.material) ? o.material : [o.material]; old.forEach(m => m.dispose()); o.material = rose; o.castShadow = true; } });
    if (disposed) { gltf.scene.traverse(o => { if (o instanceof T.Mesh) o.geometry.dispose(); }); return; }
    heartRoot.add(gltf.scene); scene.userData.prototypeHeartReady = true; invalidate();
  }, undefined, error => { if (!disposed) { scene.userData.prototypeHeartError = "Original heart did not load"; console.error("Design study original heart", error); invalidate(); } });
  // One silk recipe now serves the Sanctuary ribbons and the arrival ribbon study.
  const silkMat = material(studySilk()); silkMat.color.set("#f9cfd6");
  const ribbons: T.Mesh[] = [];
  for (let index = 0; index < 4; index++) {
    const g = geometry(new T.PlaneGeometry(1,1,100,6)), o = mesh(sanctuary,g,silkMat);o.userData.dynamic=true;ribbons.push(o);
    motions.push(t=>{
      const p=g.getAttribute("position");
      for(let j=0;j<=6;j++)for(let i=0;i<=100;i++){
        const u=i/100,v=j/6-.5,a=u*Math.PI*(2.02+index*.17)+index*1.65+t*(.054+index*.009);
        const width=Math.pow(Math.max(.00001,Math.sin(u*Math.PI)),.7)*(1.3+index*.22),r=5.7+Math.sin(u*5+index)*.9+Math.sin(t*.27+index)*.3;
        p.setXYZ(j*101+i,Math.cos(a)*(r+v*.35),2.8+u*11.7+Math.sin(a+t*.1+index)*1.2+v*width+Math.sin(u*37+v*7+t*(.8+index*.08))*.08,Math.sin(a)*(r+v*.4));
      }p.needsUpdate=true;g.computeVertexNormals();
    });
  }
  motions.push(t=>{heartRoot.rotation.y=.25+Math.sin(t*.13)*.10;heartRoot.position.y=8.7+Math.sin(t*.36)*.07;});

  // Canonical expression artwork remains recognizable and retains its original meaning.
  const grove = districtRoots.get("expressions")!;
  WORLD_EXPRESSIONS.forEach((expression,i)=>{
    const a=-Math.PI*.9+i/8*Math.PI*1.6, x=Math.cos(a)*10.5,z=Math.sin(a)*9.3;
    mesh(grove,cylinder,ivory,[x,2.8,z],[.48,4.25,.48]);ring(grove,3.7,.71,.015);
    const group=new T.Group();group.position.set(x,5.15,z);group.rotation.y=.48;grove.add(group);
    const map=texture(new T.TextureLoader().load(`/home-art/icon${expression.id}.webp`,invalidate));map.colorSpace=T.SRGBColorSpace;
    const iconMat=material(new T.MeshBasicMaterial({map,transparent:true,toneMapped:false,side:T.DoubleSide}));
    const surround=material(new T.MeshPhysicalMaterial({color:new T.Color(expression.color).lerp(new T.Color("#fff0e5"),.66),metalness:.12,roughness:.25,clearcoat:.8}));
    mesh(group,bead,surround,[0,0,0],[1.08,1.08,.35]);mesh(group,geometry(new T.CircleGeometry(.96,48)),iconMat,[0,0,.37]);
    mesh(group,geometry(new T.TorusGeometry(1.18,.022,6,64)),gold);group.userData.dynamic=true;
    motions.push(t=>{group.position.y=5.15+Math.sin(t*.23+i)*.15;});
  });

  // Distinct distant landmarks keep every destination legible throughout a continuous tour.
  for (const zone of ZONES.slice(3)) {
    const root=districtRoots.get(zone.id)!;
    if(zone.id==="peacemakers"||zone.id==="status"){
      const globeMat=material(new T.MeshPhysicalMaterial({color:zone.id==="peacemakers"?"#91c9c5":"#b0bcdd",roughness:.2,metalness:.17,transparent:true,opacity:.68,depthWrite:false}));
      const globe=mesh(root,geometry(new T.SphereGeometry(4,48,32)),globeMat,[0,7,0]);
      for(let k=0;k<5;k++){const r=mesh(root,geometry(new T.TorusGeometry(4.06,.024,6,72)),gold,[0,7,0]);r.rotation.y=k*Math.PI/5;}
      for(let k=-2;k<=2;k++){const y=k*1.2, r=ring(root,Math.sqrt(16-y*y),7+y,.022);r.position.z=.01;}
      globe.userData.dynamic=true;
    }else if(zone.id==="milestone"){
      for(let k=0;k<5;k++){mesh(root,geometry(new T.CylinderGeometry(6-k,6.3-k,.4,64)),ivory,[0,1+k*1.6,0]);ring(root,6-k,1.22+k*1.6);waterfall(root,0,5-k,3.8,3.2-k*.4,0);}
    }else if(zone.id==="orbit"){
      for(let k=0;k<4;k++){const orbit=mesh(root,geometry(new T.TorusGeometry(5+k*.7,.035,6,96)),gold,[0,7,0]);orbit.rotation.set(k*.55,.4+k*.37,0);}
    }else if(zone.id==="calendar"){
      for(let k=0;k<7;k++)mesh(root,geometry(new T.BoxGeometry(1.5,.45+(k%3)*.25,1.5)),ivory,[(k-3)*2.3,1.1,0]);
    }else if(zone.id==="welcome"){
      const portal=arch(root,0,.6,0,9.5,13);portal.rotation.y=.45;
      for(let side=-1;side<=1;side+=2){const wing=mesh(portal,petal,rose,[side*.25,11,0],[3.5,4.2,3.5]);wing.rotation.set(Math.PI/2,side*.7,side*.65);}
    }else if(zone.id==="featured"){
      for(let k=0;k<5;k++){const a=k/5*Math.PI*2;arch(root,Math.cos(a)*7,.6,Math.sin(a)*7,5,10).rotation.y=-a-Math.PI/2;}
    }else if(zone.id==="live-feed"){
      for(let k=0;k<6;k++){const a=k*.72;mesh(root,cylinder,ivory,[Math.cos(a)*8,1+k*.22,Math.sin(a)*6],[1.5,.3,1.5]);}
    }else if(zone.id==="practice"||zone.id==="promise"){
      for(const s of [-1,1])mesh(root,geometry(new T.BoxGeometry(4.2,.32,1.15)),ivory,[s*5,1.45,1]);
    }
  }

  // Arrival forms share the existing director phases and complete reading interval.
  const entry = new T.Group(); entry.name="Design study arrival stage";entry.position.set(4.138,.6,19.104);scene.add(entry);
  mesh(entry,geometry(studyTerrace(10.8,11,.65)),ivory);ring(entry,10.2,.35,.03);ring(entry,9.9,.36,.009);
  // Each study is an independent stage on the entry platform, built from the shared
  // registrars so dispose() still covers every geometry, material and texture.
  const lotusShape=petalGeometry(40,24);
  const stageContext:StageContext={geometry,material,texture,instance,gold,ivory,farPetal,pollen,lotusShape,time,seededRandom};
  const stages={bloom:bloomStage(stageContext),ribbon:ribbonStage(stageContext),constellation:constellationStage(stageContext)} as const;
  const stageStyles=["bloom","ribbon","constellation"] as const;
  for(const key of stageStyles){stages[key].group.visible=false;entry.add(stages[key].group);}
  const stageEffects={sparkles:true,trails:true};

  // A few quiet, miniature figures provide scale without covering the scenery with labels.
  function figure(parent:T.Object3D,x:number,z:number,color:string){
    const root=new T.Group();root.position.set(x,.72,z);parent.add(root);
    const dress=material(new T.MeshStandardMaterial({color,roughness:.8})),skin=material(new T.MeshStandardMaterial({color:"#deb995",roughness:.8})),hair=material(new T.MeshStandardMaterial({color:"#594339",roughness:.9}));
    const body = geometry(new T.LatheGeometry(new T.SplineCurve([new T.Vector2(.35,0),new T.Vector2(.37,.05),new T.Vector2(.29,.4),new T.Vector2(.23,.76),new T.Vector2(.25,.92),new T.Vector2(.12,1.02)]).getPoints(22),32));
    mesh(root,body,dress,[0,.35,0]);mesh(root,bead,skin,[0,1.65,0],[.33,.35,.32]);mesh(root,bead,hair,[0,1.8,-.035],[.34,.24,.32]);
    for(const side of [-1,1]){const arm=mesh(root,geometry(new T.CapsuleGeometry(.087,.44,5,12)),dress,[side*.29,1.00,.03]);arm.rotation.z=side*.20;mesh(root,bead,skin,[side*.35,.71,.03],[.09,.1,.09]);}
    for(const s of [-1,1]){mesh(root,cylinder,skin,[s*.17,.28,0],[.085,.42,.085]);mesh(root,bead,hair,[s*.17,.065,.08],[.11,.07,.19]);}contact(parent,x,z,1.5,.85);
  }
  for(const id of ["garden","heart","expressions"] as const){const root=districtRoots.get(id)!;figure(root,-5,8,"#d788a9");figure(root,-3.8,8.5,"#a79ac9");}

  // Soft glowing dots that breathe, in place of the old solid firefly cubes.
  const sparkleCount=140,sparklePlaces=new Float32Array(sparkleCount*3),sparklePhase=new Float32Array(sparkleCount);
  const rand=seededRandom(455);
  for(let i=0;i<sparkleCount;i++){
    sparklePlaces[i*3]=(rand()-.5)*125;sparklePlaces[i*3+1]=2+rand()*18;sparklePlaces[i*3+2]=(rand()-.5)*115-15;sparklePhase[i]=rand();
  }
  const sparkleGeometry=geometry(new T.BufferGeometry());
  sparkleGeometry.setAttribute("position",new T.BufferAttribute(sparklePlaces,3));
  sparkleGeometry.setAttribute("phase",new T.BufferAttribute(sparklePhase,1));
  const sparkleField=new T.Points(sparkleGeometry,material(sparklePoints(time,.55,"#fff0cf",.9,texture(softDot(64)))));
  sparkleField.name="Study sparkles";sparkleField.frustumCulled=false;scene.add(sparkleField);
  motions.forEach(fn=>fn(0));districtRoots.forEach(batch);batch(entry);
  return {
    scene, anchors: WORLD_EXPRESSIONS.map((_,i)=>new T.Vector3(14+Math.cos(i)*10,5,-45+Math.sin(i)*10)), recognitionPearls: [],
    setRecognitions() { /* The unchanged world-space recognition manager owns all records. */ },
    setEffects(s, t) { sparkles=s;trails=t; },
    update(t,_zone,arrival){
      time.value=t;motions.forEach(fn=>fn(t));clouds.update(t);ribbons.forEach(o=>{o.visible=trails;});sparkleField.visible=sparkles;sparkleField.rotation.y=Math.sin(t*.016)*.04;
      const pose=arrivalPose(arrival);
      scene.userData.studyArrivalPose=pose;
      const style=studyArrival(scene.userData.studyArrival);
      stageEffects.sparkles=sparkles;stageEffects.trails=trails;
      for(const key of stageStyles){
        const visible=pose.active&&style===key;
        stages[key].group.visible=visible;
        if(visible)stages[key].update(pose,t,stageEffects);
      }
    },
    dispose(){disposed=true;instances.forEach(o=>o.dispose());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());sun.shadow.map?.dispose();shadowCanvas.width=shadowCanvas.height=1;scene.clear();},
  };
}
