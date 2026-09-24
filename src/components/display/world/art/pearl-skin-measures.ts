/** The pearl skin's kit contract, its measures and ids, and the halo shader text. */
import * as T from "three";
import type { WorldKit } from "../kit/kit-loader";
import type { KitAssetId } from "../kit/kit-manifest";
import { WORLD_EXPRESSIONS } from "../world-data";

/*
 * The 3D Studio kit on the pearl (Plan 26 K1, WORLD-INTEGRATION section 3).
 *
 * What the kit brings, all of it outside the words: the shell file's gold rim ring and its
 * bead band, thinned to every other bead and strung pearl, gold, pearl as target 01 strings
 * its orbit; a thin film of rainbow colour at the bubble's edge; the orbit ring's gold wire,
 * drawn as a hairline, laid on the two existing orbit lanes; each medallion's glass orb,
 * back bowl and gold bezel with its studs; and the four point star with its twinkle clip.
 *
 * Visual review (2026-09-23) asked for one bead element, not four: the band keeps its beads,
 * the wire loses its dots, and the ten travelling pearls stay as the orbit's few pearls.
 *
 * What it never touches: the face disc, `paintStudyPearl`, the occluder, the halo plane, the
 * finishing plane, the dust inside the glass and the layer rules. The glass shell over the
 * words stays the procedural sphere too. The kit's shell is the same sphere in the same
 * material (design 3.1 keeps `studyGlass`), so swapping it adds nothing a viewer could see,
 * while its different tessellation would move pixels over the words, which the text parity
 * rule forbids. The file's glass therefore only sets the scale every other shell piece is
 * normalized by, so the rim hugs the sphere exactly as authored.
 */

/** The read only part of the kit the skin uses, so a test can hand it a real kit loaded in Node. */
export type StudyPearlKit = Pick<WorldKit, "has" | "asset" | "geometry">;
/**
 * Where a skin finds the kit. It is read once, on the skin's first update: the skin is built
 * before its slot joins the scene, so the host hands over a getter for
 * `scene.userData.studyKit` rather than the kit itself (coordinator ruling on K1).
 */
export type StudyPearlKitSource = () => StudyPearlKit | undefined;

export const PEARL_KIT_PEARL: KitAssetId = "recognition.recognition-pearl";
export const PEARL_KIT_ORBIT: KitAssetId = "recognition.orbit-ring";
export const PEARL_KIT_SPARKLE: KitAssetId = "recognition.constellation-sparkle";
/** The nine medallion files share one bezel; any one of them supplies the orb and its setting. */
export const PEARL_KIT_MEDALLIONS: readonly KitAssetId[] = WORLD_EXPRESSIONS.map(
  expression => `recognition.medallion-${String(expression.id).padStart(2, "0")}` as KitAssetId,
);

/** Slot space, where the face disc has radius 1: the glass shell's radius, today and in the kit. */
export const PEARL_SHELL_RADIUS = 1.02;
/** A medallion's glass orb, in medallion space before the orbit's own scale. */
export const MEDALLION_ORB_RADIUS = .196;
/** The plane the gold rings sit in, just in front of the face. */
export const PEARL_RING_Z = .045;
/**
 * The bead band keeps one bead in this many, so the setting reads as a string of pearls
 * rather than a marquee (visual review: the full band of eighty was busy at every size).
 */
export const PEARL_RIM_BEAD_STRIDE = 2;
/** The orbit wire's radius on the lane, slot space: a hairline, as target 01 draws its orbits. */
export const PEARL_WIRE_RADIUS = .0032;
/**
 * The thin film at the bubble's edge, slot space. Its inner edge stays outside .955 of the
 * face radius, so the words and the engraved frame around them are never touched (the text
 * parity rule is checked inside .95); it fades out by the outer edge, over the scenery.
 */
export const PEARL_FILM_INNER = .955;
export const PEARL_FILM_OUTER = 1.16;
/**
 * The film's strength: its alpha is `base` plus `fringe` times the travelling fringe (0 to 1).
 * Visual review asked for target 01's strength, where lavender, mint and peach read at the rim;
 * the first pass (.30 plus .28) was lost against the pastel sky.
 */
export const PEARL_FILM_ALPHA = { base: .46, fringe: .34 } as const;
/**
 * The medallion orb's glass over the canonical icon, kit only: a pastel veil strong enough to
 * take about forty percent of the saturation out of the flat campaign icons, so their blue
 * and teal sit inside the pastel world. The icon disc itself is untouched (design 3.1).
 * Measured on the Garden captures: .40 took 27 percent, .55 took 55 to 67 percent.
 */
export const MEDALLION_VEIL_OPACITY = .48;
/** The two orbit lanes, exactly the procedural tubes' and the travelling beads': radii, saddle phase, roll. */
export const ORBIT_LANES = [
  { rx: 1.37, ry: 1.26, phase: 0, roll: .38 },
  { rx: 1.48, ry: 1.315, phase: 1, roll: -.46 },
] as const;

