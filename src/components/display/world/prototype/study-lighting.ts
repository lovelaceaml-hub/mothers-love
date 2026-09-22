import * as T from "three";

/** An authored outdoor radiance field. Linear HDR radiance goes into the existing PMREM pipeline. */
export function studyEnvironment(renderer: T.WebGLRenderer) {
  const scene = new T.Scene();
  const geometry = new T.SphereGeometry(50, 32, 16);
  const material = new T.ShaderMaterial({
    side: T.BackSide, toneMapped: false,
    uniforms: {
      zenith: { value: new T.Color("#8caecf") }, horizon: { value: new T.Color("#f6ddd1") },
      ground: { value: new T.Color("#566e63") }, sun: { value: new T.Vector3(-.5, .7, .48).normalize() },
    },
    vertexShader: "varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: `varying vec3 direction;uniform vec3 zenith,horizon,ground,sun;
      void main(){vec3 d=normalize(direction);vec3 c=mix(horizon,zenith,smoothstep(0.,.8,d.y));
        c=mix(ground*.42,c,smoothstep(-.35,.08,d.y));
        float key=pow(max(0.,dot(d,sun)),30.);float broad=pow(max(0.,dot(d,sun)),5.);
        c+=vec3(1.,.83,.62)*(key*5.+broad*.34);
        c+=vec3(.25,.36,.55)*pow(max(0.,dot(d,normalize(vec3(.7,.4,-.6)))),7.);
        gl_FragColor=vec4(c,1.);}`,
  });
  scene.add(new T.Mesh(geometry, material));
  const generator = new T.PMREMGenerator(renderer);
  const target = generator.fromScene(scene, .025, .1, 100);
  generator.dispose(); geometry.dispose(); material.dispose(); scene.clear();
  return target;
}

/** Native 4K for the explicit High study tier, with conservative Auto and Low alternatives. */
export function studyPixelRatio(width: number, height: number, dpr: number, quality: string, lowered: boolean) {
  const low = quality === "low" || (quality === "auto" && lowered);
  const budget = low ? 1_050_000 : quality === "high" ? 8_294_400 : 4_147_200;
  return Math.min(dpr || 1, 2, Math.sqrt(budget / (width * height)));
}
