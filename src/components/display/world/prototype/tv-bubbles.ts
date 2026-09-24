import * as T from "three";
import type { Recognition } from "@/lib/contracts";
import type { WorldZone } from "../world-data";

/*
 * The TV page's recognition bubbles (PLAN-01 Section 5, step 4): how their words are painted
 * so they read from across the room, and the decoration they wear. Where they stand is
 * `tv-places.ts`, and how they flow is `tv-flow.ts`.
 */

/** The tour camera's vertical field of view on a landscape screen (world-engine resize). */
export const TV_FOV = 43;
export const TV_ASPECT = 16 / 9;
/** The reference screen for every pixel rule here. */
export const TV_SCREEN_HEIGHT = 1080;

export type TvBubbleRole = "main" | "flow";

/** A place's tour camera, parked, as the director leaves it with no reading arc. */
export function tvTourCamera(zone: Pick<WorldZone, "eye" | "target">, aspect = TV_ASPECT) {
  const camera = new T.PerspectiveCamera(TV_FOV, aspect, 0.1, 450);
  camera.position.fromArray(zone.eye);
  camera.lookAt(new T.Vector3(...zone.target));
  camera.updateMatrixWorld();
  return camera;
}

/*
 * The faces. Coordinates are in a 1024 canvas and scale with the canvas, so a 2048 hero canvas
 * paints the same layout at twice the pixels and a 512 one at half.
 */
/** A face's layout, in pixels of a 1024 face (a 2048 or 512 face scales it). */
export type TvFaceStyle = {
  readonly canvas: number;
  readonly thanks: number;
  readonly name: number;
  readonly nameMin: number;
  readonly body: number;
  readonly line: number;
  readonly windowTop: number;
  readonly windowBottom: number;
  readonly windowWidth: number;
  readonly heart: number;
};
/**
 * The main bubble, read up close at 650 px (`TV_READ` in `tv-places.ts`): body 56 of 1024 is
 * 35.5 px on screen, and the window holds nine lines before the message scrolls.
 */
export const TV_BIG = {
  canvas: 1024,
  thanks: 48,
  name: 64,
  nameMin: 44,
  body: 56,
  line: 68,
  windowTop: 250,
  windowBottom: 862,
  windowWidth: 660,
  heart: 44,
} as const satisfies TvFaceStyle;

/** The smallest text any flowing bubble shows at rest, px on a 1080 line screen, wherever the camera swings. */
export const TV_FLOW_MIN_PX = 22;
/** What a flowing bubble's face is sized for at its resting place, seen from the reading framing. */
export const TV_FLOW_PX = 23.5;
/**
 * A flowing bubble's face for its diameter on screen at rest: every word at 23.5 px (Anthony,
 * 2026-09-24: "Whole message, bigger bubbles"), so the camera's slow swing never takes a word
 * under 22. A bigger bubble takes smaller canvas type, so it holds more of the message; what
 * still does not fit scrolls while it rests.
 */
export function tvFlowStyle(diameter: number): TvFaceStyle {
  const body = Math.ceil((1024 * TV_FLOW_PX) / diameter);
  return {
    canvas: 1024, thanks: body, name: Math.round(body * 1.15), nameMin: body, body,
    line: Math.round(body * 1.22), windowTop: 250, windowBottom: 862, windowWidth: 660, heart: body,
  };
}
/** The fill under the words, lightest to darkest; every text colour is checked against both. */
export const TV_FILL = ["#fffdf6", "#fbecf1"] as const;
export const TV_TEXT = {
  body: "#34443d",
  name: "#5b3550",
  thanks: "#8a4262",
  heart: "#96385e",
} as const;
/**
 * Canvas fonts: the study's Georgia, then common serifs, then the system emoji fonts, so
 * emoji show in colour. The emoji fonts come last on purpose: they also carry digits and the
 * space, and a TV without Georgia would otherwise draw every number and gap from them.
 */
export const TV_FONT_STACK = 'Georgia, "Times New Roman", "Noto Serif", "DejaVu Serif", serif, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"';
const serif = (px: number, italic = false) => `${italic ? "italic " : ""}${px}px ${TV_FONT_STACK}`;

