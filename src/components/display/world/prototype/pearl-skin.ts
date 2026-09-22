import * as T from "three";
import type { Recognition } from "@/lib/contracts";
import { WORLD_EXPRESSIONS } from "../world-data";

type Wrap = (measure: (text: string) => number, text: string, width: number) => string[];

export class StudyPearlAssets {
  private readonly textures = new Map<number, T.Texture>();
  private disposed = false;
  constructor(private readonly invalidate: () => void) {}
  icon(id: number) {
    const existing = this.textures.get(id);
    if (existing) return existing;
    const map = new T.TextureLoader().load(`/home-art/icon${id}.webp`, () => { if (!this.disposed) this.invalidate(); });
    map.colorSpace = T.SRGBColorSpace; this.textures.set(id, map); return map;
  }
  dispose() { this.disposed = true; this.textures.forEach(t => t.dispose()); this.textures.clear(); }
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

/** No recognition strings are retained here. The existing slot owns every personal pixel. */
export class StudyPearlSkin {
  private readonly root = new T.Group();
  private readonly geometries = new Set<T.BufferGeometry>();
  private readonly materials = new Set<T.Material>();
  private readonly orbits = new T.Group();
  private readonly medallions: Array<{ id: number; root: T.Group }> = [];
  private readonly clock = { value: 0 };
  private readonly orbitBeads: T.Mesh[] = [];
  private readonly orbitAxis = new T.Vector3(0, 0, 1);

