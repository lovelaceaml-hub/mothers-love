import * as T from "three";
import type { WorldKit } from "../../kit/kit-loader";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { studyArrival } from "../design-mode";
import { studyCottonMaterial } from "../study-canopy";
import { studyPetal } from "../study-geometry";
import { studyGlow, studyRim, studyStone, studyStoneCaustic } from "../study-materials";
import { STUDY_FOG, STUDY_TV_FOG } from "../study-palette";
import type { StudyGlowFog } from "../study-radiance";
import { studyTvPage } from "../tv-page";

/** The design world's base: the scene and its fog, the disposal registrars, the shared materials and geometry, the mesh and instance helpers and the static batcher. */
export function designWorldBase(kit?: WorldKit) {
  const scene = new T.Scene();
  scene.name = "Mother's Love, visual study 02";
  // The TV page (`?view=tv`), resolved once. Its clear air (Anthony, 2026-09-24: "Can you
  // remove the haze foggy look") is every `tv` branch below; without it the study is unchanged.
  const tv = studyTvPage();
  const sceneFog = tv ? STUDY_TV_FOG : STUDY_FOG;
  scene.background = new T.Color(sceneFog.color);
  scene.fog = new T.Fog(sceneFog.color, sceneFog.near, sceneFog.far);
  // The glow layer keeps the study's fog distances on the TV page (`StudyRadiance.render`), so
  // a far lantern or crest does not bloom brighter now that the main fog is thinner.
  if (tv) scene.userData.studyGlowFog = { near: STUDY_FOG.near, far: STUDY_FOG.far } satisfies StudyGlowFog;
  scene.userData.prototypeHeartReady = false;
  scene.userData.studyArrival = studyArrival(new URLSearchParams(window.location.search).get("entrance"));
  // The kit, for the pieces built outside this file (the pearl skin reads it from here).
  if (kit) scene.userData.studyKit = kit;
  const geometries = new Set<T.BufferGeometry>(), materials = new Set<T.Material>(), textures = new Set<T.Texture>();
  const instances = new Set<T.InstancedMesh>();
  const motions: Array<(time: number) => void> = [];
  const time = { value: 0 };
  const geometry = <G extends T.BufferGeometry>(g: G) => { geometries.add(g); return g; };
  const material = <M extends T.Material>(m: M) => { materials.add(m); return m; };
  const texture = <X extends T.Texture>(t: X) => { textures.add(t); return t; };
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
  return {
    scene, tv, sceneFog, geometries, materials, textures, instances, motions, time, geometry,
    material, texture, ivory, edge, gold, roseGold, rose, leaf, lawn, stone, bloom, cylinder,
    bead, pollen, petalGeometry, petal, midPetal, farPetal, cottonSphere, cotton, dummy, tint,
    mesh, tube, ring, instance, stamp, finish, batch,
  };
}

/** What every part of the design world receives. */
export type DesignWorldBase = ReturnType<typeof designWorldBase>;
