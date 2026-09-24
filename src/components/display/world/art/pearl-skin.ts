import * as T from "three";
import { WORLD_EXPRESSIONS, seededRandom } from "../world-data";
import { sparklePoints, studyGlass, studyGlow } from "./study-materials";
import { type StudyPearlFrame, StudyPearlAssets } from "./pearl-face";
import {
  type StudyPearlKitSource, type StudyPearlTwinkle, SHIMMER_BEAD_COUNT, PEARL_STAR_COUNT,
  PEARL_BEAD_RADIUS, type PearlMedallion, pearlHaloFragment, type StudyPearlSkinOptions,
  type PearlKitDressing,
} from "./pearl-skin-measures";
import { dressPearlSkin, placePearlKitMedallions, placePearlKitStars } from "./pearl-skin-dress";
import { updatePearlSkin } from "./pearl-skin-frame";

export { StudyPearlAssets, STUDY_CAPTION_SIZE, paintStudyPearl } from "./pearl-face";
export type { StudyPearlFrame } from "./pearl-face";
export {
  PEARL_KIT_PEARL, PEARL_KIT_ORBIT, PEARL_KIT_SPARKLE, PEARL_KIT_MEDALLIONS, PEARL_SHELL_RADIUS,
  MEDALLION_ORB_RADIUS, PEARL_RIM_BEAD_STRIDE, PEARL_WIRE_RADIUS, PEARL_FILM_INNER,
  PEARL_FILM_OUTER, PEARL_FILM_ALPHA, MEDALLION_VEIL_OPACITY, PEARL_STAR_AIR, PEARL_HALO_TV_FADE,
  pearlHaloFragment,
} from "./pearl-skin-measures";
export type {
  StudyPearlKit, StudyPearlKitSource, StudyPearlTwinkle, StudyPearlKitParts,
  StudyPearlSkinOptions,
} from "./pearl-skin-measures";
export { buildPearlKitParts } from "./pearl-kit-parts";

/**
 * No recognition strings are retained here. The existing slot owns every personal pixel.
 *
 * Its longer methods live in pearl-skin-dress.ts and pearl-skin-frame.ts and run with the skin
 * as `this`, so the members they read carry no `private` modifier.
 */
export class StudyPearlSkin {
  readonly root = new T.Group();
  private readonly geometries = new Set<T.BufferGeometry>();
  private readonly materials = new Set<T.Material>();
  readonly orbits = new T.Group();
  /**
   * `tint` is the canonical colour the kit's back bowl takes; `procedural` lists the pieces
   * the kit replaces (tint disc, glass ball, rim torus), taken out once the kit dresses the skin.
   */
  readonly medallions: PearlMedallion[] = [];
  readonly clock = { value: 0 };
  /** Two draws: the pearl beads, then the gold ones. */
  readonly orbitBeads: T.InstancedMesh[] = [];
  /** Which of the ten authored bead ordinals each instance stands in for. */
  readonly orbitBeadIndices: number[][] = [];
  readonly beadDummy = new T.Object3D();
  readonly orbitAxis = new T.Vector3(0, 0, 1);
  readonly rings: T.Mesh[] = [];
  readonly shell: T.Mesh;
  readonly finish: T.Mesh;
  readonly halo: T.Mesh;
  readonly sparkles: T.Points;
  readonly occluder: T.Mesh;
  readonly shimmer: T.Points;
  readonly shimmerPlaces = new Float32Array(SHIMMER_BEAD_COUNT * 3);
  readonly shimmerScratch = new T.Vector3();
  /** The two procedural orbit tubes, which the kit wire replaces. */
  readonly orbitTubes: T.Mesh[] = [];
  /** The medallion rim recipe: the orbit tubes, the beads, the medallion rims and every kit gold. */
  readonly gold: T.Material;
  private readonly medallionGlass: T.Material;
  /** The travelling pearl beads' white pearl; the rim band's pearls wear it too. */
  readonly beadPearl: T.Material;
  readonly assets: StudyPearlAssets;
  readonly kitSource?: StudyPearlKitSource;
  kitResolved = false;
  dressing?: PearlKitDressing;
  /** Per star: radius in slot units, twinkle phase in seconds, and a resting roll. Seeded per pearl. */
  readonly starSizes: number[] = [];
  readonly starPhases: number[] = [];
  readonly starRolls: T.Quaternion[] = [];
  readonly placeScratch = new T.Vector3();
  readonly turnScratch = new T.Quaternion();
  readonly sizeScratch = new T.Vector3();
  readonly matrixScratch = new T.Matrix4();
  readonly noTurn = new T.Quaternion();
  /** Instance scale of the pearl beads and of the gold beads on the unit bead sphere (.024). */
  beadScales: [number, number] = [.9, 1.22];
  /** The TV page, from the host (`StudyPearlSkinOptions`); false keeps every piece the study's. */
  private readonly tv: boolean;