type Wrap = (measure: (text: string) => number, text: string, width: number) => string[];

function ground(c: CanvasRenderingContext2D) {
  c.beginPath(); c.arc(512, 512, 506, 0, Math.PI * 2); c.clip();
  const fill = c.createRadialGradient(512, 512, 0, 512, 512, 512);
  fill.addColorStop(0, TV_FILL[0]); fill.addColorStop(0.8, "#fff8f1");
  fill.addColorStop(0.96, TV_FILL[1]); fill.addColorStop(1, "#f2dcc0");
  c.fillStyle = fill; c.fillRect(0, 0, 1024, 1024);
  // A faint gold engraving just inside the rim, outside every word.
  c.strokeStyle = "#d9bf8c88"; c.lineWidth = 2;
  c.beginPath(); c.arc(512, 512, 486, 0, Math.PI * 2); c.stroke();
}

/** `♥ 24`, or nothing when the count is unknown (live pages have no reaction counts). */
export function heartLabel(count: number | null) {
  return count === null ? "" : `♥ ${count.toLocaleString("en-US")}`;
}

/**
 * The big bubble's face: heart mark, "Thank you,", the name and the heart count. The message
 * is a separate scrolling window (`paintTvMessage`), so the face is painted once per record.
 * Returns where the message window starts, below the name.
 */
/** Measures `text` in the face font at `px` (canvas units of a 1024 face). */
export type Measure = (text: string, px: number) => number;
/** A canvas measure for the face font. */
export function canvasMeasure(c: CanvasRenderingContext2D): Measure {
  return (text, px) => { c.font = serif(px); return c.measureText(text).width; };
}
/**
 * Where a face's words go (1024 face units): the name's lines and size under "Thank you,", and
 * the top of the message window below them.
 */
export function tvFaceLayout(measure: Measure, recipient: string, style: TvFaceStyle, wrap: Wrap) {
  let size: number = style.name, names: string[] = [];
  const nameRoom = Math.max(150, style.name * 1.08 * 2);
  do {
    names = wrap((t) => measure(t, size), recipient, 700);
    if (names.length * size * 1.08 <= nameRoom) break;
    size -= 2;
  } while (size > style.nameMin);
  const nameTop = Math.max(158, 100 + style.thanks * 1.18);
  const nameBottom = nameTop + names.length * size * 1.08;
  return { size, names, nameTop, nameBottom, windowTop: Math.max(style.windowTop, nameBottom + 30) };
}
/**
 * Whether a message fits a face's window whole, without scrolling: `paintTvMessage`'s own test,
 * at the face's own `scale` (its canvas over 1024), so the wrap is the one it will paint.
 */
export function tvMessageFits(measure: Measure, message: string, style: TvFaceStyle, windowTop: number, wrap: Wrap, scale = 1) {
  const lines = wrap((t) => measure(t, style.body * scale), message, style.windowWidth * scale).length;
  return lines * style.line * scale + 20 * scale <= (style.windowBottom - windowTop) * scale;
}
/**
 * A flowing bubble's diameter on screen at rest: the smallest, in steps of 10 px from `min`, at
 * which its whole message fits at 23.5 px; the largest when even that is too small, and then the
 * message scrolls while the bubble rests. `scale` is the face canvas over 1024.
 */
export function tvFitFlowDiameter(measure: Measure, record: Pick<Recognition, "recipient" | "message">, wrap: Wrap, min: number, max: number, scale = 1) {
  for (let diameter = min; diameter < max; diameter += 10) {
    const style = tvFlowStyle(diameter);
    if (tvMessageFits(measure, record.message, style, tvFaceLayout(measure, record.recipient, style, wrap).windowTop, wrap, scale)) return diameter;
  }
  return max;
}

