import * as T from "three";

/**
 * Small study material helpers. Nothing here touches the DOM at module level,
 * so the modules import cleanly in Node for the pure tests.
 */

/**
 * A cheap fresnel rim, the fake glow the study is allowed to use.
 * It chains any hook the material already carries and keeps a distinct program key,
 * so two materials with different rims never share a compiled program.
 */
export function studyRim<M extends T.Material>(target: M, hex: string, power: number, strength: number) {
  const previousCompile = target.onBeforeCompile.bind(target);
  // Snapshot the previous key now: the default key reads onBeforeCompile, which is replaced below.
  const previousKey = target.customProgramCacheKey();
  const color = new T.Color(hex);
  const key = `study-rim-${hex}-${power}-${strength}`;
  target.onBeforeCompile = (shader, renderer) => {
    previousCompile(shader, renderer);
    shader.uniforms.studyRimColor = { value: color };
    shader.fragmentShader = "uniform vec3 studyRimColor;\n" + shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `outgoingLight += studyRimColor * pow(1.0 - saturate(dot(normalize(normal), normalize(vViewPosition))), ${power.toFixed(2)}) * ${strength.toFixed(3)};
#include <opaque_fragment>`,
    );
  };
  target.customProgramCacheKey = () => `${previousKey}|${key}`;
  return target;
}

/** A soft round dot built from plain bytes. No canvas, so it works anywhere the module loads. */
export function softDot(size = 32) {
  const data = new Uint8Array(size * size * 4), radius = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const distance = Math.sqrt((x - radius) * (x - radius) + (y - radius) * (y - radius));
      data[i] = data[i + 1] = data[i + 2] = 255;
      data[i + 3] = Math.round(Math.pow(Math.max(0, 1 - distance / radius), 1.7) * 255);
    }
  }
  const map = new T.DataTexture(data, size, size, T.RGBAFormat);
  map.colorSpace = T.SRGBColorSpace;
  map.magFilter = map.minFilter = T.LinearFilter;
  map.needsUpdate = true;
  return map;
}

/**
 * Glowing sparkle dots that breathe out of step with each other.
 * PointsMaterial keeps the renderer supplied size attenuation uniform, which a
 * raw ShaderMaterial would lose.
 */
export function sparklePoints(clock: { value: number }, size: number, color: string, opacity: number, map: T.Texture) {
  const dots = new T.PointsMaterial({
    size, sizeAttenuation: true, map, color: new T.Color(color),
    transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  dots.onBeforeCompile = shader => {
    shader.uniforms.pearlTime = clock;
    shader.vertexShader = "attribute float phase;\nuniform float pearlTime;\nvarying float twinkle;\n" + shader.vertexShader.replace(
      "gl_PointSize = size;",
      `twinkle = .35 + .65 * pow(.5 + .5 * sin(pearlTime * 1.6 + phase * 6.2832), 2.);
gl_PointSize = size * (.6 + .4 * twinkle);`,
    );
    shader.fragmentShader = "varying float twinkle;\n" + shader.fragmentShader.replace(
      "vec4 diffuseColor = vec4( diffuse, opacity );",
      "vec4 diffuseColor = vec4( diffuse, opacity ) * twinkle;",
    );
  };
  dots.customProgramCacheKey = () => "study-sparkle-v1";
  return dots;
}
