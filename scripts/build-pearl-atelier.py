"""Author the local, non-personal pearl-world kit in a fresh Blender process.

Run with Blender --background --factory-startup --python this_file -- output_dir.
The GLB is geometry for the live browser scene. No image replaces the world.
"""
import bpy
import math
import random
import json
import sys
from pathlib import Path
from mathutils import Vector

OUT = Path(sys.argv[sys.argv.index('--') + 1]).resolve()
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
random.seed(26)
petal_batches = {}


def linear(v):
    return v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4


def mat(name, color, rough=.45, metal=0, coat=0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    rgb = tuple(linear(int(color[i:i+2], 16) / 255) for i in (1, 3, 5))
    p.inputs['Base Color'].default_value = (*rgb, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    p.inputs['Coat Weight'].default_value = coat
    m.diffuse_color = (*rgb, 1)
    return m


ivory = mat('Porcelain | warm ivory', '#fff5e7', .31, .025, .28)
cream = mat('Porcelain | cream edge', '#e5d8d0', .44)
gold = mat('Metal | champagne inlay', '#dabb79', .24, .78)
cliff = mat('Stone | cool celadon', '#a5bdbe', .87)
cliffLight = mat('Stone | pale mineral', '#c9d4cf', .81)
bark = mat('Bark | rose umber', '#8d7378', .83)
leaves = mat('Leaf | sage', '#8cb8a5', .72)
rose = [mat('Blossom | rose '+str(i), c, .65) for i, c in enumerate(['#efb5cd', '#f8d6dc', '#dfa1c9', '#ffe9e4'])]
lavender = [mat('Blossom | lavender '+str(i), c, .65) for i, c in enumerate(['#c4b0dc', '#e2c5e5', '#b39acb', '#f0ddec'])]
cloudMats = [mat('Cloud | '+str(i), c, .91) for i, c in enumerate(['#ffebe9', '#eee0ee', '#f7eff4'])]


def root(name):
    ob = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(ob)
    return ob


def mesh(name, verts, faces, material, parent, smooth=True):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    ob = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(ob)
    ob.parent = parent
    ob.data.materials.append(material)
    for poly in ob.data.polygons:
        poly.use_smooth = smooth
    return ob


def curve(name, points, radius, material, parent, radii=None):
    data = bpy.data.curves.new(name, 'CURVE')
    data.dimensions = '3D'
    data.resolution_u = 6
    data.bevel_depth = radius
    data.bevel_resolution = 3
    spline = data.splines.new('BEZIER')
    spline.bezier_points.add(len(points)-1)
    for i, (point, co) in enumerate(zip(spline.bezier_points, points)):
        point.co = co
        point.handle_left_type = point.handle_right_type = 'AUTO'
        point.radius = radii[i] if radii else 1
    ob = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(ob)
    ob.parent = parent
    ob.data.materials.append(material)
    return ob


def lathe(name, profile, material, parent, segments=128, scallop=0):
    verts, faces = [], []
    for r, z in profile:
        for j in range(segments):
            a = j * math.tau / segments
            radius = r * (1 + scallop * math.sin(7*a+.4) + scallop*.45*math.sin(11*a))
            verts.append((radius*math.cos(a), radius*math.sin(a), z))
    for i in range(len(profile)-1):
        for j in range(segments):
            a = i*segments+j
            b = i*segments+(j+1)%segments
            faces.append((a,b,b+segments,a+segments))
    return mesh(name, verts, faces, material, parent)


def torus(name, radius, z, tube, material, parent, arc=math.tau):
    pts = [(radius*math.cos(i*arc/80),radius*math.sin(i*arc/80),z) for i in range(81)]
    return curve(name, pts, tube, material, parent)


def sphere(name, p, scale, material, parent, segments=16, rings=10, noise=0):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=p)
    ob = bpy.context.object
    ob.name = name
    ob.parent = parent
    for v in ob.data.vertices:
        n = 1 + noise*math.sin(v.co.x*13+v.co.z*7)*math.sin(v.co.y*9+v.co.z*5)
        v.co *= n
    ob.scale = scale
    ob.data.materials.append(material)
    for poly in ob.data.polygons:
        poly.use_smooth = True
    return ob


def box(name, p, scale, material, parent, bevel=.06):
    bpy.ops.mesh.primitive_cube_add(size=1, location=p)
    ob = bpy.context.object
    ob.name = name
    ob.parent = parent
    ob.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(material)
    mod = ob.modifiers.new('Soft hand-finished edges', 'BEVEL')
    mod.width = bevel
    mod.segments = 3
    return ob


def petal(name, length, width, cup, material, parent, p=(0,0,0), angle=0, normal=(0,0,1)):
    verts, faces = [], []
    orientation = Vector((0,0,1)).rotation_difference(Vector(normal).normalized())
    center = Vector(p)
    nu, nv = 9, 6
    for i in range(nu+1):
        u = i / nu
        span = math.sin(math.pi*u)**.65
        for j in range(nv+1):
            v = j/nv*2-1
            x, y = v*width*span, length*u
            z = cup*(u*u+.30*v*v*span)-.10*length*math.sin(math.pi*u)
            local = Vector((x*math.cos(angle)-y*math.sin(angle),x*math.sin(angle)+y*math.cos(angle),z))
            verts.append(tuple(center + orientation @ local))
    for i in range(nu):
        for j in range(nv):
            a=i*(nv+1)+j
            faces.append((a,a+1,a+nv+2,a+nv+1))
    # Batch flowers during authoring instead of constructing thousands of Blender objects.
    key=(parent.name,material.name)
    target=petal_batches.setdefault(key,{'parent':parent,'material':material,'verts':[],'faces':[]})
    start=len(target['verts'])
    count=len(verts)
    target['verts'].extend(verts)
    back = orientation @ Vector((0,0,-.008))
    target['verts'].extend([tuple(Vector(v)+back) for v in verts])
    target['faces'].extend([tuple(start+i for i in face) for face in faces])
    target['faces'].extend([tuple(start+count+i for i in reversed(face)) for face in faces])


def consolidate(parent):
    # One mesh per material, with local coordinates and normals preserved.
    for key in [key for key in petal_batches if key[0]==parent.name]:
        batch=petal_batches.pop(key)
        mesh('Cupped petals',batch['verts'],batch['faces'],batch['material'],parent)
    objects=list(parent.children_recursive)
    for ob in objects:
        if ob.type not in {'MESH','CURVE'}:
            continue
        bpy.ops.object.select_all(action='DESELECT')
        ob.select_set(True)
        bpy.context.view_layer.objects.active=ob
        bpy.ops.object.convert(target='MESH')
    groups={}
    for ob in parent.children_recursive:
        if ob.type=='MESH':
            groups.setdefault(ob.data.materials[0].name,[]).append(ob)
    for name, obs in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for ob in obs:
            ob.select_set(True)
        bpy.context.view_layer.objects.active=obs[0]
        if len(obs)>1:
            bpy.ops.object.join()
        ob=bpy.context.object
        ob.name=parent.name+' | '+name
    print('AUTHORED '+parent.name,flush=True)


terrace=root('ML_Terrace')
lathe('Porcelain terrace',[(0,.61),(12.1,.61),(12.25,.59),(12.34,.52),(12.35,.30),(12.25,.23),(12,.22),(0,.22)],ivory,terrace)
lathe('Lower fluted edge',[(11.8,.25),(12.5,.21),(12.61,.14),(12.61,-.12),(12.4,-.22),(11.9,-.24)],cream,terrace)
for r,z,w in [(11.95,.625,.018),(11.7,.625,.009),(12.34,.35,.024),(12.6,.035,.014)]:
    torus('Champagne seam',r,z,w,gold,terrace)
consolidate(terrace)

island=root('ML_Island')
lathe('Organic mineral island',[(0,-12),(1.8,-11.1),(3,-9.7),(3.8,-8.6),(4.4,-7.7),(6,-6.1),(7.4,-5.2),(8.3,-3.8),(10,-2.8),(11,-1.7),(12,-.7),(12.1,0)],cliff,island,128,.038)
for k in range(12):
    a=k*math.tau/12
    radius=7.1+random.uniform(-.8,.8)
    sphere('Mineral shoulder',(radius*math.cos(a),radius*math.sin(a),-3.8),(2,1.7,2.5),cliffLight if k%4==0 else cliff,island,16,10,.035)
consolidate(island)

arcade=root('ML_Arcade')
# An actual masonry arch with depth, pier capitals, and restrained metal trim.
for cell in range(3):
    x=(cell-1)*5.5
    h=4.4+(1 if cell==1 else 0)
    ri,ro,depth=2.22,2.66,.60
    verts,faces=[],[]
    for d in [-depth,depth]:
        for r in [ri,ro]:
            for j in range(41):
                a=j/40*math.pi
                verts.append((x+r*math.cos(a),d,h+r*math.sin(a)))
    for j in range(40):
        for start in [0,82]:
            faces.append((start+j,start+j+1,start+41+j+1,start+41+j))
        faces.append((j,j+82,j+83,j+1))
        faces.append((41+j,42+j,124+j,123+j))
    faces += [(0,41,123,82),(40,122,163,81)]
    mesh('Sculpted arch',verts,faces,ivory,arcade)
    for side in [-1,1]:
        px=x+side*(ri+ro)/2
        box('Ivory pier',(px,0,h/2),(.44,1.2,h),ivory,arcade)
        for z,w,d in [(.13,.76,1.46),(.3,.61,1.35),(h-.09,.69,1.38)]:
            box('Pier capital',(px,0,z),(w,d,.16),cream,arcade,.035)
        box('Pier gold foot',(px,-.005,.44),(.49,1.25,.045),gold,arcade,.015)
    curve('Fine inner arch',[(x+(ri+.075)*math.cos(j/40*math.pi),-.614,h+(ri+.075)*math.sin(j/40*math.pi)) for j in range(41)],.018,gold,arcade)
consolidate(arcade)


def tree(name,palette,seed):
    rng=random.Random(seed)
    parent=root(name)
    curve('Tapered winding trunk',[(0,0,0),(.10,.07,1.5),(-.2,.18,3),(.25,-.06,4.5),(.1,.10,5.5)],.24,bark,parent,[1.6,1.15,.82,.5,.1])
    tips=[]
    for i in range(11):
        a=i*2.399+.3
        r=rng.uniform(1.5,3)
        end=Vector((r*math.cos(a),r*math.sin(a),rng.uniform(3.9,5.9)))
        base=Vector((.02,0,rng.uniform(1.6,3.4)))
        mid=base.lerp(end,.55)+Vector((0,0,.35))
        curve('Tapered branch',[base,mid,end],.105,bark,parent,[1,.58,.08])
        for j in range(3):
            tip=end+Vector((rng.uniform(-.7,.7),rng.uniform(-.7,.7),rng.uniform(-.25,.65)))
            curve('Fine twig',[mid.lerp(end,.8),tip],.027,bark,parent,[1,.1])
            tips.append(tip)
    # Rounded flower clusters provide crown volume; individual cupped blossoms
    # face outward across that volume instead of lying in horizontal plates.
    for i, tip in enumerate(tips):
        sphere('Soft flowering crown',tip,(.77,.72,.64),palette[i%4],parent,20,12,.10)
        for j in range(3):
            offset=Vector((rng.uniform(-.62,.62),rng.uniform(-.62,.62),rng.uniform(-.32,.45)))
            sphere('Petal cluster',tip+offset,(.40,.37,.34),palette[(i+j+1)%4],parent,12,8,.12)
    for i in range(190):
        outward=Vector((rng.uniform(-1,1),rng.uniform(-1,1),rng.uniform(-.35,1))).normalized()
        c=tips[i%len(tips)]+Vector((outward.x*.82,outward.y*.77,outward.z*.70))
        length=rng.uniform(.17,.29)
        angle=rng.uniform(0,math.tau)
        for j in range(5):
            petal('Cupped blossom',length,length*.58,length*.28,palette[(i+j)%4],parent,c,angle+j*math.tau/5,outward)
        if i%4==0:
            sphere('Blossom center',c,(.052,.052,.04),ivory,parent,8,6)
    consolidate(parent)
    return parent


treeA=tree('ML_Blossom_Rose',rose,210)
treeB=tree('ML_Blossom_Lavender',lavender,642)

bed=root('ML_FlowerBed')
for i in range(24):
    a=random.random()*math.tau
    r=math.sqrt(random.random())*2.4
    p=(math.cos(a)*r,math.sin(a)*r,.25+random.random()*.6)
    curve('Flower stem',[(p[0],p[1],0),p],.017,leaves,bed)
    for j in range(5):
        petal('Garden blossom',.32,.21,.1,rose[(i+j)%4],bed,p,a+j*math.tau/5)
    petal('Leaf',.56,.18,.07,leaves,bed,(p[0],p[1],.12),a+1.2)
consolidate(bed)

cloud=root('ML_Cloudbank')
for i in range(22):
    a=i*2.399
    r=math.sqrt(i/22)*5
    sphere('Cloud billow',(math.cos(a)*r,math.sin(a)*r*.55,random.uniform(-.4,1.1)),(random.uniform(1.5,2.9),random.uniform(1.3,2),random.uniform(1.1,1.9)),cloudMats[i%3],cloud,20,12,.024)
consolidate(cloud)

roots=[terrace,island,arcade,treeA,treeB,bed,cloud]
for i,ob in enumerate(roots):
    ob.location.x=i*30
    ob['asset_role']='Original local geometry for the Mother\'s Love prototype'

bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'pearl-atelier.blend'))
bpy.ops.object.select_all(action='DESELECT')
for ob in roots:
    ob.select_set(True)
    for child in ob.children_recursive:
        child.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'pearl-atelier.glb'),export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False)
report={'blender':bpy.app.version_string,'source':'Original geometry authored locally with scripts/build-pearl-atelier.py','rights':'Project-owned original geometry; no external assets or generated personal data','coordinate_system':'Blender Z up, exported glTF Y up','assets':[]}
for ob in roots:
    count=sum(len(c.data.polygons) for c in ob.children_recursive if c.type=='MESH')
    report['assets'].append({'name':ob.name,'polygons':count,'mesh_parts':len([c for c in ob.children_recursive if c.type=='MESH'])})
(OUT/'provenance.json').write_text(json.dumps(report,indent=2)+'\n')
print('ATELIER_KIT_EXPORTED '+json.dumps(report))
