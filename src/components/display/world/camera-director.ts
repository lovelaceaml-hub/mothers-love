import { CatmullRomCurve3, Vector3 } from "three";
import {
  ARRIVAL_VIEW,
  smoothstep,
  TOUR_ORDER,
  ZONES,
  zoneIndex,
  type ZoneId,
} from "./world-data";

export class CameraDirector {
  /**
   * How a travel is paced, from 0 at its start to 1 at its end.
   *
   * The default is the app's own `smoothstep`, which is what every path and every test of
   * this class uses; the sample-only design study swaps in a gentler curve from its own
   * module. Nothing else in this class reads it, so replacing it changes the pacing of a
   * travel and nothing whatever besides.
   */
  ease: (t: number) => number = smoothstep;
  /**
   * The reading arc: how far the camera swings round a place (radians) and how much it
   * breathes in and out (a fraction of the eye distance). The TV page narrows both so a big
   * bubble keeps its reading size; every other page keeps these defaults.
   */
  arc = { swing: 0.48, approach: 0.1 };
  readonly position = new Vector3(...ZONES[0].eye);
  readonly target = new Vector3(...ZONES[0].target);
  zone: ZoneId = "garden";
  destination: ZoneId = "garden";
  traveling = false;
  private age = 0;
  private duration = 18;
  private path?: CatmullRomCurve3;
  private lookPath?: CatmullRomCurve3;
  private special = false;
  private returning = false;
  private saved?: {
    position: Vector3;
    target: Vector3;
    zone: ZoneId;
    destination: ZoneId;
    age: number;
    duration: number;
    traveling: boolean;
    path?: CatmullRomCurve3;
    lookPath?: CatmullRomCurve3;
  };
  private playlist: ZoneId[] = [...TOUR_ORDER];
  private dwells = new Map<ZoneId, number>();

  setPlaylist(ids: readonly ZoneId[], dwells?: ReadonlyMap<ZoneId, number>) {
    this.playlist = ids.length ? [...ids] : ["garden"];
    this.dwells = new Map(dwells);
    if (this.special && this.reconcileSaved() && this.returning && this.saved)
      this.move(this.saved.position, this.saved.target, 6);
    if (!this.special && !this.playlist.includes(this.destination))
      this.visit(this.playlist[0], true);
  }
  visit(id: ZoneId, instant = false) {
    this.special = false;
    this.saved = undefined;
    this.returning = false;
    const zone = ZONES[zoneIndex(id)];
    this.destination = id;
    this.age = 0;
    if (instant) {
      this.position.fromArray(zone.eye);
      this.target.fromArray(zone.target);
      this.zone = id;
      this.traveling = false;
      return;
    }
    this.move(new Vector3(...zone.eye), new Vector3(...zone.target), 18);
  }
  private move(end: Vector3, target: Vector3, duration: number) {
    this.age = 0;
    this.duration = duration;
    const middle = this.position.clone().lerp(end, 0.5);
    middle.y = Math.max(this.position.y, end.y) + 7;
    this.path = new CatmullRomCurve3(
      [this.position.clone(), middle, end],
      false,
      "centripetal",
    );
    this.lookPath = new CatmullRomCurve3([
      this.target.clone(),
      this.target.clone().lerp(target, 0.5),
      target,
    ]);
    this.traveling = true;
  }
  beginArrival(reduced: boolean) {
    if (this.saved) return;
    this.saved = {
      position: this.position.clone(),
      target: this.target.clone(),
      zone: this.zone,
      destination: this.destination,
      age: this.age,
      duration: this.duration,
      traveling: this.traveling,
      path: this.path,
      lookPath: this.lookPath,
    };
    this.special = true;
    if (reduced) {
      this.position.fromArray(ARRIVAL_VIEW.eye);
      this.target.fromArray(ARRIVAL_VIEW.target);
      this.traveling = false;
    } else
      this.move(
        new Vector3(...ARRIVAL_VIEW.eye),
        new Vector3(...ARRIVAL_VIEW.target),
        5,
      );
  }
  endArrival(instant: boolean) {
    if (!this.saved) return;
    if (instant) {
      this.restore();
      return;
    }
    if (this.returning) return;
    this.reconcileSaved();
    this.returning = true;
    this.move(this.saved.position, this.saved.target, 6);
  }
  settleForStill() {
    if (this.special && !this.returning) {
      this.position.fromArray(ARRIVAL_VIEW.eye);
      this.target.fromArray(ARRIVAL_VIEW.target);
      this.traveling = false;
      return;
    }
    if (this.returning) this.restore();
    if (this.traveling) this.visit(this.destination, true);
  }
  private reconcileSaved() {
    const saved = this.saved;
    if (
      !saved ||
      (this.playlist.includes(saved.zone) &&
        this.playlist.includes(saved.destination))
    )
      return false;
    const id = this.playlist.includes(saved.destination)
      ? saved.destination
      : this.playlist[0];
    const zone = ZONES[zoneIndex(id)];
    this.saved = {
      position: new Vector3(...zone.eye),
      target: new Vector3(...zone.target),
      zone: id,
      destination: id,
      age: 0,
      duration: 18,
      traveling: false,
    };
    return true;
  }
  private restore() {
    this.reconcileSaved();
    if (!this.saved) return;
    const saved = this.saved;
    this.position.copy(saved.position);
    this.target.copy(saved.target);
    this.zone = saved.zone;
    this.destination = saved.destination;
    this.age = saved.age;
    this.duration = saved.duration;
    this.traveling = saved.traveling;
    this.path = saved.path;
    this.lookPath = saved.lookPath;
    this.special = false;
    this.returning = false;
    this.saved = undefined;
  }
  update(
    delta: number,
    automatic = true,
    hold = false,
    canDepart = true,
    instant = false,
  ) {
    if (hold && !this.special) return;
    this.age += Math.max(0, delta);
    if (this.traveling && this.path && this.lookPath) {
      const t = this.ease(this.age / this.duration);
      this.path.getPoint(t, this.position);
      this.lookPath.getPoint(t, this.target);
      if (this.age >= this.duration) {
        if (this.returning) {
          this.restore();
          return;
        }
        if (!this.special) this.zone = this.destination;
        this.traveling = false;
        this.age = 0;
      }
    } else if (
      !this.special &&
      automatic &&
      canDepart &&
      this.age >= (this.dwells.get(this.zone) ?? 40)
    ) {
      const next =
        this.playlist[
          (this.playlist.indexOf(this.zone) + 1) % this.playlist.length
        ];
      if (next !== this.zone) this.visit(next, instant);
      else this.age = 0;
    }
    // Fly a broad, slow arc among the world-space bubbles throughout reading.
    if (!instant && !this.special && !this.traveling) {
      const zone = ZONES[zoneIndex(this.zone)];
      const angle = Math.sin(this.age * 0.035) * this.arc.swing;
      const approach = 1 - Math.sin(this.age * 0.03) * this.arc.approach;
      const dx = zone.eye[0] - zone.target[0],
        dz = zone.eye[2] - zone.target[2];
      this.position.set(
        zone.target[0] +
          (dx * Math.cos(angle) - dz * Math.sin(angle)) * approach,
        zone.eye[1] + Math.sin(this.age * 0.045) * 1.6,
        zone.target[2] +
          (dx * Math.sin(angle) + dz * Math.cos(angle)) * approach,
      );
    }
  }
}