export function paintTvBigFace(canvas: HTMLCanvasElement, record: Recognition, heart: number | null, wrap: Wrap, style: TvFaceStyle = TV_BIG) {
  const c = canvas.getContext("2d")!;
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.save();
  c.scale(canvas.width / 1024, canvas.height / 1024);
  ground(c);
  c.textAlign = "center"; c.textBaseline = "top";
  c.fillStyle = TV_TEXT.heart; c.font = serif(40); c.fillText("♡", 512, 52);
  c.fillStyle = TV_TEXT.thanks; c.font = serif(style.thanks, true); c.fillText("Thank you,", 512, 100);
  const layout = tvFaceLayout(canvasMeasure(c), record.recipient, style, wrap);
  let y = layout.nameTop;
  c.fillStyle = TV_TEXT.name; c.font = serif(layout.size);
  for (const line of layout.names) { c.fillText(line, 512, y); y += layout.size * 1.08; }
  const divider = c.createLinearGradient(330, 0, 694, 0);
  divider.addColorStop(0, "#c8ac7b00"); divider.addColorStop(0.5, "#c8ac7bcc"); divider.addColorStop(1, "#c8ac7b00");
  c.fillStyle = divider; c.fillRect(330, y + 10, 364, 2);
  const label = heartLabel(heart);
  if (label) { c.fillStyle = TV_TEXT.heart; c.font = serif(style.heart); c.fillText(label, 512, style.windowBottom + 8); }
  c.restore();
  return { windowTop: Math.max(style.windowTop, y + 30) };
}

/**
 * The whole message, never cut, in a tall canvas the window scrolls through. The body stays
 * at the style's size whatever the length; a message longer than the window scrolls instead
 * of shrinking. A short one is centred in the window.
 */
export function paintTvMessage(canvas: HTMLCanvasElement, message: string, windowHeight: number, scale: number, wrap: Wrap, style: TvFaceStyle = TV_BIG) {
  const c = canvas.getContext("2d")!;
  c.font = serif(style.body * scale);
  const lines = wrap((t) => c.measureText(t).width, message, style.windowWidth * scale);
  const line = style.line * scale, window = windowHeight * scale;
  const text = lines.length * line;
  // A message that scrolls is padded by the fade, so its first and last lines are read clear.
  const fits = text + 20 * scale <= window;
  const pad = fits ? 10 * scale : window * TV_FADE;
  const height = Math.ceil(Math.max(window, text + pad * 2));
  canvas.width = Math.ceil(style.windowWidth * scale);
  canvas.height = height;
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.font = serif(style.body * scale);
  c.textAlign = "center"; c.textBaseline = "top"; c.fillStyle = TV_TEXT.body;
  let y = fits ? (window - text) / 2 : pad;
  for (const item of lines) { c.fillText(item, canvas.width / 2, y + (line - style.body * scale) / 2); y += line; }
  // A message that fits never scrolls, whatever the rounding of its canvas height.
  return { lines: lines.length, height, overflow: fits ? 0 : Math.max(0, height - window) };
}

/** The fade at a scrolling window's edges, as a fraction of the window's height. */
export const TV_FADE = 0.12;

/** How far a held message has scrolled: still for 2 s, then evenly to the end 2 s before the hold ends. */
export function tvScrollFraction(age: number, hold: number) {
  return Math.min(1, Math.max(0, (age - 2) / Math.max(1, hold - 4)));
}