  constructor(parent: T.Group, assets: StudyPearlAssets) {
    this.root.name = "Design study pearl film and exterior canonical symbols";
    parent.add(this.root);
    this.root.add(this.orbits);
    const sphere = this.geometry(new T.SphereGeometry(1.014, 64, 32));
    const film = this.material(new T.ShaderMaterial({
      transparent: true, depthTest: true, depthWrite: false,
      uniforms: { time: this.clock },
      vertexShader: `varying vec3 n;varying vec3 p;void main(){n=normalize(normalMatrix*normal);vec4 v=modelViewMatrix*vec4(position,1.);p=v.xyz;gl_Position=projectionMatrix*v;}`,
      fragmentShader: `varying vec3 n;varying vec3 p;uniform float time;
        void main(){vec3 N=normalize(n),V=normalize(-p);float nv=max(0.,dot(N,V));float rim=pow(1.-nv,1.7);vec3 R=reflect(-V,N);
        float key=pow(max(0.,dot(R,normalize(vec3(-.47,.67,1.)))),27.);float fill=pow(max(0.,dot(R,normalize(vec3(.74,-.38,.9)))),20.);
        float a=atan(N.y,N.x);float irid=.5+.5*sin(a*2.4+nv*9.+time*.12);
        vec3 tint=mix(vec3(.84,.23,.48),vec3(.15,.52,.78),irid);
        vec3 color=mix(vec3(1.,.94,.84),tint,rim*.90)+key*.85+fill*.22;
        gl_FragColor=vec4(color,.035+rim*.75+key*.45+fill*.15);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }`,
    }));
    const dome = new T.Mesh(sphere, film); dome.scale.z = .78; dome.position.z = .026; dome.renderOrder = 3; this.root.add(dome);
    const finishing = this.material(new T.ShaderMaterial({
      transparent: true, depthTest: true, depthWrite: false, toneMapped: false,
      uniforms: { time: this.clock },
      vertexShader: "varying vec2 pearlUv;void main(){pearlUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: `varying vec2 pearlUv;uniform float time;
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
          float alpha=clamp(rim*.92+inner*.32+reflection*.52+lower*.7+sparkle,0.,1.);
          gl_FragColor=vec4(mix(c,vec3(1.,.985,.93),clamp(reflection+sparkle,0.,1.)),alpha);
          #include <colorspace_fragment>
        }`,
    }));
    const finish = new T.Mesh(this.geometry(new T.PlaneGeometry(2.18, 2.18)), finishing);
    finish.position.z = .065; finish.renderOrder = 4; this.root.add(finish);
    for (let i = 0; i < 3; i++) {
      const ring = new T.Mesh(this.geometry(new T.TorusGeometry(1.005 + i * .016, i ? .0025 : .006, 6, 128)), this.material(new T.MeshBasicMaterial({ color: ["#fffef5", "#d6b483", "#e2afca"][i], transparent: true, opacity: i ? .48 : .86, depthWrite: false })));
      ring.position.z = .045; this.root.add(ring);
    }
    const gold = this.material(new T.MeshStandardMaterial({ color: "#dfbd79", metalness: .8, roughness: .22, transparent: true, opacity: .83, depthWrite: false }));
    for (let i = 0; i < 2; i++) {
      const points = Array.from({ length: 129 }, (_, j) => { const a=j/128*Math.PI*2;return new T.Vector3(Math.cos(a)*(1.37+i*.11),Math.sin(a)*(1.26+i*.055),Math.sin(a*2+i)*.12-.08); });
      const orbit = new T.Mesh(this.geometry(new T.TubeGeometry(new T.CatmullRomCurve3(points), 128, .0027, 4, false)), gold);
      orbit.rotation.z = i ? -.46 : .38; this.orbits.add(orbit);
    }
    const beadGeometry = this.geometry(new T.SphereGeometry(.024, 20, 12));
    const beadPearl = this.material(new T.MeshPhysicalMaterial({ color: "#fff0dc", roughness: .2, metalness: .18, clearcoat: 1, clearcoatRoughness: .15, iridescence: .35, iridescenceIOR: 1.3 }));
    for (let i = 0; i < 10; i++) {
      const pearl = new T.Mesh(beadGeometry, i % 3 ? beadPearl : gold);
      pearl.scale.setScalar(i % 3 ? .9 : 1.22); this.orbits.add(pearl); this.orbitBeads.push(pearl);
    }
    const circle = this.geometry(new T.CircleGeometry(.154, 48));
    const bead = this.geometry(new T.SphereGeometry(.162, 24, 16));
    for (const expression of WORLD_EXPRESSIONS) {
      const root = new T.Group(); root.visible = false;
      const pearl = this.material(new T.MeshPhysicalMaterial({ color: new T.Color(expression.color).lerp(new T.Color("#fff7e9"), .66), roughness: .26, metalness: .1, clearcoat: .9, clearcoatRoughness: .22 }));
      const ball = new T.Mesh(bead, pearl); ball.scale.z = .55; root.add(ball);
      const map = assets.icon(expression.id);
      const icon = new T.Mesh(circle, this.material(new T.MeshBasicMaterial({ map, transparent: true, depthTest: true, depthWrite: false, toneMapped: false })));
      icon.position.z = .10; root.add(icon);
      const rim = new T.Mesh(this.geometry(new T.TorusGeometry(.173, .0038, 5, 48)), gold); rim.position.z = .015; root.add(rim);
      this.root.add(root); this.medallions.push({ id: expression.id, root });
    }
  }
  private geometry<G extends T.BufferGeometry>(g: G) { this.geometries.add(g); return g; }
  private material<M extends T.Material>(m: M) { this.materials.add(m); return m; }
  update(time: number, ids: readonly number[], detailed: boolean) {
    this.clock.value = time;
    this.orbits.visible = detailed;
    this.orbitBeads.forEach((bead, i) => {
      const lane = i % 2, a = i * 2.399 + time * .035;
      bead.position.set(Math.cos(a) * (1.37 + lane * .11), Math.sin(a) * (1.26 + lane * .055), Math.sin(a * 2 + lane) * .12 - .08);
      bead.position.applyAxisAngle(this.orbitAxis, lane ? -.46 : .38);
    });
    const selected = this.medallions.filter(item => ids.includes(item.id));
    this.medallions.forEach(item => { item.root.visible = detailed && ids.includes(item.id); });
    selected.forEach((item, i) => {
      const a = time * .105 + i * Math.PI * 2 / selected.length + .8;
      item.root.position.set(Math.cos(a) * 1.36, Math.sin(a) * 1.28, .09 + Math.sin(a * 2) * .055);
    });
  }
  clear() { this.medallions.forEach(item => { item.root.visible = false; }); }
  dispose() {
    this.root.removeFromParent(); this.root.clear();
    this.geometries.forEach(g => g.dispose()); this.materials.forEach(m => m.dispose());
    this.geometries.clear(); this.materials.clear(); this.medallions.length = 0; this.orbitBeads.length = 0;
  }
}
