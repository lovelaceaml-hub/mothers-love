import * as T from "three";
import type { Recognition } from "@/lib/contracts";
import { WORLD_EXPRESSIONS, seededRandom } from "../world-data";
import { softDot, sparklePoints, studyGlass, studyGlow } from "./study-materials";

type Wrap = (measure: (text: string) => number, text: string, width: number) => string[];

/** What the host slot knows about this pearl's place on screen for the current frame. */
export type StudyPearlFrame = {
  sparkles: boolean;
  portrait: boolean;
  orbitScale: number;
};

export class StudyPearlAssets {
  private readonly textures = new Map<number, T.Texture>();
  private sparkleDot?: T.DataTexture;
  private disposed = false;
  constructor(private readonly invalidate: () => void) {}
  icon(id: number) {
    const existing = this.textures.get(id);
    if (existing) return existing;
    const map = new T.TextureLoader().load(`/home-art/icon${id}.webp`, () => { if (!this.disposed) this.invalidate(); });
    map.colorSpace = T.SRGBColorSpace; this.textures.set(id, map); return map;
  }
  /** One soft dot shared by every sparkle in the study. Built from plain bytes, so no canvas. */
  dot() { return (this.sparkleDot ??= softDot(32)); }
  dispose() {
    this.disposed = true;
    this.textures.forEach(t => t.dispose()); this.textures.clear();
    this.sparkleDot?.dispose(); this.sparkleDot = undefined;
  }
}

