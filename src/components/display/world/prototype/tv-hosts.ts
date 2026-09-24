import * as T from "three";
import type { ArrivalPhase } from "../arrival-director";

/*
 * Peace and Joy, the lamb hosts of the TV page (PLAN-01 Section 5, step 8).
 *
 * Until the lamb files are merged into 3D Studio `main` and synced into the web kit, the page
 * builds against a placeholder: two pastel spheres with wings, behind `HOSTS_READY = false`.
 * The placeholder follows the lamb contract's choreography, so swapping in the rigged lambs
 * changes the bodies and not the behaviour: they fly just ahead of the camera, carry a new
 * recognition in while the lotus blooms, and present it during the hold.
 */

/** Flip once `peace.glb` and `joy.glb` are in 3D Studio `main` and synced to the web kit. */
export const HOSTS_READY = false;

export type HostClip = "fly_idle" | "fly_forward" | "carry_bubble" | "present_bubble";
/** The lamb contract's clip for each moment of the tour. */
export function hostClipFor(phase: ArrivalPhase, traveling: boolean): HostClip {
  if (phase === "approach" || phase === "reveal" || phase === "settle") return "carry_bubble";
  if (phase === "reading") return "present_bubble";
  if (phase === "return" || traveling) return "fly_forward";
  return "fly_idle";
}

export type HostFrame = {
  time: number;
  dt: number;
  camera: T.PerspectiveCamera;
  phase: ArrivalPhase;
  traveling: boolean;
  /** The arriving bubble, while there is one. */
  bubble?: { position: T.Vector3; radius: number };
  still: boolean;
};

/** Where the two hosts wait in the tour view: the bottom right corner, which the bubbles keep clear. */
const AHEAD = { distance: 10, ndc: [[0.84, -0.74], [0.94, -0.63]] as const };

type Host = { root: T.Group; body: T.Mesh; wings: T.Mesh[]; clip: HostClip; target: T.Vector3 };

export class TvHosts {
  readonly root = new T.Group();
  private readonly hosts: Host[] = [];
  private readonly disposables: Array<{ dispose(): void }> = [];
  private readonly scratch = new T.Vector3();
  private readonly right = new T.Vector3();
  private readonly up = new T.Vector3();
  private placed = false;
  constructor(scene: T.Scene) {
    this.root.name = "TV hosts (placeholder: Peace and Joy)";
    scene.add(this.root);
    const body = new T.SphereGeometry(0.34, 32, 20);
    const wing = new T.SphereGeometry(0.3, 20, 12);
    wing.scale(1, 0.42, 0.14);
    wing.translate(0.3, 0.05, 0);
    this.disposables.push(body, wing);
    const wingMaterial = new T.MeshPhysicalMaterial({
      color: "#ffffff", roughness: 0.35, sheen: 0.8, sheenColor: new T.Color("#fff0f6"),
      transparent: true, opacity: 0.92, side: T.DoubleSide,
    });
    this.disposables.push(wingMaterial);
    for (const [name, color] of [["Peace", "#b7ccff"], ["Joy", "#ffb3cd"]] as const) {
      const material = new T.MeshPhysicalMaterial({
        color, roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.2, sheen: 0.5, sheenColor: new T.Color("#ffffff"),
        emissive: new T.Color(color), emissiveIntensity: 0.3,
      });
      this.disposables.push(material);
      const root = new T.Group();
      root.name = `host ${name}`;
      const mesh = new T.Mesh(body, material);
      const wings = [1, -1].map((side) => {
        const item = new T.Mesh(wing, wingMaterial);
        item.scale.x = side;
        item.position.set(side * 0.12, 0.08, -0.08);
        root.add(item);
        return item;
      });
      root.add(mesh);
      this.root.add(root);
      this.hosts.push({ root, body: mesh, wings, clip: "fly_idle", target: new T.Vector3() });
    }
  }
  /** Test and status seam: each host's current clip. */
  clips(): HostClip[] {
    return this.hosts.map((host) => host.clip);
  }
  update(frame: HostFrame) {
    const { camera, time, bubble } = frame;
    camera.updateMatrixWorld();
    this.right.setFromMatrixColumn(camera.matrixWorld, 0);
    this.up.setFromMatrixColumn(camera.matrixWorld, 1);
    const clip = hostClipFor(frame.phase, frame.traveling);
    this.hosts.forEach((host, i) => {
      host.clip = clip;
      const side = i ? 1 : -1;
      if (bubble && (clip === "carry_bubble" || clip === "present_bubble")) {
        // Carrying: under the bubble's lower rim, holding it up. Presenting: either side of it.
        const carry = clip === "carry_bubble";
        host.target.copy(bubble.position)
          .addScaledVector(this.right, side * bubble.radius * (carry ? 0.55 : 1.12))
          .addScaledVector(this.up, -bubble.radius * (carry ? 0.95 : 0.35))
          // A little toward the camera, so the bubble's glass never hides them.
          .addScaledVector(this.scratch.subVectors(camera.position, bubble.position).normalize(), bubble.radius * 0.4);
      } else {
        const [x, y] = AHEAD.ndc[i];
        this.scratch.set(x, y, 0.5).unproject(camera).sub(camera.position).normalize();
        host.target.copy(camera.position).addScaledVector(this.scratch, AHEAD.distance);
      }
      // Glide toward the target; a still frame, or the first frame, lands on it.
      const ease = frame.still || !this.placed ? 1 : 1 - Math.exp(-frame.dt * 2.2);
      host.root.position.lerp(host.target, ease);
      const bob = frame.still ? 0 : Math.sin(time * 2.9 + i * 1.7) * 0.06;
      host.root.position.addScaledVector(this.up, bob);
      host.root.quaternion.copy(camera.quaternion);
      // Presenting: a small bow toward the bubble. Flying: wings beat.
      host.root.rotateZ(clip === "present_bubble" ? side * 0.25 : 0);
      const beat = frame.still ? 0.3 : Math.sin(time * (clip === "fly_forward" ? 11 : 7.5) + i) * 0.55;
      host.wings.forEach((wing, w) => { wing.rotation.y = (w ? -1 : 1) * (0.35 + beat); });
      const scale = bubble && clip !== "fly_idle" && clip !== "fly_forward" ? Math.max(1, bubble.radius * 0.34) : 1;
      host.root.scale.setScalar(scale);
    });
    this.placed = true;
  }
  set visible(value: boolean) {
    this.root.visible = value;
  }
  dispose() {
    this.root.removeFromParent();
    this.disposables.forEach((item) => item.dispose());
  }
}
