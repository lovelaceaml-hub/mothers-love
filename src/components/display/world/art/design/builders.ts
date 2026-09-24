import * as T from "three";
import { seededRandom } from "../../world-data";
import { studyCanopyPuffs } from "../study-canopy";
import { STUDY_GLOW_PASS } from "../study-materials";
import type { DesignKitArch, Crowns } from "../design-world-types";
import type { DesignWorldBase } from "./base";

/** The shared builders: contact shadows, flower beds, cotton trees, lantern arches, island keels and waterfalls. */
export function designBuilders({
  texture, material, geometry, mesh, instance, midPetal, bloom, pollen, gold, cylinder, leaf,
  stamp, finish, tube, roseGold, ivory, edge, time,
}: DesignWorldBase) {
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
  return {
    shadowCanvas, shadow, contact, flowers, tree, archCrowns, arch, islandShape, islandShapeFar,
    falls, fall, waterfall, archRecord,
  };
}

/** The shared builders every later part of the design world may use. */
export type DesignBuilders = ReturnType<typeof designBuilders>;
