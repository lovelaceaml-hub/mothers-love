import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { ZONES, WORLD_EXPRESSIONS, seededRandom, type WorldZone, type ZoneId } from "../world-data";
import type { WorldScene } from "../world-scene-legacy";
import type { ArrivalState } from "../arrival-director";
import type { WorldKit } from "../kit/kit-loader";
import { applyKitDistricts } from "./kit-districts";
import { applyKitCorridors, kitCorridorSites } from "./kit-corridors";
import { createKitNeighbors, type KitNeighbors } from "../kit/kit-neighbors";
import { studyArrival } from "./design-mode";
import { studyCanopyPuffs, studyCottonMaterial } from "./study-canopy";
import { createStudyClouds, studyCloudAtlas, studyCloudLayout } from "./study-clouds";
import { arrivalPose } from "./arrival-choreography";
import { bloomStage, constellationStage, ribbonStage, type StageContext } from "./arrival-stages";
import { studyPetal, studyRibbonPoint, studyTerrace } from "./study-geometry";
import { studySunHalo } from "./study-lighting";
import {
  STUDY_EXPOSURE, STUDY_GLOW_PASS, STUDY_HEART_PULSE, STUDY_SUN_VIEW,
  softDot, sparklePoints, studyGlow, studyRim, studySilk, studyStone, studyStoneCaustic,
} from "./study-materials";
import { lanternLayout, type LanternPoint } from "./study-glory";
import { createStudyAir, type AirFocus } from "./study-air";
import { createStudyLandmarks, studyLandmarkCloudSites, studyLandmarkLayout } from "./study-landmarks";
import { STUDY_FOG, STUDY_SKY, STUDY_SUN, STUDY_TONE } from "./study-palette";
import { applyTvForeground, applyTvPalette } from "./tv-foreground";
import { studyTvPage } from "./tv-page";

/**
 * What a kit builder may hand back: per frame work on the world clock, the owner's effect
 * switches, and its own disposal. The design world calls each part it finds.
 */
export type KitBuilderHandle = {
  update?(time: number, zone: ZoneId, arrival: ArrivalState | undefined): void;
  setEffects?(sparkles: boolean, trails: boolean): void;
  dispose?(): void;
};
/** One procedural arch as the study built it, so a builder can replace it in place. */
export type DesignKitArch = {
  root: T.Group;
  parent: T.Object3D;
  width: number;
  height: number;
  /** Its keystone lantern in `archCrowns`, or null where the arch opted out of lanterns. */
  crown: { root: T.Group; height: number } | null;
};
/** One of the thirteen districts, in the frame of section 6.1 of the design. */
export type DesignKitDistrict = {
  zone: WorldZone;
  /** Index in `ZONES`; the first three are the large islands. */
  index: number;
  /** At `zone.center`. */
  root: T.Group;
  /** The district local frame: `root` turned by `facing`, +z toward the tour eye, +x to its right. */
  layout: T.Group;
  radius: number;
  facing: number;
  /**
   * Every procedural arch in the district: the row at local z -9.3 in `layout` (three, five at
   * the grove, none at the Sanctuary, whose arcade is `sanctuary.arches`), then the welcome
   * portal or the featured ring of five, which `landmark` lists too.
   */
  arches: DesignKitArch[];
  /** Cotton crowned tree roots (trunks and branches; the crowns are one instanced draw per district). */
  trees: T.Group[];
  /** The two lawn bed arcs. */
  beds: T.Mesh[];
  /**
   * Waterfall planes in this district: the two off the back edge, then the milestone's five
   * tier falls (also in `landmark`). `removeFall` takes one out before the falls merge.
   */
  falls: T.Mesh[];
  /** The zone's own procedural landmark pieces (globe and rings, tiers, orbits, boxes, portal, pavilion arches, drums, slabs). */
  landmark: T.Object3D[];
  /** The two miniature figures (garden, heart and expressions only). */
  figures: T.Group[];
};
export type DesignKitBridge = {
  from: ZoneId;
  to: ZoneId;
  /** The deck centre line in world space, from `start` at the first island's edge to `end`. */
  curve: T.CatmullRomCurve3;
  start: T.Vector3;
  end: T.Vector3;
};
/**
 * Everything the design world hands the kit builders (Plan 26 lanes K3a, K3b and K4), so
 * they can place kit pieces, replace procedural ones in place and register every geometry,
 * material and texture for disposal, without editing this file. Builders run once, after the
 * whole procedural world exists and before the falls merge and the static batch, so whatever
 * they add is merged by material identity like the rest. They are called only with a kit;
 * with `?kit=off` or a failed kit none of this is built.
 */
export type DesignKitContext = {
  kit: WorldKit;
  scene: T.Scene;
  /** The shared study clock uniform. */
  time: { value: number };
  geometry: <G extends T.BufferGeometry>(g: G) => G;
  material: <M extends T.Material>(m: M) => M;
  texture: <X extends T.Texture>(t: X) => X;
  instance: (parent: T.Object3D, g: T.BufferGeometry, m: T.Material, count: number, shadow?: boolean) => T.InstancedMesh;
  stamp: (target: T.InstancedMesh, i: number, p: T.Vector3, s: number[], rotation: T.Euler, color?: T.Color | string) => void;
  finish: (o: T.InstancedMesh) => void;
  mesh: (parent: T.Object3D, g: T.BufferGeometry, m: T.Material, p?: number[], scale?: number[]) => T.Mesh;
  ring: (parent: T.Object3D, r: number, y: number, thickness?: number, m?: T.Material) => T.Mesh;
  tube: (parent: T.Object3D, points: T.Vector3[], r: number, m?: T.Material, segments?: number) => T.Mesh;
  /** A procedural arch, lantern crowned unless told otherwise. */
  arch: (parent: T.Object3D, x: number, y: number, z: number, width: number, height: number, contacts?: boolean, detail?: number, lanterns?: boolean) => T.Group;
  contact: (parent: T.Object3D, x: number, z: number, width: number, depth: number, y?: number) => void;
  /** A waterfall plane on the study shader; it joins the one merged falls mesh. */
  waterfall: (parent: T.Object3D, x: number, z: number, height: number, width: number, rotation: number) => void;
  /** Take a procedural waterfall plane out of the world before the merge. */
  removeFall: (plane: T.Mesh) => void;
  /** A per frame motion on the world clock, run once at 0 before batching. */
  motion: (fn: (time: number) => void) => void;
  /** The study's shared materials; the kit remap maps onto these (`kit-materials.ts`). */
  palette: {
    ivory: T.Material; edge: T.Material; gold: T.Material; rose: T.Material; roseGold: T.Material;
    leaf: T.Material; lawn: T.Material; stone: T.Material; bloom: T.Material; water: T.Material;
    silk: T.Material; cotton: T.Material; shadow: T.Material; fall: T.Material;
  };
  districts: ReadonlyMap<ZoneId, DesignKitDistrict>;
  /** Keystone lanterns, read after batching: push a crown for a new arch, splice out a removed one. */
  archCrowns: Array<{ root: T.Group; height: number }>;
  bridges: readonly DesignKitBridge[];
  /** The arrival stage platform at `(4.138, .6, 19.104)`. */
  entry: T.Group;
  /** The six far horizon islands. */
  landmarks: T.Group;
  grove: { root: T.Group; sites: ReadonlyArray<{ x: number; z: number; group: T.Group; column: T.Mesh }> };
  sanctuary: { root: T.Group; arcade: T.Group; arches: DesignKitArch[]; heart: T.Group };
  sparkleDot: T.Texture;
  farPetal: T.BufferGeometry;
};

