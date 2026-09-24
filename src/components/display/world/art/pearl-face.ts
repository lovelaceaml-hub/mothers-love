/** The pearl's face: its frame, its painted assets and the painter that lays out the words. */
import * as T from "three";
import type { Recognition } from "@/lib/contracts";
import { softDot } from "./study-materials";
import type { StudyPearlKit, StudyPearlKitParts } from "./pearl-skin-measures";
import { buildPearlKitParts } from "./pearl-kit-parts";

type Wrap = (measure: (text: string) => number, text: string, width: number) => string[];

/** What the host slot knows about this pearl's place on screen for the current frame. */
export type StudyPearlFrame = {
  sparkles: boolean;
  portrait: boolean;
  orbitScale: number;
  /**
   * False where the zone draws orbits of its own (the Expression Cosmos), so the pearl's two
   * gold lanes and their travelling beads stand down and the constellation reads as one orbit.
   * Absent means true.
   */
  lanes?: boolean;
  /**
   * True for the arriving pearl. Its kit rim, bead band, medallion orbs and bezels then join
   * the protect mask with the occluder, so the arrival's bloom and light column never wash
   * over the canonical symbols. Absent means false.
   */
  shield?: boolean;
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
  private kitCache?: { kit: StudyPearlKit; parts: StudyPearlKitParts };
  /**
   * The kit pieces every pearl wears, built once from the kit and shared by all nineteen skins,
   * which is why they live here and are released with the assets rather than by any one skin.
   */
  kitParts(kit: StudyPearlKit): StudyPearlKitParts | undefined {
    if (this.disposed) return undefined;
    if (this.kitCache?.kit !== kit) {
      this.kitCache?.parts.dispose();
      this.kitCache = { kit, parts: buildPearlKitParts(kit) };
    }
    return this.kitCache.parts;
  }
  dispose() {
    this.disposed = true;
    this.textures.forEach(t => t.dispose()); this.textures.clear();
    this.sparkleDot?.dispose(); this.sparkleDot = undefined;
    this.kitCache?.parts.dispose(); this.kitCache = undefined;
  }
}

/** The face's two small caps lines, canvas pixels of the 1024 face: D2's 18 and 17, a fifth larger. */
export const STUDY_CAPTION_SIZE = { top: 21.6, bottom: 20.4 } as const;

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
  // The two small caps lines are a fifth larger than D2 drew them (visual review, 2026-09-23:
  // at 18 and 17 they were about 10 px on a 1080p TV). Size only: every position is the
  // approved layout's.
  c.font = `${STUDY_CAPTION_SIZE.top}px Arial, sans-serif`; c.fillStyle = "#92745e";
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
  c.font = `${STUDY_CAPTION_SIZE.bottom}px Arial, sans-serif`; c.fillStyle = "#8e765a";
  c.fillText(pages > 1 ? `${page + 1} OF ${pages}  ·  CONTINUED` : "RECOGNIZED WITH LOVE", 512, 889);
  c.restore();
}
