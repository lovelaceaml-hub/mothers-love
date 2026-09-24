import * as T from "three";
import type { DesignWorldBase } from "./base";
import type { ZoneId } from "../../world-data";
import type { DesignKitDistrict } from "../design-world-types";
import type { DesignBuilders } from "./builders";

/** The miniature figures in the three large districts. */
export function designFigures({ material, geometry, mesh, bead, cylinder }: DesignWorldBase, { contact, districtRoots, districts }: Pick<DesignBuilders, "contact"> & { districtRoots: Map<ZoneId, T.Group>; districts: Map<ZoneId, DesignKitDistrict> }) {
  // A few quiet, miniature figures provide scale without covering the scenery with labels.
  //
  // Section 8: one skin, one hair, one dress per colour and one body lathe, shared by every
  // figure instead of rebuilt per figure. The static batcher groups by material identity, so
  // sharing collapses each district's six little merged meshes into four, and the six
  // identical lathes and twelve identical capsules are built once.
  const figureSkin = material(new T.MeshStandardMaterial({color:"#deb995",roughness:.8}));
  const figureHair = material(new T.MeshStandardMaterial({color:"#594339",roughness:.9}));
  const figureDresses = new Map<string, T.MeshStandardMaterial>();
  const figureBody = geometry(new T.LatheGeometry(new T.SplineCurve([new T.Vector2(.35,0),new T.Vector2(.37,.05),new T.Vector2(.29,.4),new T.Vector2(.23,.76),new T.Vector2(.25,.92),new T.Vector2(.12,1.02)]).getPoints(22),32));
  const figureArm = geometry(new T.CapsuleGeometry(.087,.44,5,12));
  figureSkin.name="figure skin";figureHair.name="figure hair";
  function figure(parent:T.Object3D,x:number,z:number,color:string){
    const root=new T.Group();root.position.set(x,.72,z);parent.add(root);
    let dress=figureDresses.get(color);
    if(!dress){dress=material(new T.MeshStandardMaterial({color,roughness:.8}));dress.name=`figure dress ${color}`;figureDresses.set(color,dress);}
    mesh(root,figureBody,dress,[0,.35,0]);mesh(root,bead,figureSkin,[0,1.65,0],[.33,.35,.32]);mesh(root,bead,figureHair,[0,1.8,-.035],[.34,.24,.32]);
    for(const side of [-1,1]){const arm=mesh(root,figureArm,dress,[side*.29,1.00,.03]);arm.rotation.z=side*.20;mesh(root,bead,figureSkin,[side*.35,.71,.03],[.09,.1,.09]);}
    for(const s of [-1,1]){mesh(root,cylinder,figureSkin,[s*.17,.28,0],[.085,.42,.085]);mesh(root,bead,figureHair,[s*.17,.065,.08],[.11,.07,.19]);}contact(parent,x,z,1.5,.85);
    return root;
  }
  for(const id of ["garden","heart","expressions"] as const){const root=districtRoots.get(id)!,figures=districts.get(id)!.figures;figures.push(figure(root,-5,8,"#d788a9"));figures.push(figure(root,-3.8,8.5,"#a79ac9"));}
}
