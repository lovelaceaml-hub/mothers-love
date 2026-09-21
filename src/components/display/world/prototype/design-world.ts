import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { ZONES, WORLD_EXPRESSIONS, seededRandom, type ZoneId } from "../world-data";
import type { WorldScene } from "../world-scene-legacy";
import { studyArrival } from "./design-mode";

/** An opt-in visual study on the real world engine, camera, data fixture and clock. */
export function createDesignWorld(): WorldScene {
  const scene = new T.Scene();
  scene.name = "Mother's Love, visual study 01";
  scene.background = new T.Color("#eadce4");
  scene.fog = new T.FogExp2("#eadce4", .0028);
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
  const ivory = material(new T.MeshPhysicalMaterial({ color: "#fff1dc", roughness: .37, metalness: .04, clearcoat: .27, clearcoatRoughness: .3 }));
  const edge = material(new T.MeshStandardMaterial({ color: "#e1cdb7", roughness: .64 }));
  const gold = material(new T.MeshStandardMaterial({ color: "#d3ae6c", metalness: .78, roughness: .27 }));
  const roseGold = material(new T.MeshStandardMaterial({ color: "#b28b74", metalness: .3, roughness: .64 }));
  const rose = material(new T.MeshPhysicalMaterial({ color: "#d9567f", roughness: .44, metalness: .04, clearcoat: .45, clearcoatRoughness: .48, sheen: .2, sheenColor: new T.Color("#ffc5d5") }));
  const leaf = material(new T.MeshStandardMaterial({ color: "#85aa92", roughness: .85, side: T.DoubleSide }));
  const lawn = material(new T.MeshStandardMaterial({ color: "#a8c7a8", roughness: .96, metalness: 0 }));
  const rock = material(new T.MeshStandardMaterial({ color: "#acbcb6", roughness: .95 }));
  const bloom = material(new T.MeshPhysicalMaterial({ color: "#ffffff", roughness: .64, sheen: .7, sheenColor: new T.Color("#ffe4dd"), sheenRoughness: .85, side: T.DoubleSide }));
  const cylinder = geometry(new T.CylinderGeometry(1, 1, 1, 16));
  const bead = geometry(new T.SphereGeometry(1, 12, 8));
  const petal = geometry(new T.PlaneGeometry(1, 1, 8, 5));
  const pos = petal.getAttribute("position"), uv = petal.getAttribute("uv");
  for (let i = 0; i < pos.count; i++) {
    const u = uv.getY(i), v = uv.getX(i) * 2 - 1, span = Math.pow(Math.max(0, Math.sin(Math.PI * u)), .58);
    pos.setXYZ(i, v * span * .63, .45 * u * u - .11 * Math.sin(Math.PI * u) + v * v * span * .19, u);
  }
  petal.computeVertexNormals(); petal.computeBoundingSphere();
  const dummy = new T.Object3D(), tint = new T.Color();
  function mesh(parent: T.Object3D, g: T.BufferGeometry, m: T.Material, p: number[] = [0, 0, 0], scale: number[] = [1, 1, 1]) {
    const o = new T.Mesh(g, m); o.position.set(p[0], p[1], p[2]); o.scale.set(scale[0], scale[1], scale[2]); o.receiveShadow = !m.transparent; parent.add(o); return o;
  }
  function tube(parent: T.Object3D, points: T.Vector3[], r: number, m: T.Material = gold, segments = 32) {
    return mesh(parent, geometry(new T.TubeGeometry(new T.CatmullRomCurve3(points), segments, r, 6, false)), m);
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

  scene.add(new T.HemisphereLight("#fff0df", "#778a9a", .68));
  const sun = new T.DirectionalLight("#ffe6c1", 2.7); sun.position.set(-38, 72, 38);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = sun.shadow.camera.bottom = -95; sun.shadow.camera.right = sun.shadow.camera.top = 95; sun.shadow.camera.far = 220; sun.shadow.normalBias = .045; sun.shadow.bias = -.00018; scene.add(sun);
  const fill = new T.DirectionalLight("#b9ceff", .9); fill.position.set(52, 35, -30); scene.add(fill);
  const rim = new T.DirectionalLight("#ffc3d7", .55); rim.position.set(-30, 14, -60); scene.add(rim);
  const sky = material(new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, fog: false, uniforms: { time, top: { value: new T.Color("#809bcf") }, horizon: { value: new T.Color("#f2c9d8") } },
    vertexShader: `varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 p;uniform float time;uniform vec3 top,horizon;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
      float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.02+1.71;a*=.5;}return v;}
      void main(){vec3 d=normalize(p);float y=smoothstep(-.12,.40,d.y);vec3 c=mix(horizon,top,y);vec2 q=vec2(atan(d.z,d.x)*3.8,d.y*8.);float cloud=smoothstep(.38,.70,fbm(q+vec2(time*.001,0.)))*exp(-pow((d.y-.12)*3.,2.));c=mix(c,vec3(.98,.89,.87),cloud*.70);float glow=pow(max(0.,dot(d,normalize(vec3(-.8,.25,.3)))),34.);c+=vec3(.25,.16,.07)*glow;gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }` }));
  mesh(scene, geometry(new T.SphereGeometry(400, 32, 16)), sky).renderOrder = -100;
  const water = material(new T.ShaderMaterial({ uniforms: { time },
    vertexShader: `varying vec3 p;void main(){vec4 w=modelMatrix*vec4(position,1.);p=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `varying vec3 p;uniform float time;void main(){vec2 q=p.xz;float a=sin(q.x*.38+sin(q.y*.27+time*.12)*1.3),b=sin(q.y*.64-q.x*.18-time*.36);float c=sin(q.x*.87+q.y*.26+time*.22);float glint=pow(max(0.,a*b*c),12.);float lines=pow(.5+.5*sin(q.y*3.4+sin(q.x*.5+time*.18)*1.3-time*.45),18.);float horizon=smoothstep(20.,210.,length(cameraPosition.xz-q));vec3 col=mix(vec3(.15,.43,.44),vec3(.40,.69,.67),.57+a*.08+b*.04);col+=vec3(.55,.39,.20)*glint+vec3(.04,.07,.06)*lines;col=mix(col,vec3(.75,.75,.83),horizon*.65);gl_FragColor=vec4(col,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }` }));
  const sea = mesh(scene, geometry(new T.CircleGeometry(320, 96)), water, [0, -5, -30]); sea.rotation.x = -Math.PI / 2;

  const shadowCanvas = document.createElement("canvas"); shadowCanvas.width = shadowCanvas.height = 128;
  const sc = shadowCanvas.getContext("2d")!, sg = sc.createRadialGradient(64, 64, 0, 64, 64, 64);
  sg.addColorStop(0, "#65566460"); sg.addColorStop(.45, "#75697424"); sg.addColorStop(1, "#75697400"); sc.fillStyle = sg; sc.fillRect(0, 0, 128, 128);
  const shadowMap = texture(new T.CanvasTexture(shadowCanvas)); shadowMap.colorSpace = T.SRGBColorSpace;
  const shadow = material(new T.MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false, toneMapped: false }));
  const contactPlane = geometry(new T.PlaneGeometry(1, 1));
  function contact(parent: T.Object3D, x: number, z: number, width: number, depth: number, y = .72) {
    const o = mesh(parent, contactPlane, shadow, [x, y, z], [width, depth, 1]); o.rotation.x = -Math.PI / 2;
  }

  function flowers(parent: T.Object3D, count: number, seed: number, base: T.Vector3, spread: number, canopy = false, color = "#f0afc9") {
    const petalCount = canopy ? 8 : 6;
    const rand = seededRandom(seed), petals = instance(parent, petal, bloom, count * petalCount, canopy), cores = instance(parent, bead, gold, count);
    const stems = canopy ? undefined : instance(parent, cylinder, leaf, count);
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * spread;
      const p = base.clone().add(new T.Vector3(Math.cos(a) * r, canopy ? (rand() - .5) * spread * .92 + (1 - r / spread) * .85 : .45 + rand() * .8, Math.sin(a) * r));
      const size = canopy ? .36 + rand() * .24 : .29 + rand() * .30;
      const normal = canopy ? p.clone().sub(base).multiply(new T.Vector3(1, .7, 1)).add(new T.Vector3(0, .7, 0)).normalize() : new T.Vector3((rand()-.5)*.6,1,(rand()-.5)*.6).normalize();
      const up = new T.Vector3(0,1,0), orientation = new T.Quaternion().setFromUnitVectors(up, normal);
      for (let j = 0; j < petalCount; j++) {
        const c = new T.Color(color).lerp(new T.Color(i % 4 ? "#ffe9dc" : "#d799ce"), rand() * .30);
        const inner = canopy && j >= 5, scale = size * (inner ? .60 : 1);
        const angle = inner ? (j-5)*Math.PI*2/3+a+.3 : j*Math.PI*2/(canopy?5:6)+a;
        const rotation = new T.Euler().setFromQuaternion(orientation.clone().multiply(new T.Quaternion().setFromAxisAngle(up, angle)));
        stamp(petals, i * petalCount + j, p.clone().addScaledVector(normal, inner ? size*.09 : 0), [scale, scale*(inner?1.6:1), scale], rotation, c);
      }
      stamp(cores, i, p.clone().addScaledVector(normal, size*.10), [size * .10, size * .08, size * .10], new T.Euler().setFromQuaternion(orientation));
      if (stems) stamp(stems, i, new T.Vector3(p.x, .72 + (p.y - .72) / 2, p.z), [.022, Math.max(.08, p.y - .72), .022], new T.Euler());
    }
    finish(petals); finish(cores); if (stems) finish(stems);
  }
  function tree(parent: T.Object3D, x: number, z: number, size: number, seed: number, color: string, full: boolean) {
    const root = new T.Group(); root.position.set(x, .7, z); root.scale.setScalar(size); parent.add(root);
    const rand = seededRandom(seed);
    tube(root, [new T.Vector3(), new T.Vector3(-.18, 1.7, .1), new T.Vector3(.28, 3.6, -.12), new T.Vector3(.1, 5.4, .2)], .16, roseGold, 18);
    for (let j = 0; j < 7; j++) {
      const a = j * 2.399, r = 1.55 + rand() * .8, y = 3.4 + rand() * 1.5;
      const end = new T.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
      tube(root, [new T.Vector3(.1, 1.6 + rand(), 0), new T.Vector3(end.x * .35, y - .9, end.z * .35), end], .06, roseGold, 14);
      for (let k = 0; k < 2; k++) tube(root, [end.clone().multiplyScalar(.88), end.clone().add(new T.Vector3((rand() - .5) * 1.3, .65, (rand() - .5) * 1.3))], .022, roseGold, 8);
    }
    flowers(root, full ? 245 : 74, seed + 73, new T.Vector3(0, 4.6, 0), 3.2, true, color);
    contact(parent, x, z, 7 * size, 5.5 * size);
  }
  function arch(parent: T.Object3D, x: number, y: number, z: number, width: number, height: number) {
    const root = new T.Group(); root.position.set(x, y, z); parent.add(root);
    const points = Array.from({ length: 25 }, (_, i) => { const a = i / 24 * Math.PI; return new T.Vector3(Math.cos(a) * width / 2, height * .57 + Math.sin(a) * height * .43, 0); });
    tube(root, points, .31, ivory, 40); tube(root, points.map(p => p.clone().add(new T.Vector3(0, .025, .26))), .022, gold, 40);
    for (const s of [-1, 1]) {
      mesh(root, cylinder, ivory, [s * width / 2, height * .285, 0], [.32, height * .57, .32]);
      for (const h of [.13, .36, height * .56]) mesh(root, cylinder, h === .13 ? edge : gold, [s * width / 2, h, 0], [.45, h === .13 ? .2 : .06, .45]);
      contact(root, s * width / 2, 0, 2.3, 1.7, .035);
    }
    return root;
  }
  const islandShape = geometry(new T.LatheGeometry([new T.Vector2(0,-5.9),new T.Vector2(.25,-5.4),new T.Vector2(.42,-4.2),new T.Vector2(.62,-3.8),new T.Vector2(.73,-2.6),new T.Vector2(.96,-1.9),new T.Vector2(1,-.55),new T.Vector2(.98,0)], 72));
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
      mesh(root, geometry(new T.CylinderGeometry(radius - layer * .65, radius - layer * .65 + .2, .38, 96)), layer === 2 ? ivory : edge, [0, -.35 + layer * .42, 0]);
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
    for (const side of [-1, 1]) {
      const bed = mesh(layout, geometry(new T.RingGeometry(7.6, i < 3 ? 14.7 : 11.5, 64, 2, side === 1 ? -.75 : Math.PI - .75, 1.50)), lawn, [0, .68, 0]);
      bed.rotation.x = -Math.PI / 2;
      const foliage = instance(layout, petal, leaf, 48);
      const random = seededRandom(i * 12 + side + 50);
      for (let j = 0; j < 48; j++) {
        const a = (side === 1 ? -.75 : Math.PI - .75) + random() * 1.5, r = 9 + random() * (i < 3 ? 4.8 : 2);
        stamp(foliage, j, new T.Vector3(Math.cos(a)*r, .69, -Math.sin(a)*r), [.52, .75, 1.05], new T.Euler(.45, random()*Math.PI*2, .08));
      } finish(foliage);
    }
    tree(layout, -11.7, -1.8, i < 3 ? 1.27 : .95, 900 + i * 11, color, i < 3);
    tree(layout, 11.5, -5.9, i < 3 ? 1.15 : .92, 980 + i * 19, color, i < 3);
    if (i < 3) {
      tree(layout, -9.4, -11.5, .91, 1220 + i, "#f8dbd6", true);
      tree(layout, 12.7, 7.2, 1.10, 1290 + i, color, true);
    }
    for (let k = 0; k < (i < 3 ? 4 : 2); k++) {
      const x = (k % 2 ? 1 : -1) * (10 + k * .5), z = 5 - Math.floor(k / 2) * 11;
      flowers(layout, i < 3 ? 26 : 15, 1440 + i * 17 + k, new T.Vector3(x, .68, z), 2.1, false, k % 2 ? "#d9b4de" : "#f0b3c0");
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
  for (let i = 0; i < 4; i++) { mesh(sanctuary,geometry(new T.CylinderGeometry(7.6-i*.8,7.9-i*.8,.28,96)),ivory,[0,.88+i*.28,0]);ring(sanctuary,7.6-i*.8,1.03+i*.28,.018); }
  const heartRoot = new T.Group(); heartRoot.name = "Supplied original sculpted heart"; heartRoot.userData.dynamic = true; heartRoot.position.set(0, 8.7, 0); heartRoot.rotation.y = .25; heartRoot.scale.setScalar(3.25); sanctuary.add(heartRoot);
  new GLTFLoader().load("/world-prototype/original-heart.glb", gltf => {
    gltf.scene.traverse(o => { if (o instanceof T.Mesh) { geometries.add(o.geometry); const old = Array.isArray(o.material) ? o.material : [o.material]; old.forEach(m => m.dispose()); o.material = rose; o.castShadow = true; } });
    if (disposed) { gltf.scene.traverse(o => { if (o instanceof T.Mesh) o.geometry.dispose(); }); return; }
    heartRoot.add(gltf.scene); scene.userData.prototypeHeartReady = true; invalidate();
  }, undefined, error => { if (!disposed) { scene.userData.prototypeHeartError = "Original heart did not load"; console.error("Design study original heart", error); invalidate(); } });
  const silkMat = material(new T.MeshPhysicalMaterial({ color: "#f9ded6", roughness: .47, metalness: .06, transparent: true, opacity: .38, side: T.DoubleSide, depthWrite: false, sheen: 1, sheenColor: new T.Color("#fff0bd"), sheenRoughness: .5 }));
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
  mesh(entry,geometry(new T.CylinderGeometry(10.8,11,.65,96)),ivory);ring(entry,10.2,.35,.03);ring(entry,9.9,.36,.009);
  const lotus=new T.Group(), portal=new T.Group(), constellation=new T.Group();entry.add(lotus,portal,constellation);
  portal.position.y=constellation.position.y=2.7;
  lotus.userData.dynamic=portal.userData.dynamic=constellation.userData.dynamic=true;
  const lotusPetals:T.Mesh[]=[];
  const lotusPink=material(new T.MeshPhysicalMaterial({color:"#ed9cba",roughness:.42,sheen:1,sheenColor:new T.Color("#fff0df"),side:T.DoubleSide}));
  const lotusPale=material(new T.MeshPhysicalMaterial({color:"#f7c9d1",roughness:.4,sheen:1,sheenColor:new T.Color("#fff5dd"),side:T.DoubleSide}));
  for(let k=0;k<18;k++){const inner=k>=10,o=mesh(lotus,petal,k%3?lotusPink:lotusPale,[0,.4,0],inner?[2.4,6.3,4.3]:[3.2,5.1,6.0]);o.rotation.y=k*Math.PI*2/(inner?8:10);o.userData.dynamic=true;lotusPetals.push(o);}
  for(let k=0;k<3;k++){const p=mesh(portal,geometry(new T.TorusGeometry(7.4+k*.37,.07,10,120)),k===1?ivory:gold,[0,8.7,0]);p.rotation.set(.09,k*.25-.2,-.14+k*.13);}
  for(let ribbon=0;ribbon<3;ribbon++){
    const g=geometry(new T.PlaneGeometry(1,1,100,6)),veil=mesh(portal,g,silkMat);veil.userData.dynamic=true;
    motions.push(t=>{
      const p=g.getAttribute("position");
      for(let j=0;j<=6;j++)for(let i=0;i<=100;i++){
        const u=i/100,a=u*Math.PI*2+ribbon*.39,v=j/6-.5,phase=t*.22+ribbon*1.7;
        const width=1.6+Math.sin(a+phase)*.5,r=7.5+ribbon*.37+v*width;
        p.setXYZ(j*101+i,Math.cos(a)*r,8.7+Math.sin(a)*r,Math.sin(a*2+phase)*.68+v*Math.sin(a+phase)*1.5+ribbon*.17);
      }p.needsUpdate=true;g.computeVertexNormals();
    });
  }
  const stars=instance(constellation,bead,material(new T.MeshBasicMaterial({color:"#ffedbf",toneMapped:false})),96);
  for(let k=0;k<96;k++){const a=k*2.399,r=2+Math.sqrt(k/96)*8;stamp(stars,k,new T.Vector3(Math.cos(a)*r,4+k/96*16,Math.sin(a)*r),[.05,.05,.05],new T.Euler());}finish(stars);
  for(let k=0;k<3;k++){const o=mesh(constellation,geometry(new T.TorusGeometry(6.7+k*.45,.018,5,100)),gold,[0,9,0]);o.rotation.set(k*.5,.3+k*.2,k*.4);}

  // A few quiet, miniature figures provide scale without covering the scenery with labels.
  function figure(parent:T.Object3D,x:number,z:number,color:string){
    const root=new T.Group();root.position.set(x,.72,z);parent.add(root);
    const dress=material(new T.MeshStandardMaterial({color,roughness:.8})),skin=material(new T.MeshStandardMaterial({color:"#deb995",roughness:.8})),hair=material(new T.MeshStandardMaterial({color:"#594339",roughness:.9}));
    mesh(root,geometry(new T.ConeGeometry(.38,1.15,18)),dress,[0,.84,0]);mesh(root,bead,skin,[0,1.65,0],[.33,.35,.32]);mesh(root,bead,hair,[0,1.8,-.015],[.345,.23,.33]);
    for(const s of [-1,1]){mesh(root,cylinder,skin,[s*.17,.28,0],[.085,.42,.085]);mesh(root,bead,hair,[s*.17,.065,.08],[.11,.07,.19]);}contact(parent,x,z,1.5,.85);
  }
  for(const id of ["garden","heart","expressions"] as const){const root=districtRoots.get(id)!;figure(root,-5,8,"#d788a9");figure(root,-3.8,8.5,"#a79ac9");}

  const fireflies = instance(scene,bead,material(new T.MeshBasicMaterial({color:"#fff1ca",transparent:true,opacity:.8,toneMapped:false})),90);
  const rand=seededRandom(455);for(let i=0;i<90;i++)stamp(fireflies,i,new T.Vector3((rand()-.5)*125,2+rand()*18,(rand()-.5)*115-15),[.026,.026,.026],new T.Euler());finish(fireflies);
  motions.forEach(fn=>fn(0));districtRoots.forEach(batch);batch(entry);
  return {
    scene, anchors: WORLD_EXPRESSIONS.map((_,i)=>new T.Vector3(14+Math.cos(i)*10,5,-45+Math.sin(i)*10)), recognitionPearls: [],
    setRecognitions() { /* The unchanged world-space recognition manager owns all records. */ },
    setEffects(s, t) { sparkles=s;trails=t; },
    update(t,_zone,arrival){
      time.value=t;motions.forEach(fn=>fn(t));ribbons.forEach(o=>{o.visible=trails;});fireflies.visible=sparkles;fireflies.rotation.y=Math.sin(t*.016)*.04;
      const active=!!arrival&&arrival.phase!=="idle"&&arrival.phase!=="return";
      const style=studyArrival(scene.userData.studyArrival);
      lotus.visible=active&&style==="bloom";portal.visible=active&&style==="ribbon";constellation.visible=active&&style==="constellation";
      if(arrival){const reveal=arrival.phase==="approach"?0:arrival.phase==="reveal"?arrival.progress:1;lotusPetals.forEach((o,i)=>{const inner=i>=10;o.rotation.x=-.72+reveal*(inner?.54:.88);o.rotation.y=(inner?i-10:i)*Math.PI*2/(inner?8:10)+(inner?.2:0);});portal.scale.setScalar(.72+reveal*.28);constellation.rotation.y=t*.09;}
    },
    dispose(){disposed=true;instances.forEach(o=>o.dispose());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());sun.shadow.map?.dispose();shadowCanvas.width=shadowCanvas.height=1;scene.clear();},
  };
}