/** Appearance study only. Pagination and reading age remain owned by the app. */
export function paintStudyPearl(
  canvas: HTMLCanvasElement,
  record: Recognition,
  message: string,
  page: number,
  pages: number,
  wrap: Wrap,
) {
  const c = canvas.getContext("2d")!;
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.save();
  c.scale(canvas.width / 1024, canvas.height / 1024);
  c.beginPath(); c.arc(512, 512, 502, 0, Math.PI * 2); c.clip();
  const ground = c.createRadialGradient(420, 310, 20, 510, 500, 540);
  ground.addColorStop(0, "#fffef5"); ground.addColorStop(.65, "#fffaf0");
  ground.addColorStop(.84, "#f6e1ec"); ground.addColorStop(.94, "#d1e5ef"); ground.addColorStop(1, "#f3d9b2");
  c.fillStyle = ground; c.fillRect(0, 0, 1024, 1024);
  const wash = c.createRadialGradient(185, 625, 5, 260, 575, 480);
  wash.addColorStop(0, "#f5bcd241"); wash.addColorStop(1, "#f5bcd200");
  c.fillStyle = wash; c.fillRect(0, 0, 1024, 1024);
  c.strokeStyle = "#e0cda199"; c.lineWidth = 1.7;
  c.beginPath(); c.arc(512, 512, 461, 0, Math.PI * 2); c.stroke();
  // Keep the approved text coordinates untouched. Fine engraved detail lives only in the outer annulus.
  c.save(); c.translate(512, 512);
  for (const side of [-1, 1]) {
    c.save(); c.scale(side, 1); c.strokeStyle = "#c7a66e80"; c.lineWidth = 1.1;
    for (let i = 0; i < 7; i++) {
      const a = -.43 + i * .14, r = 442;
      c.save(); c.translate(Math.cos(a) * r, Math.sin(a) * r); c.rotate(a);
      c.beginPath(); c.moveTo(0, -17); c.bezierCurveTo(17, -7, 17, 7, 0, 17); c.bezierCurveTo(-7, 5, -7, -5, 0, -17); c.stroke();
      c.beginPath(); c.moveTo(0, -12); c.lineTo(0, 12); c.stroke(); c.restore();
    }
    c.restore();
  }
  c.strokeStyle = "#fffef6bb"; c.lineWidth = 3;
  c.beginPath(); c.arc(0, 0, 477, Math.PI * 1.12, Math.PI * 1.8); c.stroke();
  c.strokeStyle = "#ba95b349"; c.lineWidth = 1;
  c.beginPath(); c.arc(0, 0, 473, .12, 2.15); c.stroke();
  c.restore();
  c.textAlign = "center"; c.textBaseline = "top";
  c.font = "52px Georgia, serif"; c.fillStyle = "#b4897c"; c.fillText("♡", 512, 103);
  c.font = "18px Arial, sans-serif"; c.fillStyle = "#92745e";
  c.fillText("A KINDNESS WORTH RECOGNIZING", 512, 169);
  c.font = "italic 63px Georgia, serif"; c.fillStyle = "#a56c82"; c.fillText("Thank you,", 512, 217);
  let nameSize = 75, names: string[] = [];
  do {
    c.font = `${nameSize}px Georgia, serif`;
    names = wrap(t => c.measureText(t).width, record.recipient, 680);
    if (names.length * nameSize * 1.07 <= 170) break;
    nameSize -= 3;
  } while (nameSize > 28);
  let y = 297;
  c.fillStyle = "#67465b";
  names.forEach(line => { c.fillText(line, 512, y); y += nameSize * 1.07; });
  y += 21;
  const divider = c.createLinearGradient(290, 0, 734, 0);
  divider.addColorStop(0, "#c8ac7b00"); divider.addColorStop(.5, "#c8ac7baa"); divider.addColorStop(1, "#c8ac7b00");
  c.fillStyle = divider; c.fillRect(290, y, 444, 2); y += 26;
  let bodySize = 52, lines: string[] = [];
  const height = Math.max(235, 799 - y);
  do {
    c.font = `${bodySize}px Georgia, serif`;
    lines = wrap(t => c.measureText(t).width, message, 700);
    if (lines.length * bodySize * 1.35 <= height) break;
    bodySize -= 1;
  } while (bodySize > 25);
  y += Math.max(0, (height - lines.length * bodySize * 1.35) / 2 - 12);
  c.fillStyle = "#455a52";
  lines.forEach(line => { c.fillText(line, 512, y); y += bodySize * 1.35; });
  c.font = "26px Georgia, serif"; c.fillStyle = "#b27b8c"; c.fillText("♡", 512, 844);
  c.font = "17px Arial, sans-serif"; c.fillStyle = "#8e765a";
  c.fillText(pages > 1 ? `${page + 1} OF ${pages}  ·  CONTINUED` : "RECOGNIZED WITH LOVE", 512, 889);
  c.restore();
}

/** The travelling bead plus the four points trailing it around the gold ring. */
const SHIMMER_BEAD_COUNT = 5;

/** No recognition strings are retained here. The existing slot owns every personal pixel. */
export class StudyPearlSkin {
  private readonly root = new T.Group();
  private readonly geometries = new Set<T.BufferGeometry>();
  private readonly materials = new Set<T.Material>();
  private readonly orbits = new T.Group();
  private readonly medallions: Array<{ id: number; root: T.Group; glint: T.Sprite }> = [];
  private readonly clock = { value: 0 };
  /** Two draws: the pearl beads, then the gold ones. */
  private readonly orbitBeads: T.InstancedMesh[] = [];
  /** Which of the ten authored bead ordinals each instance stands in for. */
  private readonly orbitBeadIndices: number[][] = [];
  private readonly beadDummy = new T.Object3D();
  private readonly orbitAxis = new T.Vector3(0, 0, 1);
  private readonly rings: T.Mesh[] = [];
  private readonly shell: T.Mesh;
  private readonly finish: T.Mesh;
  private readonly halo: T.Mesh;
  private readonly sparkles: T.Points;
  private readonly occluder: T.Mesh;
  private readonly shimmer: T.Points;
  private readonly shimmerPlaces = new Float32Array(SHIMMER_BEAD_COUNT * 3);
  private readonly shimmerScratch = new T.Vector3();

