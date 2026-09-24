import * as T from "three";
import { ZONES } from "../../world-data";
import type { DesignWorldBase } from "./base";
import type { ZoneId } from "../../world-data";
import type { DesignKitDistrict } from "../design-world-types";
import type { DesignBuilders } from "./builders";

/** Each smaller district's own procedural landmark. */
export function designDistrictLandmarks({ material, mesh, geometry, gold, ring, ivory, petal, rose, cylinder }: DesignWorldBase, { districtRoots, districts, waterfall, arch, archRecord }: Pick<DesignBuilders, "waterfall" | "arch" | "archRecord"> & { districtRoots: Map<ZoneId, T.Group>; districts: Map<ZoneId, DesignKitDistrict> }) {
  // Distinct distant landmarks keep every destination legible throughout a continuous tour.
  // Every piece is also recorded on its district, so a kit builder can replace it in place.
  for (const zone of ZONES.slice(3)) {
    const root=districtRoots.get(zone.id)!, piece=districts.get(zone.id)!.landmark;
    const keep=<O extends T.Object3D>(o:O)=>{piece.push(o);return o;};
    if(zone.id==="peacemakers"||zone.id==="status"){
      const globeMat=material(new T.MeshPhysicalMaterial({color:zone.id==="peacemakers"?"#91c9c5":"#b0bcdd",roughness:.2,metalness:.17,transparent:true,opacity:.68,depthWrite:false}));
      const globe=keep(mesh(root,geometry(new T.SphereGeometry(4,48,32)),globeMat,[0,7,0]));
      for(let k=0;k<5;k++){const r=keep(mesh(root,geometry(new T.TorusGeometry(4.06,.024,6,72)),gold,[0,7,0]));r.rotation.y=k*Math.PI/5;}
      for(let k=-2;k<=2;k++){const y=k*1.2, r=keep(ring(root,Math.sqrt(16-y*y),7+y,.022));r.position.z=.01;}
      globe.userData.dynamic=true;
    }else if(zone.id==="milestone"){
      for(let k=0;k<5;k++){keep(mesh(root,geometry(new T.CylinderGeometry(6-k,6.3-k,.4,64)),ivory,[0,1+k*1.6,0]));keep(ring(root,6-k,1.22+k*1.6));districts.get(zone.id)!.falls.push(keep(waterfall(root,0,5-k,3.8,3.2-k*.4,0)));}
    }else if(zone.id==="orbit"){
      // Three rings, not four: with the pearl's own lanes standing down here (Plan 26 K1 visual
      // review), the constellation reads as one orbit instead of a scribble round the words.
      for(let k=0;k<3;k++){const orbit=keep(mesh(root,geometry(new T.TorusGeometry(5+k*.7,.035,6,96)),gold,[0,7,0]));orbit.rotation.set(k*.55,.4+k*.37,0);}
    }else if(zone.id==="calendar"){
      for(let k=0;k<7;k++)keep(mesh(root,geometry(new T.BoxGeometry(1.5,.45+(k%3)*.25,1.5)),ivory,[(k-3)*2.3,1.1,0]));
    }else if(zone.id==="welcome"){
      const portal=keep(arch(root,0,.6,0,9.5,13));portal.rotation.y=.45;
      districts.get(zone.id)!.arches.push(archRecord(portal,9.5,13));
      for(let side=-1;side<=1;side+=2){const wing=mesh(portal,petal,rose,[side*.25,11,0],[3.5,4.2,3.5]);wing.rotation.set(Math.PI/2,side*.7,side*.65);}
    }else if(zone.id==="featured"){
      for(let k=0;k<5;k++){const a=k/5*Math.PI*2;const ring5=keep(arch(root,Math.cos(a)*7,.6,Math.sin(a)*7,5,10));ring5.rotation.y=-a-Math.PI/2;districts.get(zone.id)!.arches.push(archRecord(ring5,5,10));}
    }else if(zone.id==="live-feed"){
      for(let k=0;k<6;k++){const a=k*.72;keep(mesh(root,cylinder,ivory,[Math.cos(a)*8,1+k*.22,Math.sin(a)*6],[1.5,.3,1.5]));}
    }else if(zone.id==="practice"||zone.id==="promise"){
      for(const s of [-1,1])keep(mesh(root,geometry(new T.BoxGeometry(4.2,.32,1.15)),ivory,[s*5,1.45,1]));
    }
  }
}
