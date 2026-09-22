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
