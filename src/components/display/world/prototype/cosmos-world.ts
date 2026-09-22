import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { WorldScene } from "../world-scene-legacy";
import { seededRandom } from "../world-data";
import { softDot, sparklePoints } from "./study-materials";
import { COSMOS_CENTER } from "./cosmos-mode";
import { createCosmosEffects } from "./cosmos-effects";

/** One composed, live-rendered prototype. Records and text remain in the existing engine. */
export function createCosmosWorld(): WorldScene {
  const scene = new T.Scene();
  scene.name = "Expression Cosmos, pearl atelier";
  scene.background = new T.Color("#e9e3ec");
  scene.fog = new T.Fog("#e9e3ec", 70, 280);
  scene.userData.prototypeSceneryReady = false;
  const base = new T.Group(); base.position.fromArray(COSMOS_CENTER); scene.add(base);
  const geometry = new Set<T.BufferGeometry>(), materials = new Set<T.Material>(), textures = new Set<T.Texture>();
  const time = { value: 0 }, clouds: Array<{ object: T.Object3D; x: number; phase: number }> = [];
  let disposed = false, effects = true;
  const keep = <G extends T.BufferGeometry>(g: G) => { geometry.add(g); return g; };
  const paint = <M extends T.Material>(m: M) => { materials.add(m); return m; };
  const random = seededRandom(2641);
  const atmosphere = createCosmosEffects(time); base.add(atmosphere.root);
  const invalidate = () => { if (!disposed) scene.userData.invalidate?.(); };

  scene.add(new T.HemisphereLight("#dae7ff", "#a396ae", .72));
  const sun = new T.DirectionalLight("#fff0d8", 2.1);
  sun.position.set(-65, 95, -25); sun.target.position.fromArray(COSMOS_CENTER);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = sun.shadow.camera.bottom = -37;
  sun.shadow.camera.right = sun.shadow.camera.top = 37;
  sun.shadow.camera.far = 220; sun.shadow.normalBias = .055; sun.shadow.bias = -.00015;
  sun.shadow.intensity = .48; scene.add(sun, sun.target);
  const fill = new T.DirectionalLight("#cbdcff", .48); fill.position.set(55, 55, -15); scene.add(fill);
  const rim = new T.DirectionalLight("#ffd9e5", .82); rim.position.set(-15, 55, -190); scene.add(rim);

  const skyMaterial = paint(new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, fog: false,
    uniforms: { time },
    vertexShader: "varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: `varying vec3 p;uniform float time;
      float hash(vec2 q){return fract(sin(dot(q,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 q){vec2 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
      void main(){vec3 d=normalize(p);float h=smoothstep(-.15,.65,d.y);
        vec3 c=mix(vec3(.87,.77,.84),vec3(.43,.58,.76),h);
        float glow=pow(max(dot(d,normalize(vec3(-.65,.24,-.65))),0.),12.);
        c=mix(c,vec3(1.,.86,.73),glow*.74);
        vec2 q=vec2(atan(d.z,d.x)*7.,d.y*11.)+vec2(time*.002,0.);
        float cloud=noise(q)*.55+noise(q*2.1)*.27+noise(q*4.2)*.14;
        c=mix(c,vec3(.98,.90,.92),smoothstep(.48,.77,cloud)*.28);
        gl_FragColor=vec4(c,1.);
        #include <colorspace_fragment>
      }`,
  }));
  const sky = new T.Mesh(keep(new T.SphereGeometry(390, 32, 20)), skyMaterial);
  sky.renderOrder = -100; base.add(sky);

  const water = paint(new T.MeshPhysicalMaterial({ color: "#509dbb", emissive: "#4398b0", emissiveIntensity: .10, roughness: .17, metalness: .12, clearcoat: .8, clearcoatRoughness: .18, dithering: true }));
  water.onBeforeCompile = shader => {
    shader.uniforms.atelierTime = time;
    shader.vertexShader = "varying vec3 waterPosition;\n" + shader.vertexShader.replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nwaterPosition=(modelMatrix*vec4(position,1.)).xyz;");
    shader.fragmentShader = "varying vec3 waterPosition;uniform float atelierTime;\n" + shader.fragmentShader.replace("#include <normal_fragment_begin>", `#include <normal_fragment_begin>
      vec2 q=waterPosition.xz;float dx=.045*cos(q.x*.37+q.y*.12+atelierTime*.27)+.019*cos(q.x*.83-q.y*.37-atelierTime*.19);
      float dz=.032*cos(q.y*.42-q.x*.19-atelierTime*.21)+.012*sin(q.x*.55+q.y*.66+atelierTime*.13);
      normal=normalize(mat3(viewMatrix)*vec3(-dx,1.,-dz));`);
  };
  water.customProgramCacheKey = () => "cosmos-water-v1";
  const sea = new T.Mesh(keep(new T.CircleGeometry(310, 96)), water); sea.rotation.x = -Math.PI/2; sea.position.set(0,-15,-60); base.add(sea);

  const waterfall = paint(new T.ShaderMaterial({
    side: T.DoubleSide, transparent: true, depthWrite: false, uniforms: { time },
    vertexShader: "varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: `varying vec2 v;uniform float time;void main(){float edge=pow(sin(v.x*3.14159),.6);float threads=.5+.5*sin(v.x*175.+sin(v.x*32.)*3.);float flow=.7+.3*sin(v.y*64.+time*1.2+v.x*4.);float a=edge*(.17+.30*threads*flow)*smoothstep(0.,.18,v.y);gl_FragColor=vec4(.90,.98,1.,a);}`,
  }));
  const fallGeometry=keep(new T.PlaneGeometry(1,1,3,12));
  function addFall(x:number,y:number,z:number,width:number,length:number) {
    const mesh=new T.Mesh(fallGeometry,waterfall);mesh.position.set(x,y-length/2,z);mesh.scale.set(width,length,1);base.add(mesh);
  }

  // Distant glints catch the light on the water without covering the reading surface.
  const sparkGeometry=keep(new T.BufferGeometry()), count=200;
  const positions=new Float32Array(count*3), phases=new Float32Array(count);
  for(let i=0;i<count;i++){positions[i*3]=(random()-.5)*110;positions[i*3+1]=-9+random()*35;positions[i*3+2]=-80+random()*115;phases[i]=random();}
  sparkGeometry.setAttribute("position",new T.BufferAttribute(positions,3));sparkGeometry.setAttribute("phase",new T.BufferAttribute(phases,1));
  const dot=softDot(64);textures.add(dot);
  const sparks=new T.Points(sparkGeometry,paint(sparklePoints(time,.20,"#fff4d4",.75,dot)));sparks.frustumCulled=false;base.add(sparks);

  const kitRoot=new T.Group();kitRoot.name="Authored Blender scenery";base.add(kitRoot);
  // A quiet terrace is visible during loading; failure never removes the readable pearl.
  const loadingMaterial=paint(new T.MeshStandardMaterial({color:"#f5e6dc",roughness:.5}));
  const loading=new T.Mesh(keep(new T.CylinderGeometry(18,18.4,.55,96)),loadingMaterial);loading.position.y=.25;base.add(loading);
  new GLTFLoader().load("/world-prototype/atelier/pearl-atelier.glb", gltf => {
    const assetGeometry=new Set<T.BufferGeometry>(),assetMaterials=new Set<T.Material>();
    gltf.scene.traverse(o=>{if(o instanceof T.Mesh){assetGeometry.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>assetMaterials.add(m));}});
    if(disposed){assetGeometry.forEach(g=>g.dispose());assetMaterials.forEach(m=>m.dispose());return;}
    assetGeometry.forEach(g=>geometry.add(g));assetMaterials.forEach(m=>materials.add(m));
    function place(name:string,parent:T.Object3D,p:number[],size=1,rotation=0) {
      const source=gltf.scene.getObjectByName(name);
      if(!source)throw new Error(`Missing authored asset ${name}`);
      const object=source.clone(true);object.position.set(p[0],p[1],p[2]);object.scale.setScalar(size);object.rotation.y=rotation;
      object.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=name.includes("Blossom")||name.includes("Arcade");o.receiveShadow=true;}});
      parent.add(object);return object;
    }
    try {
      place("ML_Terrace",kitRoot,[0,0,1],1.65);
      place("ML_Island",kitRoot,[0,.12,1],1.65);
      // A broad promenade and foliage at different depths frame the pearl without crossing it.
      place("ML_Blossom_Rose",kitRoot,[-15,.99,7],1.40,-.5);
      place("ML_Blossom_Lavender",kitRoot,[17,1.00,4],1.25,.8);
      place("ML_Blossom_Rose",kitRoot,[-14,.99,-7],.80,1.1);
      place("ML_FlowerBed",kitRoot,[-11,1,10],1.8);
      place("ML_FlowerBed",kitRoot,[12,1,10],1.7,.4);
      place("ML_Arcade",kitRoot,[-24,-.4,-12],1.15,.28);
      const islands=[[-31,8,-41,1.05,.35],[36,15,-66,1.28,-.38],[2,28,-115,1.15,.08],[-64,18,-112,.87,.3],[69,-1,-117,1.45,-.18],[-59,-6,-35,.8,.2]];
      islands.forEach(([x,y,z,size,rotation],i)=>{
        const root=new T.Group();root.position.set(x,y,z);root.rotation.y=rotation;root.scale.setScalar(size);kitRoot.add(root);
        place("ML_Island",root,[0,0,0]);place("ML_Terrace",root,[0,0,0]);
        place("ML_Arcade",root,[0,.62,-3],.78);
        place(i%2?"ML_Blossom_Lavender":"ML_Blossom_Rose",root,[-7,.64,0],.83,.4);
        place("ML_Blossom_Rose",root,[7,.64,-2],.66,-.2);
        addFall(x-3,y+.5,z+10*size,2.6*size,Math.max(10,y+15));
        addFall(x-.5,y+.5,z+10*size,.75*size,Math.max(10,y+15));
      });
      const cloudPlaces=[[-27,-8,12,2.2],[28,-8,8,2.1],[-52,6,-56,1.65],[50,17,-100,2.8],[0,31,-135,3.1],[-64,30,-160,3.3],[70,2,-38,2.8]];
      cloudPlaces.forEach(([x,y,z,s],i)=>{const object=place("ML_Cloudbank",kitRoot,[x,y,z],s);clouds.push({object,x,phase:i*1.8});});
      loading.visible=false;scene.userData.prototypeSceneryReady=true;invalidate();
    } catch(error) {
      kitRoot.clear();scene.userData.prototypeSceneryError="The scenery did not load.";console.error("Cosmos scenery",error);invalidate();
    }
  },undefined,()=>{if(!disposed){scene.userData.prototypeSceneryError="The scenery did not load.";invalidate();}});

  return {
    scene,anchors:[],recognitionPearls:[],
    setRecognitions(){ /* The world-space recognition manager owns every record. */ },
    setEffects(s){effects=s;},
    update(t){time.value=t;sparks.visible=effects;atmosphere.root.visible=effects;atmosphere.update(t,scene.userData.cosmosPortrait===true);clouds.forEach(c=>{c.object.position.x=c.x+Math.sin(t*.018+c.phase)*.65;});},
    dispose(){disposed=true;atmosphere.dispose();geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());sun.shadow.map?.dispose();scene.clear();},
  };
}
