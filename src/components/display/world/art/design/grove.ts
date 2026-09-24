import * as T from "three";
import { WORLD_EXPRESSIONS } from "../../world-data";
import type { DesignWorldBase } from "./base";
import type { ZoneId } from "../../world-data";

/** The Grove of expressions: nine columns carrying the canonical icons. */
export function designGrove({ geometry, bead, material, instance, gold, mesh, cylinder, ivory, ring, texture, tint, motions, stamp }: DesignWorldBase, { districtRoots, invalidate }: { districtRoots: Map<ZoneId, T.Group>; invalidate: () => void }) {
  // Canonical expression artwork remains recognizable and retains its original meaning.
  //
  // Section 8: the nine surrounds become one instanced draw and the nine gold rims another,
  // in place of eighteen. The surround colour moves onto a per instance colour, so one shared
  // material serves all nine; three only multiplies an instance colour into the fragment when
  // the material declares `vertexColors`, which needs a colour attribute on the geometry, so
  // the shared sphere is cloned with a white one. The nine icon discs keep their own draw,
  // because each carries its own artwork.
  const grove = districtRoots.get("expressions")!;
  const groveBead = geometry(bead.clone());
  groveBead.setAttribute("color", new T.Float32BufferAttribute(new Float32Array(groveBead.getAttribute("position").count * 3).fill(1), 3));
  const groveSurround = material(new T.MeshPhysicalMaterial({ vertexColors: true, metalness: .12, roughness: .25, clearcoat: .8 }));
  const groveRim = geometry(new T.TorusGeometry(1.18, .022, 6, 64));
  const groveIcon = geometry(new T.CircleGeometry(.96, 48));
  const groveSurrounds = instance(grove, groveBead, groveSurround, WORLD_EXPRESSIONS.length);
  const groveRims = instance(grove, groveRim, gold, WORLD_EXPRESSIONS.length);
  groveSurrounds.name = "Study grove surrounds"; groveRims.name = "Study grove rims";
  // The material sweep at the end of this builder skips instanced meshes, so the rims join
  // the glow layer here instead, exactly where the nine separate toruses used to be put.
  groveRims.layers.enable(1);
  const groveSpin = new T.Euler(0, .48, 0), groveAt = new T.Vector3();
  const groveSites: Array<{ x: number; z: number; group: T.Group; column: T.Mesh }> = [];
  WORLD_EXPRESSIONS.forEach((expression,i)=>{
    const a=-Math.PI*.9+i/8*Math.PI*1.6, x=Math.cos(a)*10.5,z=Math.sin(a)*9.3;
    const column=mesh(grove,cylinder,ivory,[x,2.8,z],[.48,4.25,.48]);ring(grove,3.7,.71,.015);
    const group=new T.Group();group.position.set(x,5.15,z);group.rotation.y=.48;grove.add(group);
    const map=texture(new T.TextureLoader().load(`/home-art/icon${expression.id}.webp`,invalidate));map.colorSpace=T.SRGBColorSpace;
    const iconMat=material(new T.MeshBasicMaterial({map,transparent:true,toneMapped:false,side:T.DoubleSide}));
    mesh(group,groveIcon,iconMat,[0,0,.37]);group.userData.dynamic=true;
    groveSurrounds.setColorAt(i, tint.set(expression.color).lerp(new T.Color("#fff0e5"), .66));
    groveSites.push({ x, z, group, column });
  });
  if (groveSurrounds.instanceColor) groveSurrounds.instanceColor.needsUpdate = true;
  let groveBounded = false;
  motions.push(t=>{
    groveSites.forEach((site,i)=>{
      const y = 5.15 + Math.sin(t * .23 + i) * .15;
      site.group.position.y = y;
      groveAt.set(site.x, y, site.z);
      stamp(groveSurrounds, i, groveAt, [1.08, 1.08, .35], groveSpin);
      stamp(groveRims, i, groveAt, [1, 1, 1], groveSpin);
    });
    groveSurrounds.instanceMatrix.needsUpdate = true;
    groveRims.instanceMatrix.needsUpdate = true;
    // Bounded once, from the authored places. Each bead only breathes .15 either side of
    // them, which is well inside the radius the beads themselves already add to the sphere.
    if (!groveBounded) { groveBounded = true; groveSurrounds.computeBoundingSphere(); groveRims.computeBoundingSphere(); }
  });
  return { grove, groveSites };
}