/** WCAG relative luminance contrast of two `#rrggbb` colours. */
export function contrastRatio(a: string, b: string) {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The decoration every TV bubble wears: a thicker rainbow rim, a soft inner glow inside the rim
 * (never over the words), a thin gold orbit ring and the scrolling message window. It also
 * blocks the glow layers behind its disc (layers 1 and 3), so bloom and light shafts never
 * wash over the words. One set per slot, slot space.
 */
export class TvBubbleDecor {
  readonly root = new T.Group();
  private readonly clock = { value: 0 };
  /** Each bubble fades on its own as it floats away, so it owns its materials (one shader program each). */
  private readonly alpha = { value: 1 };
  private readonly rim: T.Mesh<T.RingGeometry, T.ShaderMaterial>;
  private readonly glow: T.Mesh<T.RingGeometry, T.ShaderMaterial>;
  private readonly orbit: T.Mesh<T.TorusGeometry, T.MeshStandardMaterial>;
  private readonly window: T.Mesh<T.PlaneGeometry, T.MeshBasicMaterial>;
  private readonly occluder: T.Mesh;
  private readonly fade: T.DataTexture;
  private message?: { canvas: HTMLCanvasElement; texture: T.CanvasTexture; key: string; overflow: number; height: number };
  constructor(parent: T.Object3D, shared: TvDecorShared) {
    this.root.name = "tv bubble decor";
    parent.add(this.root);
    const rim = shared.rimMaterial.clone(), glow = shared.glowMaterial.clone();
    rim.uniforms.time = this.clock; rim.uniforms.alpha = this.alpha; glow.uniforms.alpha = this.alpha;
    this.rim = new T.Mesh(shared.rimGeometry, rim);
    this.rim.name = "tv rainbow rim"; this.rim.position.z = 0.03; this.rim.renderOrder = 4;
    this.glow = new T.Mesh(shared.glowGeometry, glow);
    this.glow.name = "tv inner glow"; this.glow.position.z = 0.012; this.glow.renderOrder = 3;
    this.orbit = new T.Mesh(shared.orbitGeometry, shared.orbitMaterial.clone());
    this.orbit.material.transparent = true;
    this.orbit.name = "tv gold orbit"; this.orbit.rotation.set(0.35, 0.2, 0.3);
    this.fade = shared.fade;
    this.window = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({
      transparent: true, depthWrite: false, toneMapped: false,
    }));
    this.window.name = "tv message window"; this.window.position.z = 0.006; this.window.renderOrder = 2;
    this.window.visible = false;
    // As the study skin's occluder: black on the glow layer, and on the protect mask.
    this.occluder = new T.Mesh(shared.occluderGeometry, shared.occluderMaterial);
    this.occluder.name = "tv bubble occluder"; this.occluder.renderOrder = 1;
    this.occluder.layers.set(1); this.occluder.layers.enable(3);
    this.root.add(this.rim, this.glow, this.orbit, this.window, this.occluder);
  }
  /** Paint (once per record and canvas scale) and place the message window under the name. */
  setMessage(message: string | undefined, windowTop: number, scale: number, wrap: Wrap, style: TvFaceStyle = TV_BIG) {
    if (message === undefined) { this.clearMessage(); return; }
    const key = `${scale}:${windowTop}:${style.body}:${message}`;
    if (this.message?.key === key) return;
    this.clearMessage();
    const canvas = document.createElement("canvas");
    const windowHeight = style.windowBottom - windowTop;
    const painted = paintTvMessage(canvas, message, windowHeight, scale, wrap, style);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    texture.minFilter = T.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.repeat.set(1, (windowHeight * scale) / painted.height);
    this.message = { canvas, texture, key, overflow: painted.overflow, height: painted.height };
    const material = this.window.material;
    material.map = texture;
    // Only a scrolling message fades at its edges; one that fits is shown whole and crisp.
    material.alphaMap = painted.overflow > 0 ? this.fade : null;
    material.needsUpdate = true;
    // Slot space: the face disc has radius 1 over 512 canvas pixels of a 1024 face.
    this.window.scale.set(style.windowWidth / 512, windowHeight / 512, 1);
    this.window.position.y = (512 - (windowTop + windowHeight / 2)) / 512;
    this.window.visible = true;
    this.scroll(0);
  }
  /** 0 shows the top of the message, 1 the end. */
  scroll(fraction: number) {
    const message = this.message;
    if (!message) return;
    const shown = message.texture.repeat.y;
    message.texture.offset.y = (1 - shown) * (1 - (message.overflow > 0 ? fraction : 0));
  }
  get scrollable() {
    return (this.message?.overflow ?? 0) > 0;
  }
  /** `opacity` fades the whole decoration with its bubble as it floats away. */
  update(time: number, opacity = 1) {
    this.clock.value = time;
    this.alpha.value = opacity;
    this.orbit.rotation.z = 0.3 + time * 0.05;
    this.orbit.material.opacity = opacity;
    this.orbit.visible = opacity > 0.02;
    this.window.material.opacity = opacity;
    // A fading bubble stops guarding the glow behind it, so the glow returns with the scenery.
    this.occluder.visible = opacity > 0.5;
  }
  set visible(value: boolean) {
    this.root.visible = value;
  }
  private clearMessage() {
    if (!this.message) return;
    this.window.material.map = null;
    this.window.material.needsUpdate = true;
    this.message.texture.dispose();
    this.message.canvas.width = this.message.canvas.height = 1;
    this.message = undefined;
    this.window.visible = false;
  }
  dispose() {
    this.clearMessage();
    this.window.geometry.dispose();
    for (const material of [this.window.material, this.rim.material, this.glow.material, this.orbit.material]) material.dispose();
    this.root.removeFromParent();
  }
}

