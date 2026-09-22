import * as T from "three";
import { seededRandom } from "../world-data";
import { cosmosPearlPosition } from "./cosmos-motion";

/** Original animated effects, all driven by the engine's pausable scene clock. */
export function createCosmosEffects(clock: { value: number }) {
  const root = new T.Group();
  root.name = "Cosmos gold dust, flowing light and drifting petals";
  const geometries: T.BufferGeometry[] = [];
  const materials: T.Material[] = [];
  const random = seededRandom(926);
  const count = 420;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) { sizes[i] = .10 + random() * .23; seeds[i] = random(); }
  const dustGeometry = new T.BufferGeometry();
  dustGeometry.setAttribute("position", new T.BufferAttribute(positions, 3).setUsage(T.DynamicDrawUsage));
  dustGeometry.setAttribute("size", new T.BufferAttribute(sizes, 1));
  dustGeometry.setAttribute("seed", new T.BufferAttribute(seeds, 1));
  geometries.push(dustGeometry);
  const dustMaterial = new T.ShaderMaterial({
    transparent: true, depthWrite: false, toneMapped: false,
    uniforms: { time: clock },
    vertexShader: `attribute float size;attribute float seed;uniform float time;varying float strength;
      void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;
        strength=.35+.65*pow(.5+.5*sin(time*1.3+seed*60.),2.);
        gl_PointSize=clamp(size*850./max(1.,-p.z),2.,15.);}`,
    fragmentShader: `varying float strength;void main(){vec2 p=gl_PointCoord-.5;
      float core=exp(-dot(p,p)*55.);float flare=exp(-abs(p.x)*80.-abs(p.y)*12.)+exp(-abs(p.y)*80.-abs(p.x)*12.);
      float a=clamp((core+flare*.65)*strength,0.,.9);if(a<.015)discard;
      gl_FragColor=vec4(mix(vec3(.69,.36,.09),vec3(1.,.86,.47),core),a);
      #include <colorspace_fragment>
    }`,
  });
  materials.push(dustMaterial);
  const dust = new T.Points(dustGeometry, dustMaterial);
  dust.frustumCulled = false;
  root.add(dust);

  const ribbonMaterial = new T.ShaderMaterial({
    transparent: true, depthWrite: false, toneMapped: false, side: T.DoubleSide,
    uniforms: { time: clock },
    vertexShader: "varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: `varying vec2 v;uniform float time;void main(){float wave=pow(.5+.5*cos(v.x*18.-time*.42),14.);
      gl_FragColor=vec4(mix(vec3(.72,.40,.12),vec3(1.,.86,.50),wave),.08+wave*.68);
      #include <colorspace_fragment>
    }`,
  });
  materials.push(ribbonMaterial);
  for (let lane = 0; lane < 3; lane++) {
    const points = Array.from({ length: 21 }, (_, i) => {
      const u = i / 20;
      return new T.Vector3(-42 + u * 84, 3 + lane * 4 + Math.sin(u * Math.PI * 2 + lane) * 6, -14 - lane * 9 - Math.cos(u * Math.PI) * 8);
    });
    const geometry = new T.TubeGeometry(new T.CatmullRomCurve3(points), 100, .045, 4, false);
    geometries.push(geometry);
    root.add(new T.Mesh(geometry, ribbonMaterial));
  }

  const petalGeometry = new T.SphereGeometry(1, 8, 5);
  const petalMaterial = new T.MeshStandardMaterial({ color: "#d58db7", roughness: .55, side: T.DoubleSide });
  geometries.push(petalGeometry); materials.push(petalMaterial);
  const petals = new T.InstancedMesh(petalGeometry, petalMaterial, 68);
  petals.frustumCulled = false;
  root.add(petals);
  const starts = Array.from({ length: 68 }, () => ({ x: (random() - .5) * 78, y: random(), z: -8 - random() * 45, spin: random() * 6.28 }));
  const transform = new T.Object3D();

  return {
    root,
    update(time: number, portrait: boolean) {
      for (let i = 0; i < count; i++) {
        const seed = seeds[i];
        if (i < 200) {
          const age = i / 199;
          const p = cosmosPearlPosition(Math.max(0, time - age * 16), 0, portrait);
          positions[i * 3] = p[0] + Math.sin(i * 2.39 + time * .22) * (1 + age * 2.5);
          positions[i * 3 + 1] = p[1] - (portrait ? 4.6 : 6.25) * 1.08 - age * 2.2 + Math.cos(i * 1.72) * .6;
          positions[i * 3 + 2] = p[2] - .5 - age * 2 + Math.sin(i * 1.2) * .8;
        } else {
          const phase = i * 2.399;
          positions[i * 3] = Math.sin(phase) * (19 + seed * 27) + Math.sin(time * .11 + phase) * 3;
          positions[i * 3 + 1] = -5 + seed * 32 + Math.sin(time * .17 + phase) * 1.5;
          positions[i * 3 + 2] = -3 - seed * 52;
        }
      }
      dustGeometry.attributes.position.needsUpdate = true;
      starts.forEach((p, i) => {
        const life = (p.y + time * (.011 + i % 4 * .001)) % 1;
        transform.position.set(p.x + Math.sin(time * .17 + p.spin) * 4, 26 - life * 33, p.z);
        transform.rotation.set(time * .21 + p.spin, time * .13, p.spin + Math.sin(time * .4) * .7);
        const scale = Math.sin(life * Math.PI) * .24;
        transform.scale.set(scale, scale * .25, scale * .62);
        transform.updateMatrix(); petals.setMatrixAt(i, transform.matrix);
      });
      petals.instanceMatrix.needsUpdate = true;
    },
    dispose() { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); petals.dispose(); root.clear(); },
  };
}