  /**
   * `kitSource` is read once, on the first update, and only by the design study host. Without
   * it, or when it yields no kit, the skin is exactly the procedural one. `options.tv` is the
   * TV page, which the recognition host resolves once; without it the skin is the study's.
   */
  constructor(parent: T.Group, assets: StudyPearlAssets, seed: number, kitSource?: StudyPearlKitSource, options: StudyPearlSkinOptions = {}) {
    this.assets = assets;
    this.kitSource = kitSource;
    this.tv = options.tv === true;
    this.root.name = "Design study pearl glass, halo and exterior canonical symbols";
    parent.add(this.root);
    this.root.add(this.orbits);
    this.orbits.name = "pearl orbits";
    // The halo sits behind the depth writing face, so only the glow outside the disc reaches the eye.
    this.halo = new T.Mesh(this.geometry(new T.PlaneGeometry(3.6, 3.6)), this.material(new T.ShaderMaterial({
      transparent: true, depthTest: true, depthWrite: false, toneMapped: false, blending: T.AdditiveBlending,
      uniforms: { time: this.clock },
      vertexShader: "varying vec2 haloUv;void main(){haloUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: pearlHaloFragment(this.tv),
    })));
    this.halo.name = "pearl halo"; this.halo.position.z = -.4; this.halo.renderOrder = 2;
    this.halo.layers.enable(1); this.root.add(this.halo);
    // The guard that makes the radiance pass safe for the words.
    //
    // It is never on layer 0, so it is invisible in the main image. On layer 1 it writes depth
    // at the disc's own plane, which clips the halo, the back of the glass shell and anything
    // else behind it out of the glow. `update` adds it to layer 3 for the protect pass, and the
    // radiance composite multiplies by (1 - protect), so no glow and no god ray light can land
    // on a single pixel of the pearl face being read. `?radiance=off` proves it pixel for pixel.
    //
    // Layer 3 is granted only while this pearl is the one being read. The protect pass renders
    // layer 3 alone, so nothing else in the world writes depth into it: a resident bubble
    // standing behind the sculpted heart would otherwise paint its disc straight through the
    // heart and cut a blotch out of the glow there.
    //
    // .985 rather than 1: the edge then lands just inside the pearl's own rim ring, so the mask
    // ends under the rim instead of on the scenery beside it.
    this.occluder = new T.Mesh(
      this.geometry(new T.CircleGeometry(.985, 64)),
      this.material(new T.MeshBasicMaterial({ color: 0x000000, fog: false, toneMapped: false })),
    );
    this.occluder.name = "pearl occluder";
    this.occluder.renderOrder = 1;
    this.occluder.layers.set(1);
    this.root.add(this.occluder);
    // A real sphere, so the pearl reads the same under every billboard rotation and the text never turns.
    // Rim only: `pearlRim` is already in scope from studyGlass's own patch, and it is near zero
    // across the middle of the sphere, so the glow layer receives the lit edge and nothing else.
    this.shell = new T.Mesh(this.geometry(new T.SphereGeometry(1.02, 48, 24)), this.material(
      studyGlow(studyGlass(.16), "pearl", "vec3(1., .93, .86) * pearlRim * 1.15", "pearlRim * .9"),
    ));
    this.shell.name = "pearl glass"; this.shell.scale.z = .84; this.shell.position.z = 0; this.shell.renderOrder = 3;
    this.shell.layers.enable(1);
    this.root.add(this.shell);
    const finishing = this.material(new T.ShaderMaterial({
      transparent: true, depthTest: true, depthWrite: false, toneMapped: false,
      uniforms: { time: this.clock },
      vertexShader: "varying vec2 pearlUv;void main(){pearlUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: `varying vec2 pearlUv;uniform float time;
        float pearlHash(vec2 q){return fract(sin(dot(q,vec2(127.1,311.7)))*43758.5453);}
        float pearlNoise(vec2 q){vec2 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);
          return mix(mix(pearlHash(i),pearlHash(i+vec2(1.,0.)),f.x),mix(pearlHash(i+vec2(0.,1.)),pearlHash(i+1.),f.x),f.y);}
        void main(){vec2 p=(pearlUv-.5)*2.18;float r=length(p),a=atan(p.y,p.x);
          float rim=exp(-pow((r-.998)*170.,2.));float inner=exp(-pow((r-.968)*190.,2.));
          float arc=pow(max(0.,cos(a-2.1+sin(time*.12)*.08)),10.);
          float reflection=exp(-pow((r-.923)*38.,2.))*arc;
          float lower=exp(-pow((r-.979)*90.,2.))*pow(max(0.,cos(a+1.1)),6.);
          vec3 prismatic=.73+.27*cos(vec3(0.,2.1,4.2)+a*2.5+time*.075);
          vec3 c=mix(prismatic,vec3(1.,.96,.82),.45);
          float sparkle=0.;for(int i=0;i<12;i++){float k=float(i);float theta=k*2.399+sin(k)*.12;
            vec2 q=p-vec2(cos(theta),sin(theta))*(1.013+sin(k*2.)*.012);
            float pulse=.3+.7*pow(.5+.5*sin(time*.7+k*3.),3.);
            sparkle+=pulse*(exp(-length(q)*220.)+exp(-abs(q.x)*1200.-abs(q.y)*100.)*.6+exp(-abs(q.y)*1200.-abs(q.x)*100.)*.6);}
          // Section 7: a slow light play inside the glass, turning about a degree a second.
          // It is gated to the outer annulus, r .84 to .96. The outermost text pixel sits at
          // r .81, so no part of the wording is ever touched, and the gate caps the added
          // alpha at .07 in a pale warm white. The gate and the colour are the whole of the
          // change: nothing here is conditional on the radiance pass, so the words are
          // identical with and without it.
          float causticTurn=time*.05;
          vec2 causticP=mat2(cos(causticTurn),-sin(causticTurn),sin(causticTurn),cos(causticTurn))*p*5.5;
          float caustic=pearlNoise(causticP+time*.07)*pearlNoise(causticP*1.7-time*.05)*2.1;
          caustic=pow(clamp(caustic,0.,1.),2.)*smoothstep(.84,.90,r)*(1.-smoothstep(.96,1.,r));
          float alpha=clamp(rim*.92+inner*.32+reflection*.52+lower*.7+sparkle+caustic*.07,0.,1.);
          vec3 finalColor=mix(c,vec3(1.,.985,.93),clamp(reflection+sparkle,0.,1.));
          finalColor=mix(finalColor,vec3(1.,.973,.902),clamp(caustic,0.,1.)*.6);
          // A soft pink, lavender and blue wash inside the glass. The centre, r below .36, is left
          // untouched so the approved wording keeps its contrast.
          float washA=smoothstep(.36,.99,r)*.16;
          vec3 washCol=mix(mix(vec3(.97,.78,.87),vec3(.85,.80,.96),smoothstep(-.6,.6,p.y)),vec3(.81,.88,.97),smoothstep(.1,.9,p.x)*.6);
          gl_FragColor=vec4((washCol*washA+finalColor*alpha)/max(.001,washA+alpha),clamp(washA+alpha,0.,1.));
          #include <colorspace_fragment>
        }`,
    }));
    this.finish = new T.Mesh(this.geometry(new T.PlaneGeometry(2.18, 2.18)), finishing);
    this.finish.name = "pearl finishing"; this.finish.position.z = .065; this.finish.renderOrder = 4;
    this.root.add(this.finish);
    for (let i = 0; i < 3; i++) {
      const ring = new T.Mesh(this.geometry(new T.TorusGeometry(1.005 + i * .016, i ? .0025 : .006, 6, 128)), this.material(new T.MeshBasicMaterial({ color: ["#e8c78e", "#d6b483", "#e2afca"][i], transparent: true, opacity: i ? .48 : .78, depthWrite: false })));
      ring.name = `pearl ring ${i}`;
      ring.position.z = .045; this.root.add(ring); this.rings.push(ring);
    }
    // The orbit tubes and beads share this material but stay off layer 1, so only the
    // medallion rims carry it into the glow.
    const gold = this.gold = this.material(studyGlow(
      new T.MeshStandardMaterial({ color: "#dfbd79", metalness: .8, roughness: .22, transparent: true, opacity: .83, depthWrite: false }),
      "medallion-rim", "vec3(1., .84, .58) * .95",
    ));
    for (let i = 0; i < 2; i++) {
      const points = Array.from({ length: 129 }, (_, j) => { const a=j/128*Math.PI*2;return new T.Vector3(Math.cos(a)*(1.37+i*.11),Math.sin(a)*(1.26+i*.055),Math.sin(a*2+i)*.12-.08); });
      const orbit = new T.Mesh(this.geometry(new T.TubeGeometry(new T.CatmullRomCurve3(points), 128, .0027, 4, false)), gold);
      orbit.rotation.z = i ? -.46 : .38; this.orbits.add(orbit); this.orbitTubes.push(orbit);
    }
    const beadGeometry = this.geometry(new T.SphereGeometry(PEARL_BEAD_RADIUS, 20, 12));
    const beadPearl = this.beadPearl = this.material(new T.MeshPhysicalMaterial({ color: "#fff0dc", roughness: .2, metalness: .18, clearcoat: 1, clearcoatRoughness: .15, iridescence: .35, iridescenceIOR: 1.3 }));
    // Section 8: the ten beads travelling the two gold orbits become two instanced draws,
    // one for the six pearl beads and one for the four gold ones, in place of ten meshes.
    // Each instance keeps the ordinal it stands in for, so its lane, phase and size are
    // exactly the ones that bead had as a mesh of its own.
    const pearlBeads: number[] = [], goldBeads: number[] = [];
    for (let i = 0; i < 10; i++) (i % 3 ? pearlBeads : goldBeads).push(i);
    this.orbitBeadIndices.push(pearlBeads, goldBeads);
    [beadPearl, gold].forEach((beadMaterial, group) => {
      const beads = new T.InstancedMesh(beadGeometry, beadMaterial, this.orbitBeadIndices[group].length);
      beads.name = group ? "pearl orbit gold beads" : "pearl orbit pearl beads";
      beads.frustumCulled = false;
      this.orbits.add(beads); this.orbitBeads.push(beads);
    });
    // Warm dust inside the glass and a looser drift around it. Seeded, so every pearl is stable.
    const random = seededRandom(1201 + seed);
    const positions = new Float32Array(56 * 3), phases = new Float32Array(56);
    for (let i = 0; i < 56; i++) {
      const inside = i < 36, u = random(), angle = random() * Math.PI * 2, lift = random();
      const r = inside ? .2 + .72 * Math.sqrt(u) : 1.08 + .42 * u;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = Math.sin(angle) * r;
      positions[i * 3 + 2] = inside ? .06 + lift * .5 * Math.sqrt(Math.max(0, 1 - r * r)) : -.1 + lift * .35;
      phases[i] = random();
    }
    const dust = this.geometry(new T.BufferGeometry());
    dust.setAttribute("position", new T.BufferAttribute(positions, 3));
    dust.setAttribute("phase", new T.BufferAttribute(phases, 1));
    this.sparkles = new T.Points(dust, this.material(sparklePoints(this.clock, .13, "#fff2d8", 1, assets.dot())));
    this.sparkles.name = "pearl sparkles"; this.sparkles.renderOrder = 5; this.sparkles.frustumCulled = false;
    this.sparkles.layers.enable(1);
    this.root.add(this.sparkles);
    // One bright bead travelling the outer gold ring, with four points trailing it. The
    // places are rewritten each frame from the shared clock, so a still frame is complete.
    const shimmer = this.geometry(new T.BufferGeometry());
    const shimmerPhase = new Float32Array(SHIMMER_BEAD_COUNT);
    for (let i = 0; i < SHIMMER_BEAD_COUNT; i++) shimmerPhase[i] = i / SHIMMER_BEAD_COUNT;
    shimmer.setAttribute("position", new T.BufferAttribute(this.shimmerPlaces, 3));
    shimmer.setAttribute("phase", new T.BufferAttribute(shimmerPhase, 1));
    this.shimmer = new T.Points(shimmer, this.material(sparklePoints(this.clock, .10, "#fff1c8", .95, assets.dot())));
    this.shimmer.name = "pearl bead"; this.shimmer.renderOrder = 5; this.shimmer.frustumCulled = false;
    this.shimmer.layers.enable(1);
    this.root.add(this.shimmer);
    // Every canonical symbol sits inside its own little glass sphere over a tinted disc.
    const tintDisc = this.geometry(new T.CircleGeometry(.178, 40));
    const iconDisc = this.geometry(new T.CircleGeometry(.148));
    const medallionGlass = this.geometry(new T.SphereGeometry(.196, 40, 24));
    const medallionRim = this.geometry(new T.TorusGeometry(.205, .0042, 6, 56));
    const glass = this.medallionGlass = this.material(studyGlow(studyGlass(.24), "medallion", "vec3(1., .93, .86) * pearlRim * 1.15", "pearlRim * .9"));
    for (const expression of WORLD_EXPRESSIONS) {
      const root = new T.Group(); root.visible = false; root.name = `pearl medallion ${expression.id}`;
      const tintColor = new T.Color(expression.color).lerp(new T.Color("#fff8ef"), .55);
      const tint = new T.Mesh(tintDisc, this.material(new T.MeshBasicMaterial({ color: tintColor, toneMapped: false, transparent: true, opacity: .96, depthWrite: false })));
      tint.position.z = -.02; tint.renderOrder = 3; root.add(tint);
      const map = assets.icon(expression.id);
      const icon = new T.Mesh(iconDisc, this.material(new T.MeshBasicMaterial({ map, transparent: true, depthTest: true, depthWrite: false, toneMapped: false })));
      icon.position.z = .05; icon.renderOrder = 4; root.add(icon);
      const ball = new T.Mesh(medallionGlass, glass); ball.renderOrder = 5; ball.layers.enable(1); root.add(ball);
      const rim = new T.Mesh(medallionRim, gold); rim.layers.enable(1); root.add(rim);
      // An occasional catch of light off the medallion's own glass, on the upper right of the
      // little sphere. Its opacity is driven from the shared clock in update(), so it sits
      // still in a still frame, and it is sparkle class: the owner's switch hides it.
      const glint = new T.Sprite(this.material(new T.SpriteMaterial({
        map: assets.dot(), color: "#fffaf0", transparent: true, opacity: 0,
        blending: T.AdditiveBlending, depthWrite: false, depthTest: true, fog: false, toneMapped: false,
      })));
      glint.name = `pearl glint ${expression.id}`;
      glint.position.set(.07, .09, .12);
      glint.scale.set(.16, .16, 1);
      glint.renderOrder = 6;
      glint.layers.enable(1);
      root.add(glint);
      this.root.add(root); this.medallions.push({ id: expression.id, root, glint, tint: tintColor, procedural: [tint, ball, rim] });
    }
    // The kit stars' own seed, apart from the dust's, so the dust scatter is exactly as before.
    const starRandom = seededRandom(1301 + seed);
    for (let k = 0; k < PEARL_STAR_COUNT; k++) {
      this.starSizes.push(k ? .052 + starRandom() * .022 : .05);
      this.starPhases.push(starRandom() * 2);
      this.starRolls.push(new T.Quaternion().setFromAxisAngle(this.orbitAxis, (starRandom() - .5) * .7));
    }
  }
  /** In pearl-skin-dress.ts. */
  dress() { return dressPearlSkin.call(this); }
  geometry<G extends T.BufferGeometry>(g: G) { this.geometries.add(g); return g; }
  material<M extends T.Material>(m: M) { this.materials.add(m); return m; }
  /** Shows or hides the whole skin (the TV page hides it while its bubble rises, fades or floats away). */
  set visible(value: boolean) {
    this.root.visible = value;
  }
  /** In pearl-skin-frame.ts. */
  update(time: number, ids: readonly number[], detailed: boolean, frame: StudyPearlFrame) {
    return updatePearlSkin.call(this, time, ids, detailed, frame);
  }
  /** In pearl-skin-dress.ts. */
  placeKitMedallions(kit: NonNullable<PearlKitDressing["medallions"]>, shown: readonly PearlMedallion[]) {
    return placePearlKitMedallions.call(this, kit, shown);
  }
  /** In pearl-skin-dress.ts. */
  placeKitStars(stars: T.InstancedMesh, twinkle: StudyPearlTwinkle | undefined, time: number, shown: boolean, medallions: readonly PearlMedallion[], radiusX: number, radiusY: number, size: number) {
    return placePearlKitStars.call(this, stars, twinkle, time, shown, medallions, radiusX, radiusY, size);
  }
  clear() {
    this.medallions.forEach(item => { item.root.visible = false; });
    this.halo.visible = this.sparkles.visible = this.shimmer.visible = false;
    this.occluder.layers.disable(3);
    const kit = this.dressing?.medallions;
    if (kit) for (const mesh of [kit.backs, kit.orbs, kit.bezels]) { mesh.visible = false; mesh.count = 0; mesh.layers.disable(3); }
    if (this.dressing?.stars) this.dressing.stars.visible = false;
    for (const part of [this.dressing?.rim, this.dressing?.rimPearls]) part?.layers.disable(3);
  }
  /** Test seam: the exact layer mask of one named study object. */
  layerMask(name: string) {
    let mask: number | undefined;
    this.root.traverse(object => { if (object.name === name) mask = object.layers.mask; });
    return mask;
  }
  /** Test seam: the authored radius of one named circular study object. */
  radius(name: string) {
    let value: number | undefined;
    this.root.traverse(object => {
      const geometry = (object as T.Mesh).geometry as T.CircleGeometry | undefined;
      if (object.name === name && geometry?.parameters) value = geometry.parameters.radius;
    });
    return value;
  }
  dispose() {
    this.root.removeFromParent(); this.root.clear();
    // The two instanced beads own per instance buffers the geometry registrar cannot reach.
    this.orbitBeads.forEach(beads => beads.dispose());
    // So do the kit's instanced draws. Their geometry is shared by every skin and belongs to
    // the assets, which release it with the rest of the study.
    const kit = this.dressing;
    if (kit?.medallions) [kit.medallions.backs, kit.medallions.orbs, kit.medallions.bezels].forEach(mesh => mesh.dispose());
    kit?.stars?.dispose();
    this.dressing = undefined;
    this.geometries.forEach(g => g.dispose()); this.materials.forEach(m => m.dispose());
    this.geometries.clear(); this.materials.clear();
    this.medallions.length = 0; this.orbitBeads.length = 0; this.rings.length = 0;
    this.orbitBeadIndices.length = 0; this.orbitTubes.length = 0;
  }
}