/** An opt-in visual study on the real world engine, camera, data fixture and clock. */
export function createDesignWorld(kit?: WorldKit): WorldScene {
  const scene = new T.Scene();
  scene.name = "Mother's Love, visual study 02";
  scene.background = new T.Color(STUDY_FOG.color);
  scene.fog = new T.Fog(STUDY_FOG.color, STUDY_FOG.near, STUDY_FOG.far);
  scene.userData.prototypeHeartReady = false;
  scene.userData.studyArrival = studyArrival(new URLSearchParams(window.location.search).get("entrance"));
  // The kit, for the pieces built outside this file (the pearl skin reads it from here).
  if (kit) scene.userData.studyKit = kit;
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
  const edge = material(new T.MeshStandardMaterial({ color: "#f2dfd3", roughness: .64, dithering: true }));
  // Section 7, architecture at dusk: the gold inlay carries a low warm emissive that breathes,
  // and its glow contribution brightens on the side the low sun is on. The glow branch only
  // runs for the meshes that joined layer 1 below, which is the merged gold of each district
  // and the merged bridge rails.
  const gold = studyGlow(
    material(new T.MeshStandardMaterial({
      color: "#e6c17c", metalness: .82, roughness: .24,
      emissive: new T.Color("#ffcc7a"), emissiveIntensity: .12,
    })),
    // Corrected down from the design's .22 and .5 after the checkpoint captures: the gold runs
    // along every rail and arch in the frame, so it is broad rather than bright, and at the
    // design's weights it carried Expressions past the luminance the pass is allowed. A second
    // round took it to .10 and .22 once the Sanctuary measurement isolated the glow composite.
    "gold", "vec3(1.,.80,.48)*(.06 + .16*saturate(dot(normalize(normal), studySunView)))",
  );
  const roseGold = material(new T.MeshStandardMaterial({ color: "#8d7462", metalness: .05, roughness: .77 }));
  // Cosmetic only. The supplied heart GLB, its geometry and its normals are never touched.
  // Section 7 gives it the warm pulse: the emissive swells on the shared five second beat and
  // the glow branch adds the same beat plus a soft rim wherever the mesh is on the glow layer.
  const rose = studyGlow(
    studyRim(material(new T.MeshPhysicalMaterial({ color: "#e05d85", roughness: .36, metalness: .04, clearcoat: .55, clearcoatRoughness: .3, sheen: .35, sheenColor: new T.Color("#ffd1dd"), emissive: new T.Color("#ff5a86"), emissiveIntensity: .05, dithering: true })), "#ffb6c8", 2.5, .3),
    "heart",
    // Corrected down from the design's 1.4 and .35 after the checkpoint captures. The heart
    // fills a good part of the Sanctuary frame, and at the design's weights it wrote a value
    // near .7 across that whole silhouette into the glow target, which the five bloom mips
    // then spread over the frame: Sanctuary rose 3.1 against a 1.5 ceiling. At .5 and .2 the
    // pulse still reads as a warm swell. A second round took it to .32 and .13, with the halo
    // at .12 and the orbiting sparkles at .6, which is what finally holds the ceiling.
    "vec3(1.,.36,.53)*studyHeartPulse*.32 + vec3(1.,.72,.80)*pow(1.-saturate(dot(normalize(normal),normalize(vViewPosition))),2.5)*.13",
  );
  const leaf = material(new T.MeshPhysicalMaterial({ color: "#8fb48c", roughness: .57, sheen: .2, side: T.DoubleSide }));
  const lawn = material(new T.MeshStandardMaterial({ color: "#c1d7ad", roughness: .9, metalness: 0 }));
  // Section 7 chains the waterline caustics onto Section 5's carved rock.
  const stone = material(studyStoneCaustic(studyStone(), time));
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
  function batch(group: T.Group, shadows = true) {
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
      meshes.forEach(o => o.removeFromParent());
      const source = meshes[0].material as T.Material;
      const out = mesh(group, geometry(merged), source);
      out.castShadow = shadows; out.receiveShadow = shadows && !source.transparent;
      // Named so a later pass can address a merged mesh, for example to put the gold or the decks on a render layer.
      out.name = `${group.name} merged ${source.name || source.type}`;
    }
  }

  scene.add(new T.HemisphereLight("#f7dbe0", "#cfa79d", .55));
  const sun = new T.DirectionalLight(STUDY_SUN.color, 2.3);
  // STUDY_SUN fixes the direction; the distance only decides where the orthographic shadow
  // box sits along that ray. At the authored length the two high districts at z -112 (orbit
  // and milestone) sat behind the shadow camera near plane and received no shadow at all, so
  // the light is pushed out along the same direction. Shadow angles are unchanged.
  sun.position.set(...STUDY_SUN.lightPosition).setLength(180);
  sun.castShadow = true; sun.shadow.intensity = STUDY_TONE.shadowIntensity; sun.shadow.mapSize.set(2048, 2048);
  // Bounds measured in light space over all 13 district footprints and the arrival platform, and
  // left asymmetric so the box stays tight: 227 by 125 units is a finer texel on a 2048 map than
  // the old symmetric 240 by 240 box, and the worst remaining district margin is about 10 units.
  sun.shadow.camera.left = -126; sun.shadow.camera.right = 101;
  sun.shadow.camera.bottom = -60; sun.shadow.camera.top = 65;
  sun.shadow.camera.near = 20; sun.shadow.camera.far = 290;
  sun.shadow.normalBias = .06; sun.shadow.bias = -.0002; scene.add(sun);
  scene.userData.studySun = sun;
  const fill = new T.DirectionalLight("#ffd0c8", .75); fill.position.set(70, 38, 95); scene.add(fill);
  // A quiet lavender bounce from the cool side of the sky, in place of the old pink rim light.
  const cool = new T.DirectionalLight("#c9c3ff", .35); cool.position.set(80, 30, -40); scene.add(cool);
  // Section 8: the sky carries the study mood envelope, so the whole backdrop dips a little
  // through a travel and lifts again on arrival, together with the tone mapping exposure the
  // engine sets from the same value. Parked, the uniform is exactly 1 and this is unchanged.
  const sky = material(new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, fog: false, uniforms: { time, studyExposure: STUDY_EXPOSURE, top: { value: new T.Color(STUDY_SKY.zenith) }, mid: { value: new T.Color(STUDY_SKY.mid) }, horizon: { value: new T.Color(STUDY_SKY.horizon) }, sun: { value: new T.Vector3(...STUDY_SUN.direction) } },
    vertexShader: `varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 p;uniform float time,studyExposure;uniform vec3 top,mid,horizon,sun;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
      float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.02+1.71;a*=.5;}return v;}
      void main(){vec3 d=normalize(p);vec3 c=mix(horizon,mid,smoothstep(0.,.18,d.y));c=mix(c,top,smoothstep(.18,.75,d.y));
      float lift=smoothstep(0.,.16,d.y);
      vec2 q=vec2(atan(d.z,d.x)*3.8,d.y*8.);float cloud=smoothstep(.38,.70,fbm(q+vec2(time*.001,0.)))*exp(-pow((d.y-.12)*3.,2.));c=mix(c,vec3(.965,.831,.871),cloud*.55*lift);
      float key=max(0.,dot(d,sun));c+=vec3(1.,.914,.824)*(pow(key,5.)*.20+pow(key,60.)*.5)*lift;c=min(c,vec3(1.))*studyExposure;gl_FragColor=vec4(c,1.);
      #include <colorspace_fragment>
      }` }));
  mesh(scene, geometry(new T.SphereGeometry(400, 32, 16)), sky).renderOrder = -100;
  const halo = studySunHalo();
  // Section 6: the two visible sun sprites stay off the glow layer. They are already large and
  // additive, so blooming them doubled the sun and washed out the top of the frame; only the
  // wide band below feeds the bloom. A third sprite lives on the rays layer alone, where it is
  // the one bright thing in the black occluder mask. `allowOverride` false exempts it from that
  // pass's override material (three 0.180 WebGLRenderer.js L1987).
  halo.sprites.forEach(sprite => scene.add(sprite));
  halo.materials.forEach(material); texture(halo.map);
  // Section 8: the authored sizes, so the travel swell below is applied to them rather than
  // compounded frame on frame. Parked, the sprites are exactly the size they are today.
  const haloScale = halo.sprites.map(sprite => sprite.scale.x);
  const sunAt = new T.Vector3(...STUDY_SUN.direction).multiplyScalar(330);
  const skyBand = new T.Sprite(material(new T.SpriteMaterial({
    // Corrected down from the design's .14 after the checkpoint captures.
    map: halo.map, color: "#ffd9b8", transparent: true, opacity: .05,
    blending: T.AdditiveBlending, depthWrite: false, depthTest: true, fog: false,
  })));
  skyBand.name = "Study sky glow band"; skyBand.position.copy(sunAt);
  skyBand.scale.set(420, 140, 1); skyBand.renderOrder = -60;
  skyBand.layers.set(1); scene.add(skyBand);
  const raysSun = new T.Sprite(material(new T.SpriteMaterial({
    map: halo.map, color: "#ffe9cc", transparent: true, opacity: 1,
    blending: T.AdditiveBlending, depthWrite: false, depthTest: true, fog: false,
  })));
  raysSun.material.allowOverride = false;
  raysSun.name = "Study rays sun"; raysSun.position.copy(sunAt);
  raysSun.scale.set(64, 64, 1); raysSun.layers.set(2); scene.add(raysSun);
  // Turquoise, glossier, with a second high frequency ripple and a tight sun glitter path.
  // Verified against three 0.180 meshphysical: at `#include <lights_fragment_end>` the shader
  // carries `reflectedLight`, the perturbed view space `normal` and `vViewPosition`, and the
  // fragment prefix declares `viewMatrix`, so the world space sun folds into view space here.
  // Section 7, water glory: a higher environment intensity and metalness turn the sea into a
  // mirror of the golden hour sky rather than a tinted sheet, and the lower roughness with the
  // stronger clearcoat keeps the reflection sharp enough to read as water. Plan 26 visual
  // review deepened the body colour one step (D2 #6ec9cf) toward the board's turquoise.
  const water = material(new T.MeshPhysicalMaterial({ color: "#57bfd0", roughness: .12, metalness: .22, clearcoat: .85, clearcoatRoughness: .12, envMapIntensity: 1.35, dithering: true }));
  water.onBeforeCompile = shader => {
    shader.uniforms.studyTime = time;
    shader.uniforms.studySunWorld = { value: new T.Vector3(...STUDY_SUN.direction) };
    shader.vertexShader = "varying vec3 waterPosition;\n" + shader.vertexShader.replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nwaterPosition=(modelMatrix*vec4(position,1.)).xyz;");
    shader.fragmentShader = "varying vec3 waterPosition;uniform float studyTime;uniform vec3 studySunWorld;\n" + shader.fragmentShader
      .replace("#include <normal_fragment_begin>", `#include <normal_fragment_begin>
      vec2 q=waterPosition.xz;float dx=.034*cos(q.x*.33+q.y*.18+studyTime*.32)+.017*cos(q.x*.9-q.y*.4-studyTime*.23)+.010*sin(q.x*6.7+studyTime*1.3)*cos(q.y*5.3-studyTime*.9);
      float dz=.028*cos(q.y*.44-q.x*.13-studyTime*.28)+.009*sin(q.x*.55+q.y*.7+studyTime*.18)+.008*cos(q.x*9.1-studyTime*1.1);
      normal=normalize(mat3(viewMatrix)*vec3(-dx,1.,-dz));`)
      .replace("#include <opaque_fragment>", `vec3 studyV = normalize(vViewPosition);
      vec3 studyR = reflect(-studyV, normal);
      vec3 studyS = normalize((viewMatrix * vec4(studySunWorld, 0.)).xyz);
      // The sun path adds straight to outgoingLight. Added to reflectedLight.directSpecular
      // instead, the clearcoat block below <lights_fragment_end> scales it by (1 - clearcoat * Fcc),
      // which at the grazing angles a sea is seen from erases most of the glitter.
      outgoingLight += vec3(1.,.9,.72) * pow(max(0., dot(studyR, studyS)), 320.) * 2.2;
#include <opaque_fragment>`);
  };
  water.customProgramCacheKey = () => "study-outdoor-water-v2";
  // The sun path is the only part of the sea that reaches the glow layer, so the bloom gives
  // the glitter its soft tails without lifting the whole surface into a bright wash.
  //
  // Corrected down from the design's .6 after the checkpoint captures isolated the glow
  // composite per view. The sea fills the lower frame and the low sun draws its path straight
  // at the viewer, so this one term was the largest single new contributor at the Sanctuary,
  // more than the whole of the heart glory. At .3 the path still reads and the ceiling holds.
  studyGlow(water, "glitter",
    "vec3(1.,.93,.78) * pow(max(0., dot(reflect(-normalize(vViewPosition), normal), studySunView)), 320.) * .3");
  // Named so every merged mesh below carries a readable name a later pass can find.
  ivory.name = "ivory"; edge.name = "edge"; gold.name = "gold"; stone.name = "stone"; lawn.name = "lawn";
  leaf.name = "leaf"; rose.name = "rose"; roseGold.name = "rose gold"; bloom.name = "bloom"; water.name = "water";
  const sea = mesh(scene, geometry(new T.CircleGeometry(320, 96)), water, [0, -5, -30]); sea.rotation.x = -Math.PI / 2;
  sea.name = "Study sea"; sea.layers.enable(1);

  // Soft pink air: a drifting ring of cloud near the horizon, and a collar of puffs
  // under every island rim so the terraces read as floating rather than cut off.
  const landmarkLayout = studyLandmarkLayout();
  // The corridor islets (K3b) earn cloud collars and petals like every island. Empty without a kit.
  const corridorSites = kit ? kitCorridorSites(kit) : [];
  const cloudSites = studyLandmarkCloudSites(landmarkLayout);
  cloudSites.push(...corridorSites.map(site => ({ center: [...site.center] as [number, number, number], radius: site.radius })));
  const clouds = createStudyClouds(studyCloudLayout(777, cloudSites), texture(studyCloudAtlas()), time);
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
    return root;
  }
  // Every arch in the connected world hangs a lantern at its keystone. The far landmarks opt
  // out: they sit 158 to 193 units away, where a lantern is a sub-pixel speck.
  const archCrowns: Array<{ root: T.Group; height: number }> = [];
  function arch(parent: T.Object3D, x: number, y: number, z: number, width: number, height: number, contacts = true, detail = 80, lanterns = true) {
    const root = new T.Group(); root.position.set(x, y, z); parent.add(root);
    if (lanterns) archCrowns.push({ root, height });
    const points = Array.from({ length: 25 }, (_, i) => { const a = i / 24 * Math.PI; return new T.Vector3(Math.cos(a) * width / 2, height * .57 + Math.sin(a) * height * .43, 0); });
    tube(root, points, .31, ivory, detail); tube(root, points.map(p => p.clone().add(new T.Vector3(0, .025, .26))), .022, gold, detail);
    for (const s of [-1, 1]) {
      mesh(root, cylinder, ivory, [s * width / 2, height * .285, 0], [.32, height * .57, .32]);
      for (const h of [.13, .36, height * .56]) mesh(root, cylinder, h === .13 ? edge : gold, [s * width / 2, h, 0], [.45, h === .13 ? .2 : .06, .45]);
      if (contacts) contact(root, s * width / 2, 0, 2.3, 1.7, .035);
    }
    return root;
  }
  const islandProfile = new T.SplineCurve([new T.Vector2(0,-5.9),new T.Vector2(.25,-5.4),new T.Vector2(.42,-4.2),new T.Vector2(.62,-3.8),new T.Vector2(.73,-2.6),new T.Vector2(.96,-1.9),new T.Vector2(1,-.55),new T.Vector2(.98,0)]);
  const islandShape = geometry(new T.LatheGeometry(islandProfile.getPoints(48), 96));
  // The same silhouette at a fraction of the cost, for keels no viewer sees closer than 190 units.
  const islandShapeFar = geometry(new T.LatheGeometry(islandProfile.getPoints(20), 32));
  const falls: T.Mesh[] = [];
  // A raw ShaderMaterial opts out of fog unless it asks for it, which left the far waterfalls
  // sitting in front of the haze. The fog uniforms are merged the same way study-clouds does it,
  // and the shared study clock is re-attached afterwards because merge() clones its values.
  const fallUniforms = T.UniformsUtils.merge([T.UniformsLib.fog]);
  fallUniforms.time = time;
  // Section 6: the same shader draws the crest into the glow layer when the radiance pass asks.
  fallUniforms.studyGlowPass = STUDY_GLOW_PASS;
  const fall = material(new T.ShaderMaterial({ transparent: true, side: T.DoubleSide, depthWrite: false, fog: true, uniforms: fallUniforms,
    vertexShader: `varying vec2 v;
    #include <fog_pars_vertex>
    void main(){v=uv;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
    #include <fog_vertex>
    }`,
    fragmentShader: `varying vec2 v;uniform float time,studyGlowPass;
    #include <fog_pars_fragment>
    void main(){float thread=.6+.25*sin(v.x*120.+sin(v.y*8.-time)*1.1)+.15*sin(v.x*279.-time*.2);float crest=pow(max(0.,sin(v.y*28.-time*3.+v.x*3.)),12.);float edge=pow(max(0.,sin(v.x*3.14159)),.5);float fade=smoothstep(0.,.07,v.y);gl_FragColor=vec4(mix(vec3(.52,.78,.78),vec3(.99,.96,.90),thread),edge*fade*(.27+thread*.3+crest*.12));
    // Only the breaking crest reaches the glow layer, so a fall reads as spray and not as a lit sheet.
    if(studyGlowPass>.5)gl_FragColor=vec4(vec3(1.,.97,.9)*crest*edge*fade*.8,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
    }` }));
  // The plane is deliberately not registered for disposal here: all 31 of them are merged into
  // one mesh below, which takes their place in the registrar, and the sources are released there.
  function waterfall(parent: T.Object3D, x: number, z: number, height: number, width: number, rotation: number) {
    const o = mesh(parent, new T.PlaneGeometry(width, height, 8, 18), fall, [x, .25 - height / 2, z]); o.rotation.y = rotation; falls.push(o);
    return o;
  }
  // The kit builders' view of every procedural arch: which lantern crown belongs to which arch.
  function archRecord(root: T.Group, width: number, height: number): DesignKitArch {
    return { root, parent: root.parent!, width, height, crown: archCrowns.find(crown => crown.root === root) ?? null };
  }

  const districtRoots = new Map<ZoneId, T.Group>();
  const districts = new Map<ZoneId, DesignKitDistrict>();
  ZONES.forEach((zone, i) => {
    const root = new T.Group(); root.name = `Design district: ${zone.id}`; root.position.fromArray(zone.center); scene.add(root); districtRoots.set(zone.id, root);
    const radius = i < 3 ? 17.8 : 13.8;
    mesh(root, islandShape, stone, [0, -.9, 0], [radius * 1.01, 1.25 + i % 3 * .2, radius * .97]);
    for (let layer = 0; layer < 3; layer++) {
      mesh(root, geometry(studyTerrace(radius - layer * .65, radius - layer * .65 + .2, .38)), layer === 2 ? ivory : edge, [0, -.35 + layer * .42, 0]);
      ring(root, radius - layer * .65 - .12, -.14 + layer * .42, .018);
    }
    ring(root, radius - 2.1, .69, .021); ring(root, radius - 2.4, .691, .009);
    const facing = Math.atan2(zone.eye[0] - zone.center[0], zone.eye[2] - zone.center[2]);
    const layout = new T.Group(); layout.rotation.y = facing; root.add(layout);
    const district: DesignKitDistrict = { zone, index: i, root, layout, radius, facing, arches: [], trees: [], beds: [], falls: [], landmark: [], figures: [] };
    districts.set(zone.id, district);
    if (zone.id !== "heart") {
      const arches = zone.id === "expressions" ? 5 : 3, width = zone.id === "expressions" ? 3.8 : 4.8;
      for (let k = 0; k < arches; k++) {
        const height = i < 3 ? 10.3 + (k === 1 ? 1.2 : 0) : 8.4;
        district.arches.push(archRecord(arch(layout, (k - (arches - 1) / 2) * width * 1.1, .65, -9.3, width, height), width, height));
      }
    }
    // One step deeper than D2's crowns (#e893b9, #f0a8b8, #bc92d9, #edb4ba), visual review 2026-09-23.
    const color = ["#e07fb0", "#ea96ad", "#b27fd4", "#e6a0b0"][i % 4];
    const crowns: Crowns = { mesh: instance(layout, cottonSphere, cotton, (i < 3 ? 4 : 2) * 15, true), used: 0 };
    for (const side of [-1, 1]) {
      // The lawn sits .01 above the ivory terrace top (y .68). At .68 exactly the two were
      // coplanar and fought for depth, which read as horizontal streaks through every bed.
      const bed = mesh(layout, geometry(new T.RingGeometry(7.6, i < 3 ? 14.7 : 11.5, 64, 2, side === 1 ? -.75 : Math.PI - .75, 1.50)), lawn, [0, .69, 0]);
      bed.rotation.x = -Math.PI / 2; district.beds.push(bed);
      const foliage = instance(layout, midPetal, leaf, 48);
      const random = seededRandom(i * 12 + side + 50);
      for (let j = 0; j < 48; j++) {
        const a = (side === 1 ? -.75 : Math.PI - .75) + random() * 1.5, r = 9 + random() * (i < 3 ? 4.8 : 2);
        stamp(foliage, j, new T.Vector3(Math.cos(a)*r, .69, -Math.sin(a)*r), [.52, .75, 1.05], new T.Euler(.45, random()*Math.PI*2, .08));
      } finish(foliage);
    }
    district.trees.push(tree(layout, -12.4, -2.8, i < 3 ? 1.16 : .95, 900 + i * 11, color, crowns));
    district.trees.push(tree(layout, 12.3, -6.9, i < 3 ? 1.10 : .92, 980 + i * 19, color, crowns));
    if (i < 3) {
      district.trees.push(tree(layout, -9.4, -11.5, .91, 1220 + i, "#f8dbd6", crowns));
      district.trees.push(tree(layout, 14.1, 6.3, .94, 1290 + i, color, crowns));
    }
    for (let k = 0; k < (i < 3 ? 4 : 2); k++) {
      const x = (k % 2 ? 1 : -1) * (10 + k * .5), z = 5 - Math.floor(k / 2) * 11;
      flowers(layout, i < 3 ? 26 : 15, 1440 + i * 17 + k, new T.Vector3(x, .68, z), 2.1, k % 2 ? "#dcbde3" : "#f4b9c9");
    }
    district.falls.push(waterfall(layout, -4.8, -radius + .35, Math.max(5.6, zone.center[1] + 5.3), 3.6, 0));
    district.falls.push(waterfall(layout, 6.7, -radius + 1.4, Math.max(5.6, zone.center[1] + 5.3), 2.1, -.15));
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
  // Section 7: the 13 decks become one mesh and the 26 rail tubes become one, so a corridor
  // costs two draw calls in total instead of 39. Both are already built in world space on a
  // scene with an identity transform, so no matrix is baked and no vertex moves.
  const deckParts: T.BufferGeometry[] = [], railParts: T.BufferGeometry[] = [];
  const railSamples: LanternPoint[][] = [];
  const bridges: DesignKitBridge[] = [];
  for (let i = 0; i < connections.length; i++) {
    const from = ZONES.find(z => z.id === connections[i][0])!, to = ZONES.find(z => z.id === connections[i][1])!;
    const a = new T.Vector3(...from.center).add(new T.Vector3(0, .6, 0)), b = new T.Vector3(...to.center).add(new T.Vector3(0, .6, 0));
    const direction = b.clone().sub(a); direction.y = 0; direction.normalize();
    a.addScaledVector(direction, ZONES.indexOf(from) < 3 ? 16.2 : 12.2);
    b.addScaledVector(direction, ZONES.indexOf(to) < 3 ? -16.2 : -12.2);
    const mid = a.clone().lerp(b, .5); mid.y += 2.4; mid.x += (i % 2 ? 1 : -1) * 4;
    const curve = new T.CatmullRomCurve3([a, mid, b]), positions: number[] = [], normals: number[] = [], uvs: number[] = [], indices: number[] = [];
    bridges.push({ from: from.id, to: to.id, curve, start: a, end: b });
    const rails: T.Vector3[][] = [[], []];
    for (let j = 0; j <= 48; j++) {
      const p = curve.getPoint(j / 48), tangent = curve.getTangent(j / 48), side = new T.Vector3(tangent.z, 0, -tangent.x).normalize();
      for (const sign of [-1, 1]) { const q = p.clone().addScaledVector(side, 2.15 * sign); positions.push(q.x, q.y, q.z); normals.push(0,1,0); uvs.push(j / 48, sign === 1 ? 1 : 0); rails[sign === 1 ? 1 : 0].push(q.clone().add(new T.Vector3(0, .22, 0))); }
      if (j < 48) { const n=j*2;indices.push(n,n+2,n+1,n+1,n+2,n+3); }
    }
    const g = new T.BufferGeometry(); g.setAttribute("position",new T.Float32BufferAttribute(positions,3));g.setAttribute("normal",new T.Float32BufferAttribute(normals,3));g.setAttribute("uv",new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();
    deckParts.push(g);
    rails.forEach(points => {
      railParts.push(new T.TubeGeometry(new T.CatmullRomCurve3(points), 48, .045, 8, false));
      railSamples.push(points.map(p => [p.x, p.y, p.z] as LanternPoint));
    });
  }
  const mergedDecks = mergeGeometries(deckParts, false);
  // The merge can only fail on mismatched attributes, which 13 copies of one builder cannot
  // have, but the sources are registered rather than dropped if it ever does.
  if (mergedDecks) deckParts.forEach(g => g.dispose()); else deckParts.forEach(g => { geometry(g); mesh(scene, g, ivory); });
  if (mergedDecks) {
    const deck = mesh(scene, geometry(mergedDecks), ivory);
    // Named and put on the ray occluder layer here rather than by the material sweep below,
    // so the corridor keeps blocking shafts exactly as the 13 separate decks did.
    deck.name = "Study bridge decks"; deck.layers.enable(2);
  }
  const mergedRails = mergeGeometries(railParts, false);
  if (mergedRails) railParts.forEach(g => g.dispose()); else railParts.forEach(g => { geometry(g); mesh(scene, g, gold); });
  if (mergedRails) {
    const rail = mesh(scene, geometry(mergedRails), gold);
    rail.name = "Study bridge rails"; rail.layers.enable(1);
  }

  // A horizon that is not empty haze. Six far islands carrying domes, colonnades and arches sit
  // between 190 and 240 units out, past the fog far distance, so they read as pale silhouettes.
  // They are static, so the same batcher collapses the whole horizon to one call per material.
  const landmarks = createStudyLandmarks(landmarkLayout, {
    geometry, ivory, edge, gold, stone, cylinder,
    underside: islandShapeFar,
    terrace: (top, bottom, height, segments) => studyTerrace(top, bottom, height, segments),
    arch: (parent, x, y, z, width, height) => arch(parent, x, y, z, width, height, false, 28, false),
  });
  scene.add(landmarks);

  // Sanctuary silhouette: curved ivory arcade, original sculpted heart, independent silk.
  const sanctuary = districtRoots.get("heart")!;
  const arcade = new T.Group(); arcade.rotation.y = Math.atan2(14,28); sanctuary.add(arcade);
  const arcadeArches: DesignKitArch[] = [];
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * .05 + i / 6 * Math.PI * .90;
    const arc = arch(arcade, Math.cos(a) * 12.8, .65, -Math.sin(a) * 12.8 - 1.5, 5.15, 11.8);
    arc.rotation.y = Math.PI / 2 - a;
    arcadeArches.push(archRecord(arc, 5.15, 11.8));
  }
  for (let i = 0; i < 4; i++) { mesh(sanctuary,geometry(studyTerrace(7.6-i*.8,7.9-i*.8,.28)),ivory,[0,.88+i*.28,0]);ring(sanctuary,7.6-i*.8,1.03+i*.28,.018); }
  const heartRoot = new T.Group(); heartRoot.name = "Supplied original sculpted heart"; heartRoot.userData.dynamic = true; heartRoot.position.set(0, 8.7, 0); heartRoot.rotation.y = .25; heartRoot.scale.setScalar(3.25); sanctuary.add(heartRoot);
  new GLTFLoader().load("/world-prototype/original-heart.glb", gltf => {
    // Section 7: the sculpted heart joins the glow layer here, where its meshes first exist,
    // so the warm pulse in the rose glow branch reaches the bloom.
    gltf.scene.traverse(o => { if (o instanceof T.Mesh) { geometries.add(o.geometry); const old = Array.isArray(o.material) ? o.material : [o.material]; old.forEach(m => m.dispose()); o.material = rose; o.castShadow = true; o.layers.enable(1); } });
    if (disposed) { gltf.scene.traverse(o => { if (o instanceof T.Mesh) o.geometry.dispose(); }); return; }
    heartRoot.add(gltf.scene); scene.userData.prototypeHeartReady = true; invalidate();
  }, undefined, error => { if (!disposed) { scene.userData.prototypeHeartError = "Original heart did not load"; console.error("Design study original heart", error); invalidate(); } });
  // One silk recipe now serves the Sanctuary ribbons and the arrival ribbon study.
  const silkMat = material(studySilk()); silkMat.color.set("#f9cfd6");
  const ribbons: T.Mesh[] = [];
  // The four ribbons used to orbit at radius 5.7 while the heart is 4.5 half-wide, so from the
  // paused Sanctuary framing they crossed the heart as four broad horizontal bands. They now
  // clear the heart by a wide margin and climb away from it, and the phase offsets were chosen
  // numerically so that at the still clock every ribbon passes clear of the heart silhouette,
  // two to each side. The minimum radius, 8.0 - .7 - .15 = 7.15, keeps every vertex outside the
  // heart's scaled, swaying footprint (5.3 wide by 4.2 deep), whose far corner sits 6.76 units out.
  // The path itself lives in study-geometry, so a plain Node test proves it clear of the heart.
  const ribbonPoint = new T.Vector3();
  for (let index = 0; index < 4; index++) {
    const g = geometry(new T.PlaneGeometry(1,1,100,6)), o = mesh(sanctuary,g,silkMat);o.userData.dynamic=true;ribbons.push(o);
    motions.push(t=>{
      const p=g.getAttribute("position");
      for(let j=0;j<=6;j++)for(let i=0;i<=100;i++){
        studyRibbonPoint(index,i/100,j/6-.5,t,ribbonPoint);
        p.setXYZ(j*101+i,ribbonPoint.x,ribbonPoint.y,ribbonPoint.z);
      }p.needsUpdate=true;g.computeVertexNormals();
    });
  }
  motions.push(t=>{heartRoot.rotation.y=.25+Math.sin(t*.13)*.10;heartRoot.position.y=8.7+Math.sin(t*.36)*.07;});

  // Canonical expression artwork remains recognizable and retains its original meaning.
  //
  // Section 8: the nine surrounds become one instanced draw and the nine gold rims another,
  // in place of eighteen. The surround colour moves onto a per instance colour, so one shared
  // material serves all nine; three only multiplies an instance colour into the fragment when
  // the material declares `vertexColors`, which needs a colour attribute on the geometry, so
  // the shared sphere is cloned with a white one. The nine icon discs keep their own draw,
  // because each carries its own artwork.
  const grove = districtRoots.get("expressions")!;
  const groveBead = geometry(bead.clone());
  groveBead.setAttribute("color", new T.Float32BufferAttribute(new Float32Array(groveBead.getAttribute("position").count * 3).fill(1), 3));
  const groveSurround = material(new T.MeshPhysicalMaterial({ vertexColors: true, metalness: .12, roughness: .25, clearcoat: .8 }));
  const groveRim = geometry(new T.TorusGeometry(1.18, .022, 6, 64));
  const groveIcon = geometry(new T.CircleGeometry(.96, 48));
  const groveSurrounds = instance(grove, groveBead, groveSurround, WORLD_EXPRESSIONS.length);
  const groveRims = instance(grove, groveRim, gold, WORLD_EXPRESSIONS.length);
  groveSurrounds.name = "Study grove surrounds"; groveRims.name = "Study grove rims";
  // The material sweep at the end of this builder skips instanced meshes, so the rims join
  // the glow layer here instead, exactly where the nine separate toruses used to be put.
  groveRims.layers.enable(1);
  const groveSpin = new T.Euler(0, .48, 0), groveAt = new T.Vector3();
  const groveSites: Array<{ x: number; z: number; group: T.Group; column: T.Mesh }> = [];
  WORLD_EXPRESSIONS.forEach((expression,i)=>{
    const a=-Math.PI*.9+i/8*Math.PI*1.6, x=Math.cos(a)*10.5,z=Math.sin(a)*9.3;
    const column=mesh(grove,cylinder,ivory,[x,2.8,z],[.48,4.25,.48]);ring(grove,3.7,.71,.015);
    const group=new T.Group();group.position.set(x,5.15,z);group.rotation.y=.48;grove.add(group);
    const map=texture(new T.TextureLoader().load(`/home-art/icon${expression.id}.webp`,invalidate));map.colorSpace=T.SRGBColorSpace;
    const iconMat=material(new T.MeshBasicMaterial({map,transparent:true,toneMapped:false,side:T.DoubleSide}));
    mesh(group,groveIcon,iconMat,[0,0,.37]);group.userData.dynamic=true;
    groveSurrounds.setColorAt(i, tint.set(expression.color).lerp(new T.Color("#fff0e5"), .66));
    groveSites.push({ x, z, group, column });
  });
  if (groveSurrounds.instanceColor) groveSurrounds.instanceColor.needsUpdate = true;
  let groveBounded = false;
  motions.push(t=>{
    groveSites.forEach((site,i)=>{
      const y = 5.15 + Math.sin(t * .23 + i) * .15;
      site.group.position.y = y;
      groveAt.set(site.x, y, site.z);
      stamp(groveSurrounds, i, groveAt, [1.08, 1.08, .35], groveSpin);
      stamp(groveRims, i, groveAt, [1, 1, 1], groveSpin);
    });
    groveSurrounds.instanceMatrix.needsUpdate = true;
    groveRims.instanceMatrix.needsUpdate = true;
    // Bounded once, from the authored places. Each bead only breathes .15 either side of
    // them, which is well inside the radius the beads themselves already add to the sphere.
    if (!groveBounded) { groveBounded = true; groveSurrounds.computeBoundingSphere(); groveRims.computeBoundingSphere(); }
  });

  // Distinct distant landmarks keep every destination legible throughout a continuous tour.
  // Every piece is also recorded on its district, so a kit builder can replace it in place.
  for (const zone of ZONES.slice(3)) {
    const root=districtRoots.get(zone.id)!, piece=districts.get(zone.id)!.landmark;
    const keep=<O extends T.Object3D>(o:O)=>{piece.push(o);return o;};
    if(zone.id==="peacemakers"||zone.id==="status"){
      const globeMat=material(new T.MeshPhysicalMaterial({color:zone.id==="peacemakers"?"#91c9c5":"#b0bcdd",roughness:.2,metalness:.17,transparent:true,opacity:.68,depthWrite:false}));
      const globe=keep(mesh(root,geometry(new T.SphereGeometry(4,48,32)),globeMat,[0,7,0]));
      for(let k=0;k<5;k++){const r=keep(mesh(root,geometry(new T.TorusGeometry(4.06,.024,6,72)),gold,[0,7,0]));r.rotation.y=k*Math.PI/5;}
      for(let k=-2;k<=2;k++){const y=k*1.2, r=keep(ring(root,Math.sqrt(16-y*y),7+y,.022));r.position.z=.01;}
      globe.userData.dynamic=true;
    }else if(zone.id==="milestone"){
      for(let k=0;k<5;k++){keep(mesh(root,geometry(new T.CylinderGeometry(6-k,6.3-k,.4,64)),ivory,[0,1+k*1.6,0]));keep(ring(root,6-k,1.22+k*1.6));districts.get(zone.id)!.falls.push(keep(waterfall(root,0,5-k,3.8,3.2-k*.4,0)));}
    }else if(zone.id==="orbit"){
      // Three rings, not four: with the pearl's own lanes standing down here (Plan 26 K1 visual
      // review), the constellation reads as one orbit instead of a scribble round the words.
      for(let k=0;k<3;k++){const orbit=keep(mesh(root,geometry(new T.TorusGeometry(5+k*.7,.035,6,96)),gold,[0,7,0]));orbit.rotation.set(k*.55,.4+k*.37,0);}
    }else if(zone.id==="calendar"){
      for(let k=0;k<7;k++)keep(mesh(root,geometry(new T.BoxGeometry(1.5,.45+(k%3)*.25,1.5)),ivory,[(k-3)*2.3,1.1,0]));
    }else if(zone.id==="welcome"){
      const portal=keep(arch(root,0,.6,0,9.5,13));portal.rotation.y=.45;
      districts.get(zone.id)!.arches.push(archRecord(portal,9.5,13));
      for(let side=-1;side<=1;side+=2){const wing=mesh(portal,petal,rose,[side*.25,11,0],[3.5,4.2,3.5]);wing.rotation.set(Math.PI/2,side*.7,side*.65);}
    }else if(zone.id==="featured"){
      for(let k=0;k<5;k++){const a=k/5*Math.PI*2;const ring5=keep(arch(root,Math.cos(a)*7,.6,Math.sin(a)*7,5,10));ring5.rotation.y=-a-Math.PI/2;districts.get(zone.id)!.arches.push(archRecord(ring5,5,10));}
    }else if(zone.id==="live-feed"){
      for(let k=0;k<6;k++){const a=k*.72;keep(mesh(root,cylinder,ivory,[Math.cos(a)*8,1+k*.22,Math.sin(a)*6],[1.5,.3,1.5]));}
    }else if(zone.id==="practice"||zone.id==="promise"){
      for(const s of [-1,1])keep(mesh(root,geometry(new T.BoxGeometry(4.2,.32,1.15)),ivory,[s*5,1.45,1]));
    }
  }

  // Arrival forms share the existing director phases and complete reading interval.
  const entry = new T.Group(); entry.name="Design study arrival stage";entry.position.set(4.138,.6,19.104);scene.add(entry);
  mesh(entry,geometry(studyTerrace(10.8,11,.65)),ivory);ring(entry,10.2,.35,.03);ring(entry,9.9,.36,.009);
  // Each study is an independent stage on the entry platform, built from the shared
  // registrars so dispose() still covers every geometry, material and texture.
  const lotusShape=petalGeometry(40,24);
  // The kit rides along for the arrival lane (K2), which adds `kit` to StageContext itself.
  const stageContext:StageContext&{kit?:WorldKit}={geometry,material,texture,instance,gold,ivory,farPetal,pollen,lotusShape,time,seededRandom,kit};
  const stages={bloom:bloomStage(stageContext),ribbon:ribbonStage(stageContext),constellation:constellationStage(stageContext)} as const;
  const stageStyles=["bloom","ribbon","constellation"] as const;
  for(const key of stageStyles){stages[key].group.visible=false;entry.add(stages[key].group);}
  const stageEffects={sparkles:true,trails:true};

  // A few quiet, miniature figures provide scale without covering the scenery with labels.
  //
  // Section 8: one skin, one hair, one dress per colour and one body lathe, shared by every
  // figure instead of rebuilt per figure. The static batcher groups by material identity, so
  // sharing collapses each district's six little merged meshes into four, and the six
  // identical lathes and twelve identical capsules are built once.
  const figureSkin = material(new T.MeshStandardMaterial({color:"#deb995",roughness:.8}));
  const figureHair = material(new T.MeshStandardMaterial({color:"#594339",roughness:.9}));
  const figureDresses = new Map<string, T.MeshStandardMaterial>();
  const figureBody = geometry(new T.LatheGeometry(new T.SplineCurve([new T.Vector2(.35,0),new T.Vector2(.37,.05),new T.Vector2(.29,.4),new T.Vector2(.23,.76),new T.Vector2(.25,.92),new T.Vector2(.12,1.02)]).getPoints(22),32));
  const figureArm = geometry(new T.CapsuleGeometry(.087,.44,5,12));
  figureSkin.name="figure skin";figureHair.name="figure hair";
  function figure(parent:T.Object3D,x:number,z:number,color:string){
    const root=new T.Group();root.position.set(x,.72,z);parent.add(root);
    let dress=figureDresses.get(color);
    if(!dress){dress=material(new T.MeshStandardMaterial({color,roughness:.8}));dress.name=`figure dress ${color}`;figureDresses.set(color,dress);}
    mesh(root,figureBody,dress,[0,.35,0]);mesh(root,bead,figureSkin,[0,1.65,0],[.33,.35,.32]);mesh(root,bead,figureHair,[0,1.8,-.035],[.34,.24,.32]);
    for(const side of [-1,1]){const arm=mesh(root,figureArm,dress,[side*.29,1.00,.03]);arm.rotation.z=side*.20;mesh(root,bead,figureSkin,[side*.35,.71,.03],[.09,.1,.09]);}
    for(const s of [-1,1]){mesh(root,cylinder,figureSkin,[s*.17,.28,0],[.085,.42,.085]);mesh(root,bead,figureHair,[s*.17,.065,.08],[.11,.07,.19]);}contact(parent,x,z,1.5,.85);
    return root;
  }
  for(const id of ["garden","heart","expressions"] as const){const root=districtRoots.get(id)!,figures=districts.get(id)!.figures;figures.push(figure(root,-5,8,"#d788a9"));figures.push(figure(root,-3.8,8.5,"#a79ac9"));}

  // Soft glowing dots that breathe, in place of the old solid firefly cubes.
  const sparkleCount=140,sparklePlaces=new Float32Array(sparkleCount*3),sparklePhase=new Float32Array(sparkleCount);
  const rand=seededRandom(455);
  for(let i=0;i<sparkleCount;i++){
    sparklePlaces[i*3]=(rand()-.5)*125;sparklePlaces[i*3+1]=2+rand()*18;sparklePlaces[i*3+2]=(rand()-.5)*115-15;sparklePhase[i]=rand();
  }
  const sparkleGeometry=geometry(new T.BufferGeometry());
  sparkleGeometry.setAttribute("position",new T.BufferAttribute(sparklePlaces,3));
  sparkleGeometry.setAttribute("phase",new T.BufferAttribute(sparklePhase,1));
  const sparkleDot=texture(softDot(64));
  const sparkleField=new T.Points(sparkleGeometry,material(sparklePoints(time,.55,"#fff0cf",.9,sparkleDot)));
  sparkleField.name="Study sparkles";sparkleField.frustumCulled=false;scene.add(sparkleField);

  // Section 7, heart glory. A wide soft halo that lives on the glow layer alone, so it never
  // appears in the main image and only reaches the eye as bloom behind the sculpted heart,
  // and twelve sparkles on two tilted rings around it.
  //
  // Corrected down from the design's local scale 5.2 at opacity .30 after the checkpoint
  // captures. The design did not account for heartRoot's own 3.25 scale, so 5.2 became a 17
  // unit sprite around a 5.3 unit heart and lifted the Sanctuary average luminance by 3.3,
  // past the 1.5 the radiance pass is allowed. 3.2 local is 10.4 units, about twice the heart.
  const heartHalo = new T.Sprite(material(new T.SpriteMaterial({
    map: sparkleDot, color: "#ffb3c6", transparent: true, opacity: .12,
    blending: T.AdditiveBlending, depthWrite: false, depthTest: true, fog: false,
  })));
  heartHalo.name = "Study heart halo";
  heartHalo.position.set(0, 0, -.3);
  heartHalo.scale.set(3.2, 3.2, 1);
  heartHalo.layers.set(1);
  heartRoot.add(heartHalo);
  const heartSparkleCount = 12;
  const heartSparklePlaces = new Float32Array(heartSparkleCount * 3);
  const heartSparklePhase = new Float32Array(heartSparkleCount);
  for (let i = 0; i < heartSparkleCount; i++) heartSparklePhase[i] = i / heartSparkleCount;
  const heartSparkleGeometry = geometry(new T.BufferGeometry());
  heartSparkleGeometry.setAttribute("position", new T.BufferAttribute(heartSparklePlaces, 3));
  heartSparkleGeometry.setAttribute("phase", new T.BufferAttribute(heartSparklePhase, 1));
  const heartSparkles = new T.Points(heartSparkleGeometry, material(sparklePoints(time, .42, "#fff0d8", .6, sparkleDot)));
  heartSparkles.name = "Study heart sparkles"; heartSparkles.frustumCulled = false;
  heartSparkles.layers.enable(1); sanctuary.add(heartSparkles);
  motions.push(t => {
    // The heart's own five second breath, shared by its emissive, its glow branch and its halo.
    STUDY_HEART_PULSE.value = .5 + .5 * Math.sin(t * 1.2566);
    rose.emissiveIntensity = .05 + .13 * STUDY_HEART_PULSE.value;
    gold.emissiveIntensity = .12 + .06 * (.5 + .5 * Math.sin(t * .31));
    for (let i = 0; i < heartSparkleCount; i++) {
      const lane = i % 2, radius = lane ? 6.6 : 5.4, tilt = lane ? .42 : -.3;
      const a = t * (lane ? -.14 : .18) + (i / heartSparkleCount) * Math.PI * 2;
      heartSparklePlaces[i * 3] = Math.cos(a) * radius;
      heartSparklePlaces[i * 3 + 1] = 8.7 + Math.sin(a) * radius * Math.sin(tilt) + Math.sin(t * .6 + i) * .8;
      heartSparklePlaces[i * 3 + 2] = Math.sin(a) * radius * Math.cos(tilt);
    }
    heartSparkleGeometry.getAttribute("position").needsUpdate = true;
  });

  // Plan 26: the 3D Studio kit dresses the world here, once every procedural piece exists and
  // before the falls merge and the static batch, so kit pieces merge by material identity like
  // the rest. Only with a kit: under `?kit=off`, or when the kit failed, nothing below runs and
  // the world is exactly the procedural study.
  const kitHandles: KitBuilderHandle[] = [];
  if (kit) {
    const kitContext: DesignKitContext = {
      kit, scene, time, geometry, material, texture, instance, stamp, finish, mesh, ring, tube, arch, contact,
      waterfall: (parent, x, z, height, width, rotation) => { waterfall(parent, x, z, height, width, rotation); },
      removeFall: plane => {
        const at = falls.indexOf(plane);
        if (at < 0) return;
        falls.splice(at, 1); plane.removeFromParent(); plane.geometry.dispose();
        districts.forEach(district => {
          for (const list of [district.falls, district.landmark]) { const own = list.indexOf(plane); if (own >= 0) list.splice(own, 1); }
        });
      },
      motion: fn => { motions.push(fn); },
      palette: { ivory, edge, gold, rose, roseGold, leaf, lawn, stone, bloom, water, silk: silkMat, cotton, shadow, fall },
      districts, archCrowns, bridges, entry, landmarks,
      grove: { root: grove, sites: groveSites },
      sanctuary: { root: sanctuary, arcade, arches: arcadeArches, heart: heartRoot },
      sparkleDot, farPetal,
    };
    const districtHandle = applyKitDistricts(kitContext);
    if (districtHandle) kitHandles.push(districtHandle);
    // Neighbors stand in for the miniature figures; the engine reports it so the host can
    // switch its accessible sentence from the figures to the dialogue.
    const neighbors: KitNeighbors | undefined = createKitNeighbors(kitContext);
    if (neighbors) { kitHandles.push(neighbors); scene.userData.studyNeighbors = true; }
    const corridorHandle = applyKitCorridors(kitContext);
    if (corridorHandle) kitHandles.push(corridorHandle);
    // PLAN-01 Section 5 step 3: the TV page's denser foreground, the Garden first.
    if (studyTvPage()) {
      const tvHandle = applyTvForeground(kitContext);
      if (tvHandle) kitHandles.push(tvHandle);
    }
  }
  // The TV page's pearl white stone, gold and pastel blossom, on the shared materials.
  if (studyTvPage()) applyTvPalette({ ivory, edge, gold, rose, roseGold, leaf, lawn, stone, bloom, water, silk: silkMat, cotton, shadow, fall });

  // Section 7: the 31 waterfall planes become one mesh. Their world transforms are baked in,
  // and the shader reads only uv, so nothing moves. The material writes no depth, so losing
  // the per plane sort order cannot change what is in front of what.
  scene.updateMatrixWorld(true);
  const fallParts = falls.map(o => { const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); return g; });
  const mergedFalls = mergeGeometries(fallParts, false);
  fallParts.forEach(g => g.dispose());
  // Same guard: the 31 planes leave their own geometries registered if the merge ever fails.
  if (!mergedFalls) falls.forEach(o => geometry(o.geometry));
  if (mergedFalls) {
    falls.forEach(o => { o.removeFromParent(); o.geometry.dispose(); });
    falls.length = 0;
    const sheet = mesh(scene, geometry(mergedFalls), fall);
    sheet.name = "Study waterfalls";
    falls.push(sheet);
  }

  // The landmarks opt out of shadow casting: the sun shadow box covers the connected world only.
  motions.forEach(fn=>fn(0));districtRoots.forEach(root=>batch(root));batch(entry);batch(landmarks,false);

  // Section 6 layer membership, resolved after batching so the merged meshes are the ones flagged.
  // Layer 1 is the glow layer. Only the breaking crest of a fall reaches it, through the shader
  // branch above. Layer 2 is the god ray occluder set: the carved rock, the ivory architecture,
  // the bridge decks and the entry terrace, all of them by material identity. The cotton crowns
  // stay out of it on purpose, so the rays sift through the canopies instead of being blocked.
  falls.forEach(o => o.layers.enable(1));
  // The carved rock and the ivory architecture already give each district its silhouette, so the
  // thin edge bands are left out: they cost a merged draw per district and change no shaft.
  //
  // Section 7 adds the gold to the glow layer on the same sweep, by material identity, so the
  // merged gold of each district lights up along the rails and the arches. Instanced meshes are
  // skipped as before, which leaves the flower cores out of the glow: they are a fraction of a
  // pixel each and would cost an instanced draw in the glow pass for nothing.
  const rayOccluders = new Set<T.Material>([ivory, stone]);
  scene.traverse(object => {
    if (!(object instanceof T.Mesh) || object instanceof T.InstancedMesh) return;
    const m = object.material;
    if (Array.isArray(m)) return;
    if (rayOccluders.has(m)) object.layers.enable(2);
    if (m === gold) object.layers.enable(1);
  });

  // Section 7, lanterns: one steady warm light every sixth sample along every bridge rail and
  // one at every arch keystone in the connected world, all in a single Points draw. They are
  // not sparkle class and not trail class, because a lantern is a lamp, not an effect.
  const keystone = new T.Vector3();
  const lanternKeystones: LanternPoint[] = archCrowns.map(({ root, height }) => {
    keystone.set(0, height, 0).applyMatrix4(root.matrixWorld);
    return [keystone.x, keystone.y, keystone.z] as LanternPoint;
  });
  const lanternGeometry = geometry(new T.BufferGeometry());
  lanternGeometry.setAttribute("position", new T.BufferAttribute(lanternLayout(railSamples, lanternKeystones), 3));
  // Opacity corrected down from the design's .9 after the checkpoint captures: about 285 of
  // them are additive and on the glow layer, so as a set they are a broad lift, not a point.
  // A second round took it to .58: the Sanctuary frame has the arcade keystones and several
  // converging bridges in it at once, which is the densest lantern view in the world.
  const lanterns = new T.Points(lanternGeometry, material(new T.PointsMaterial({
    size: .55, sizeAttenuation: true, map: sparkleDot, color: new T.Color("#ffd9a0"),
    transparent: true, opacity: .58, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false,
  })));
  lanterns.name = "Study lanterns"; lanterns.frustumCulled = false;
  lanterns.layers.enable(1); scene.add(lanterns);

  // Living air. Four objects, one draw call each, all seeded.
  const air = createStudyAir(scene, { geometry, material, farPetal, dot: sparkleDot, time }, [...ZONES.map(zone => zone.center), ...corridorSites.map(site => site.center)]);
  return {
    scene, anchors: WORLD_EXPRESSIONS.map((_,i)=>new T.Vector3(14+Math.cos(i)*10,5,-45+Math.sin(i)*10)), recognitionPearls: [],
    setRecognitions() { /* The unchanged world-space recognition manager owns all records. */ },
    setEffects(s, t) { sparkles=s;trails=t;air.setEffects(s,t);kitHandles.forEach(handle=>handle.setEffects?.(s,t)); },
    update(t,_zone,arrival){
      time.value=t;motions.forEach(fn=>fn(t));clouds.update(t);ribbons.forEach(o=>{o.visible=trails;});sparkleField.visible=sparkles;sparkleField.rotation.y=Math.sin(t*.016)*.04;
      heartSparkles.visible=sparkles;
      // The engine resolves the picture quality tier and publishes it on the scene in resize().
      // Low drops the sky cloud ring, which is pure overdraw near the horizon, and halves the sparkles.
      const lowTier=scene.userData.lowTier===true;
      // Section 8, haze during travel: the engine publishes a smoothed 0 to 1 travel amount,
      // and the low sun swells a little inside the thicker air. Parked it is 0 and the two
      // sprites are exactly their authored size, so a still capture is unchanged.
      const travel=typeof scene.userData.studyTravel==="number"?scene.userData.studyTravel:0;
      const swell=1+.12*travel;
      halo.sprites.forEach((sprite,i)=>sprite.scale.set(haloScale[i]*swell,haloScale[i]*swell,1));
      // The engine publishes its camera on the scene under the study gate, so the motes can
      // wrap around the viewer without changing the shared WorldScene update signature.
      const viewer=scene.userData.studyCamera as T.Camera|undefined;
      // The sun in view space. StudyRadiance refreshes this too, but the water glitter and the
      // pearl's sun side rim are ordinary main pass shading, so they must also be right when
      // the radiance pass is absent: on Low, and under ?radiance=off, which is what the text
      // parity comparison captures. Refreshing it here keeps that A/B honest.
      if(viewer)STUDY_SUN_VIEW.value.set(...STUDY_SUN.direction).transformDirection(viewer.matrixWorldInverse);
      if(viewer)air.update(t,viewer,lowTier,scene.userData.studyFocus as AirFocus);
      clouds.meshes[0].visible=!lowTier;
      sparkleGeometry.setDrawRange(0,lowTier?Math.floor(sparkleCount/2):sparkleCount);
      const pose=arrivalPose(arrival);
      scene.userData.studyArrivalPose=pose;
      const style=studyArrival(scene.userData.studyArrival);
      stageEffects.sparkles=sparkles;stageEffects.trails=trails;
      for(const key of stageStyles){
        const visible=pose.active&&style===key;
        stages[key].group.visible=visible;
        if(visible)stages[key].update(pose,t,stageEffects);
      }
      for(const handle of kitHandles)handle.update?.(t,_zone,arrival);
    },
    dispose(){disposed=true;kitHandles.forEach(handle=>handle.dispose?.());air.dispose();instances.forEach(o=>o.dispose());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());sun.shadow.map?.dispose();shadowCanvas.width=shadowCanvas.height=1;scene.clear();},
  };
}
