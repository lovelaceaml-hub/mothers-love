import * as T from "three";

/** Deterministic authoring: cupped, rounded petals with UVs, smooth normals and a soft base tint. */
export function studyPetal(columns: number, rows: number) {
  const geometry = new T.PlaneGeometry(1, 1, columns, rows);
  const positions = geometry.getAttribute("position"), uv = geometry.getAttribute("uv");
  const colors: number[] = [];
  for (let i = 0; i < positions.count; i++) {
    const u = uv.getY(i), v = uv.getX(i) * 2 - 1;
    const span = Math.sqrt(Math.max(0, 1 - Math.pow(2 * u - 1, 2))) * (.46 + .14 * u);
    const curl = Math.pow(Math.abs(v), 3) * span * .17;
    positions.setXYZ(i, v * span, .27 * u * u - .09 * Math.sin(Math.PI * u) + curl + .014 * Math.sin(v * 7 + u * 4) * Math.sin(Math.PI * u), u);
    const light = .76 + .24 * Math.sin(Math.min(1, u * 1.7) * Math.PI / 2);
    colors.push(light, light * (.88 + .12 * u), light * (.92 + .08 * u));
  }
  geometry.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  return geometry;
}

/** Rounded stone edges retain a flat walkable top. The profile is revolved, not extruded flat. */
export function studyTerrace(top: number, bottom: number, height: number, segments = 128) {
  const b = Math.min(.11, height * .28), low = -height / 2, high = height / 2;
  const points = [new T.Vector2(0, low), new T.Vector2(bottom - b, low)];
  for (let i = 1; i <= 6; i++) {
    const a = i / 6 * Math.PI / 2;
    points.push(new T.Vector2(bottom - b + Math.sin(a) * b, low + b - Math.cos(a) * b));
  }
  points.push(new T.Vector2(top, high - b));
  for (let i = 1; i <= 6; i++) {
    const a = i / 6 * Math.PI / 2;
    points.push(new T.Vector2(top - b + Math.cos(a) * b, high - b + Math.sin(a) * b));
  }
  points.push(new T.Vector2(0, high));
  return new T.LatheGeometry(points, segments);
}

/**
 * The starting azimuth of each Sanctuary silk ribbon.
 *
 * Chosen numerically against the paused Sanctuary framing (eye -13, 12, 19 toward
 * -27, 7, -9): at the still clock every ribbon passes clear of the heart's
 * silhouette, two to each side, instead of banding across it.
 */
export const STUDY_RIBBON_PHASE = [2.6, 1.4, 6.2, 5.6] as const;

/**
 * One point on one Sanctuary silk ribbon, in the Sanctuary district's local space.
 *
 * Pure and DOM free, so the ribbon path can be proved clear of the heart in a
 * plain Node test rather than only judged from a screenshot. The smallest radius
 * the path can reach is 8.0 - .7 - .15 = 7.15 (v spans only plus or minus .5), and
 * the far corner of the heart's scaled, swaying footprint (5.3 wide by 4.2 deep) is
 * 6.76 units from the axis, so no vertex can enter it.
 */
export function studyRibbonPoint(index: number, u: number, v: number, t: number, out: T.Vector3) {
  const angle = u * Math.PI * (2.02 + index * .17) + STUDY_RIBBON_PHASE[index] + t * (.054 + index * .009);
  const width = Math.pow(Math.max(.00001, Math.sin(u * Math.PI)), .7) * (1.16 + index * .18);
  const rise = u * u * (3 - 2 * u);
  const radius = 8.0 + Math.sin(u * 5 + index) * .7;
  return out.set(
    Math.cos(angle) * (radius + v * .30),
    3.2 + 12.5 * rise + Math.sin(angle + t * .1 + index) * .85 + v * width + Math.sin(u * 37 + v * 7 + t * (.8 + index * .08)) * .08,
    Math.sin(angle) * (radius + v * .26),
  );
}