export type StudyPearlTwinkle = (time: number, rotation: T.Quaternion, scale: T.Vector3) => void;
/** Shared by every skin; built once per kit by `StudyPearlAssets.kitParts`. */
export type StudyPearlKitParts = {
  /** The shell file's gold rim ring and the band's gold beads, slot space, at the ring plane. One gold draw. */
  rim?: T.BufferGeometry;
  /** The band's pearl beads, alternating with the gold ones round the ring. One pearl draw. */
  rimPearls?: T.BufferGeometry;
  /** Both orbit lanes in one geometry: the kit's gold wire and dots on the procedural lanes. */
  orbit?: T.BufferGeometry;
  /** One kit medallion's orb glass, back bowl and gold bezel with studs, medallion space. */
  medallion?: { glass: T.BufferGeometry; back: T.BufferGeometry; bezel: T.BufferGeometry };
  /** The kit's four point star at radius 1, and its twinkle sampled from the file's own clip. */
  star?: { geometry: T.BufferGeometry; twinkle: StudyPearlTwinkle };
  /**
   * The kit ring's own pearl and gold bead radii, slot space, laid on the inner lane. The
   * travelling beads take these sizes, which is how the ring's pearls survive on the orbit.
   */
  beads?: { pearl: number; gold: number };
  /** What normalization measured, for the tests and the lane report. */
  facts: {
    shellScale?: number;
    shellRadius?: number;
    rimInner?: number;
    rimOuter?: number;
    /** Beads in the file's band, and how many the setting keeps as pearls and as gold. */
    rimBeadsInFile?: number;
    rimPearlBeads?: number;
    rimGoldBeads?: number;
    orbitCentre?: number;
    /** The wire's own radius on the lane before and after it is drawn as a hairline. */
    wireRadiusInFile?: number;
    wireRadius?: number;
    beadPearlRadius?: number;
    beadGoldRadius?: number;
    medallionScale?: number;
    orbRadius?: number;
  };
  dispose(): void;
};

/** The travelling bead plus the four points trailing it around the gold ring. */
export const SHIMMER_BEAD_COUNT = 5;
/** The shimmer's head star, and up to four more, each in its own gap between the medallions shown. */
export const PEARL_STAR_COUNT = 5;
/**
 * Clear air every kit star keeps outside each shown medallion's orb, in medallion units. The
 * head star's lane runs up to .31 behind a medallion's icon disc where it crosses the ring. A
 * hero is read from about 6.7 slot radii (the Garden eye, design 3.2), and the ring only fits
 * the frame from about 4.3 (`frameFor`), so perspective pulls the star at most about .1 towards
 * the icon on screen. The icon disc sits .048 inside the orb, so .08 of air keeps even that
 * worst case off the artwork.
 */
export const PEARL_STAR_AIR = .08;
/** Where medallion `slot` of `count` shown sits on its ellipse: one formula for the medallions and the stars between them. */
export const medallionAngle = (time: number, slot: number, count: number) => time * .105 + slot * Math.PI * 2 / count + .8;
/** The travelling beads' unit sphere, slot space; each draw scales it per instance. */
export const PEARL_BEAD_RADIUS = .024;

export type PearlMedallion = { id: number; root: T.Group; glint: T.Sprite; tint: T.Color; procedural: T.Object3D[] };

/**
 * TV page only: where the pearl halo fades to nothing, in the shader's `d` (the halo plane's
 * centre to its edge is 1.8, its corners 2.55). The study's outer ring is still about .025 at
 * the plane's edge, which the TV page's clearer air showed as a faint straight line beside the
 * main bubble; on the TV the whole halo is multiplied down to zero between these two, so it
 * is exactly zero before the plane ends.
 */
export const PEARL_HALO_TV_FADE = [1.5, 1.78] as const;

/**
 * The pearl halo's fragment. Without the TV page it is the study's, character for character
 * (the same program); on the TV page it gains the edge fade (`PEARL_HALO_TV_FADE`), which
 * changes the source, so it compiles its own program and the study's is untouched.
 */
export function pearlHaloFragment(tv = false) {
  const fade = tv ? `
          rgb*=1.-smoothstep(${PEARL_HALO_TV_FADE[0]},${PEARL_HALO_TV_FADE[1]},d);` : "";
  return `varying vec2 haloUv;uniform float time;
        void main(){float d=length(haloUv-.5)*3.6;
          // Section 7: a six second breath, so the pearl feels alive while it is being read.
          // It reads the same frozen clock as everything else, so a still frame is complete.
          float breath=.85+.15*(.5+.5*sin(time*1.0472));
          float core=pow(max(0.,1.-d/1.75),2.4);
          float outer=exp(-pow((d-1.18)*2.2,2.));
          vec3 rgb=(mix(vec3(1.,.90,.80),vec3(1.,.78,.86),smoothstep(.6,1.6,d))*core*.55+vec3(.80,.86,1.)*outer*.16)*breath;${fade}
          gl_FragColor=vec4(rgb,clamp(dot(rgb,vec3(.2126,.7152,.0722)),0.,1.));
          #include <colorspace_fragment>
        }`;
}

/** What a skin's host may ask of it beyond the kit. */
export type StudyPearlSkinOptions = {
  /** The TV page (`?view=tv`): its halo fades out before the plane's edge (`PEARL_HALO_TV_FADE`). */
  tv?: boolean;
};

export type PearlKitDressing = {
  rim?: T.Mesh;
  rimPearls?: T.Mesh;
  film?: T.Mesh;
  orbit?: T.Mesh;
  medallions?: { backs: T.InstancedMesh; orbs: T.InstancedMesh; bezels: T.InstancedMesh };
  stars?: T.InstancedMesh;
  twinkle?: StudyPearlTwinkle;
};