  constructor(parent: T.Group, assets: StudyPearlAssets, seed: number) {
    this.root.name = "Design study pearl glass, halo and exterior canonical symbols";
    parent.add(this.root);
    this.root.add(this.orbits);
    this.orbits.name = "pearl orbits";
    // The halo sits behind the depth writing face, so only the glow outside the disc reaches the eye.
    this.halo = new T.Mesh(this.geometry(new T.PlaneGeometry(3.6, 3.6)), this.material(new T.ShaderMaterial({
      transparent: true, depthTest: true, depthWrite: false, toneMapped: false, blending: T.AdditiveBlending,
      uniforms: { time: this.clock },
      vertexShader: "varying vec2 haloUv;void main(){haloUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: `varying vec2 haloUv;uniform float time;
        void main(){float d=length(haloUv-.5)*3.6;
          // Section 7: a six second breath, so the pearl feels alive while it is being read.
          // It reads the same frozen clock as everything else, so a still frame is complete.
          float breath=.85+.15*(.5+.5*sin(time*1.0472));
          float core=pow(max(0.,1.-d/1.75),2.4);
          float outer=exp(-pow((d-1.18)*2.2,2.));
          vec3 rgb=(mix(vec3(1.,.90,.80),vec3(1.,.78,.86),smoothstep(.6,1.6,d))*core*.55+vec3(.80,.86,1.)*outer*.16)*breath;
          gl_FragColor=vec4(rgb,clamp(dot(rgb,vec3(.2126,.7152,.0722)),0.,1.));
          #include <colorspace_fragment>
        }`,
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
    const gold = this.material(studyGlow(
      new T.MeshStandardMaterial({ color: "#dfbd79", metalness: .8, roughness: .22, transparent: true, opacity: .83, depthWrite: false }),
      "medallion-rim", "vec3(1., .84, .58) * .95",
    ));
    for (let i = 0; i < 2; i++) {
      const points = Array.from({ length: 129 }, (_, j) => { const a=j/128*Math.PI*2;return new T.Vector3(Math.cos(a)*(1.37+i*.11),Math.sin(a)*(1.26+i*.055),Math.sin(a*2+i)*.12-.08); });
      const orbit = new T.Mesh(this.geometry(new T.TubeGeometry(new T.CatmullRomCurve3(points), 128, .0027, 4, false)), gold);
      orbit.rotation.z = i ? -.46 : .38; this.orbits.add(orbit);
    }
    const beadGeometry = this.geometry(new T.SphereGeometry(.024, 20, 12));
    const beadPearl = this.material(new T.MeshPhysicalMaterial({ color: "#fff0dc", roughness: .2, metalness: .18, clearcoat: 1, clearcoatRoughness: .15, iridescence: .35, iridescenceIOR: 1.3 }));
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
    const glass = this.material(studyGlow(studyGlass(.24), "medallion", "vec3(1., .93, .86) * pearlRim * 1.15", "pearlRim * .9"));
    for (const expression of WORLD_EXPRESSIONS) {
      const root = new T.Group(); root.visible = false; root.name = `pearl medallion ${expression.id}`;
      const tint = new T.Mesh(tintDisc, this.material(new T.MeshBasicMaterial({ color: new T.Color(expression.color).lerp(new T.Color("#fff8ef"), .55), toneMapped: false, transparent: true, opacity: .96, depthWrite: false })));
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
      this.root.add(root); this.medallions.push({ id: expression.id, root, glint });
    }
  }
  private geometry<G extends T.BufferGeometry>(g: G) { this.geometries.add(g); return g; }
  private material<M extends T.Material>(m: M) { this.materials.add(m); return m; }
  update(time: number, ids: readonly number[], detailed: boolean, frame: StudyPearlFrame) {
    this.clock.value = time;
    // A resident pearl keeps only its glass shell and one gold ring: two extra draws.
    this.orbits.visible = this.finish.visible = this.halo.visible = detailed;
    // The occluder always blocks the glow layer behind this disc. Only the pearl being read
    // joins the protect mask, which carries no scene depth of its own.
    this.occluder.visible = true;
    if (detailed) this.occluder.layers.enable(3); else this.occluder.layers.disable(3);
    // A resident steps back into the scenery, so it keeps its shell but leaves the glow layer.
    // One message at a time carries the eye, and the glow pass drops a dozen draws with it.
    if (detailed) this.shell.layers.enable(1); else this.shell.layers.disable(1);
    this.sparkles.visible = detailed && frame.sparkles;
    // Sparkle class, like the dust: the bead and the medallion glints follow the owner's switch.
    this.shimmer.visible = detailed && frame.sparkles;
    if (this.shimmer.visible) {
      for (let i = 0; i < SHIMMER_BEAD_COUNT; i++) {
        const a = time * .42 - i * .06;
        this.shimmerScratch.set(Math.cos(a) * 1.37, Math.sin(a) * 1.26, Math.sin(a * 2) * .12 - .08);
        this.shimmerScratch.applyAxisAngle(this.orbitAxis, .38);
        this.shimmerPlaces[i * 3] = this.shimmerScratch.x;
        this.shimmerPlaces[i * 3 + 1] = this.shimmerScratch.y;
        this.shimmerPlaces[i * 3 + 2] = this.shimmerScratch.z;
      }
      this.shimmer.geometry.getAttribute("position").needsUpdate = true;
    }
    this.rings.forEach((ring, index) => { ring.visible = detailed || index === 0; });
    this.orbitBeads.forEach((beads, group) => {
      const size = group ? 1.22 : .9;
      this.orbitBeadIndices[group].forEach((i, slot) => {
        const lane = i % 2, a = i * 2.399 + time * .035;
        this.beadDummy.position
          .set(Math.cos(a) * (1.37 + lane * .11), Math.sin(a) * (1.26 + lane * .055), Math.sin(a * 2 + lane) * .12 - .08)
          .applyAxisAngle(this.orbitAxis, lane ? -.46 : .38);
        this.beadDummy.scale.setScalar(size);
        this.beadDummy.updateMatrix();
        beads.setMatrixAt(slot, this.beadDummy.matrix);
      });
      beads.instanceMatrix.needsUpdate = true;
    });
    const selected = this.medallions.filter(item => ids.includes(item.id));
    this.medallions.forEach(item => {
      item.root.visible = detailed && ids.includes(item.id);
      item.glint.visible = frame.sparkles;
      // A narrow power keeps each glint to a brief catch of light rather than a steady lamp,
      // and the per symbol phase means no two of them flash together.
      item.glint.material.opacity = Math.pow(Math.max(0, Math.sin(time * .55 + item.id * 1.3)), 30) * .9;
    });
    // A narrow viewport pulls the ring in and shrinks the symbols, so none of them leaves the frame.
    const radiusX = (frame.portrait ? 1.06 : 1.36) * frame.orbitScale;
    const radiusY = (frame.portrait ? 1.44 : 1.28) * frame.orbitScale;
    const size = frame.portrait ? .9 : frame.orbitScale;
    selected.forEach((item, i) => {
      const a = time * .105 + i * Math.PI * 2 / selected.length + .8;
      item.root.position.set(Math.cos(a) * radiusX, Math.sin(a) * radiusY, .09 + Math.sin(a * 2) * .055);
      item.root.scale.setScalar(size);
    });
  }
  clear() {
    this.medallions.forEach(item => { item.root.visible = false; });
    this.halo.visible = this.sparkles.visible = this.shimmer.visible = false;
    this.occluder.layers.disable(3);
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
    this.geometries.forEach(g => g.dispose()); this.materials.forEach(m => m.dispose());
    this.geometries.clear(); this.materials.clear();
    this.medallions.length = 0; this.orbitBeads.length = 0; this.rings.length = 0;
    this.orbitBeadIndices.length = 0;
  }
}