/** The geometry and materials every decor shares, owned by the bubbles host. */
export class TvDecorShared {
  readonly time = { value: 0 };
  readonly rimGeometry = new T.RingGeometry(0.975, 1.17, 160, 4);
  readonly glowGeometry = new T.RingGeometry(0.86, 0.99, 160, 2);
  readonly orbitGeometry = new T.TorusGeometry(1.16, 0.006, 6, 128);
  readonly rimMaterial = new T.ShaderMaterial({
    transparent: true, depthTest: true, depthWrite: false, toneMapped: false,
    uniforms: { time: this.time, alpha: { value: 1 } },
    vertexShader: "varying vec2 rimP;void main(){rimP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: `varying vec2 rimP;uniform float time;uniform float alpha;
      void main(){float r=length(rimP),a=atan(rimP.y,rimP.x);
        float band=smoothstep(.975,1.0,r)*(1.-smoothstep(1.07,1.17,r));
        vec3 rainbow=.62+.38*cos(6.2832*(a/6.2832+vec3(0.,.33,.67))+time*.25+r*9.);
        rainbow=mix(rainbow,vec3(1.,.97,.92),.28);
        float sheen=.55+.45*sin(a*3.+time*.6);
        gl_FragColor=vec4(rainbow,band*(.5+.3*sheen)*alpha);
        #include <colorspace_fragment>
      }`,
  });
  readonly glowMaterial = new T.ShaderMaterial({
    transparent: true, depthTest: true, depthWrite: false, toneMapped: false,
    uniforms: { alpha: { value: 1 } },
    vertexShader: "varying vec2 glowP;void main(){glowP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: `varying vec2 glowP;uniform float alpha;
      void main(){float r=length(glowP);float g=smoothstep(.86,.99,r);
        gl_FragColor=vec4(vec3(1.,.93,.84),g*g*.55*alpha);
        #include <colorspace_fragment>
      }`,
  });
  readonly orbitMaterial = new T.MeshStandardMaterial({ color: "#e2bd72", metalness: 0.85, roughness: 0.25 });
  /** .985 rather than 1, as the study skin's: the mask ends just inside the rim. */
  readonly occluderGeometry = new T.CircleGeometry(0.985, 64);
  readonly occluderMaterial = new T.MeshBasicMaterial({ color: 0x000000, fog: false, toneMapped: false });
  /** A scrolling window's top and bottom edges fade over this much of it (about one line); alpha maps read green. */
  readonly fade: T.DataTexture;
  constructor() {
    const rows = 64, data = new Uint8Array(rows * 4);
    for (let i = 0; i < rows; i++) {
      const v = i / (rows - 1), edge = Math.min(v, 1 - v);
      const alpha = Math.round(255 * Math.min(1, edge / TV_FADE));
      data.set([alpha, alpha, alpha, 255], i * 4);
    }
    this.fade = new T.DataTexture(data, 1, rows);
    this.fade.needsUpdate = true;
  }
  tick(time: number) {
    this.time.value = time;
  }
  dispose() {
    for (const item of [this.rimGeometry, this.glowGeometry, this.orbitGeometry, this.rimMaterial, this.glowMaterial, this.orbitMaterial, this.occluderGeometry, this.occluderMaterial, this.fade]) item.dispose();
  }
}
