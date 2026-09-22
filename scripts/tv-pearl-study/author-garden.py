"""Reproducible Blender scenery. Run in a separate --background --factory-startup process."""
import bpy, math, random, os, sys, json
from mathutils import Vector
from math import sin, cos, pi

OUT = os.environ.get('TV_STUDY_OUTPUT', '/private/tmp/mothers-love-tv-pearl')
os.makedirs(OUT, exist_ok=True)
random.seed(240921)
# The factory scene belongs only to this background process.
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
try: scene.render.engine='CYCLES'
except TypeError: pass
scene.cycles.samples=int(os.environ.get('TV_STUDY_SAMPLES','40'))
scene.cycles.use_denoising=True
scene.cycles.max_bounces=6
scene.cycles.transparent_max_bounces=8
try:
    prefs=bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type='METAL'
    prefs.get_devices()
    for d in prefs.devices: d.use=d.type!='CPU'
    if any(d.use for d in prefs.devices): scene.cycles.device='GPU'
except Exception as e: print('GPU fallback:',str(e))
scene.render.resolution_x=int(os.environ.get('TV_STUDY_WIDTH','2560'))
scene.render.resolution_y=scene.render.resolution_x*9//16
scene.render.resolution_percentage=100
formats=[e.identifier for e in scene.render.image_settings.bl_rna.properties['file_format'].enum_items]
scene.render.image_settings.file_format=next(f for f in formats if f=='PNG')
scene.render.image_settings.color_mode='RGBA'
scene.world.color=(.55,.55,.55)
scene.world.use_nodes=True
wn=scene.world.node_tree.nodes
bg=next(n for n in wn if n.type=='BACKGROUND')
bg.inputs['Color'].default_value=(.64,.75,.89,1)
bg.inputs['Strength'].default_value=.22
try: scene.view_settings.view_transform='AgX'
except TypeError: pass
scene.view_settings.exposure=.6

def material(name,color,rough=.4,metal=0,coat=0):
    m=bpy.data.materials.new(name);m.use_nodes=True
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=rough
    p.inputs['Metallic'].default_value=metal
    p.inputs['Coat Weight'].default_value=coat
    return m
ivory=material('Warm ivory porcelain',(.83,.76,.65),.27,0,.24)
gold=material('Brushed champagne',(.65,.40,.15),.24,.78,.18)
stone=material('Pearl limestone',(.65,.70,.64),.62)
grass=material('Fresh garden sage',(.31,.52,.32),.68)
bark=material('Rosewood branches',(.18,.092,.072),.64)
petals=[material('Blossom '+str(i),c,.42,0,.14) for i,c in enumerate([(.92,.40,.49),(.95,.58,.64),(.96,.72,.72),(.65,.37,.61),(.83,.57,.76),(.98,.84,.78)])]
for m in petals:
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    p.inputs['Subsurface Weight'].default_value=.2
leaves=[material('Leaf '+str(i),c,.45) for i,c in enumerate([(.25,.46,.28),(.42,.60,.37),(.54,.68,.43)])]
water=material('Still turquoise water',(.27,.62,.65),.17,.16,.55)
wp=next(n for n in water.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
noise=water.node_tree.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=1.7
noise.inputs['Detail'].default_value=3
bump=water.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.12;bump.inputs['Distance'].default_value=.13
water.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height']);water.node_tree.links.new(bump.outputs['Normal'],wp.inputs['Normal'])
foam=material('Waterfall silk',(.65,.88,.88),.24,.12,.2)
sky=material('Sky backdrop',(.65,.71,.84),.8)

def mesh(name,verts,faces,mat):
    d=bpy.data.meshes.new(name);d.from_pydata(verts,[],faces);d.update()
    o=bpy.data.objects.new(name,d);scene.collection.objects.link(o)
    if mat:d.materials.append(mat)
    for p in d.polygons:p.use_smooth=True
    return o
def curve(name,pts,r,mat):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=12;c.bevel_depth=r;c.bevel_resolution=3
    s=c.splines.new('BEZIER');s.bezier_points.add(len(pts)-1)
    for i,(b,p) in enumerate(zip(s.bezier_points,pts)):
        b.co=p;b.handle_left_type='AUTO';b.handle_right_type='AUTO'
        if mat==bark:b.radius=max(.04,1-i/max(1,len(pts)-1)*.96)
    c.use_fill_caps=True
    o=bpy.data.objects.new(name,c);scene.collection.objects.link(o);o.data.materials.append(mat);return o
def lathe(name,x,y,z,profile,mat,scale=(1,1,1)):
    v=[];f=[];n=128
    for r,h in profile:
        for i in range(n):
            a=i*2*pi/n
            organic=(1+.07*sin(a*5+z)+.025*cos(a*11)) if mat==stone else 1
            v.append((x+r*cos(a)*scale[0]*organic,y+r*sin(a)*scale[1]*organic,z+h*scale[2]))
    for j in range(len(profile)-1):
        for i in range(n):a=j*n+i;b=j*n+(i+1)%n;f.append((a,b,b+n,a+n))
    return mesh(name,v,f,mat)
def ring(name,x,y,z,r,thick,mat,sy=1):
    return curve(name,[(x+r*cos(i*2*pi/128),y+r*sin(i*2*pi/128)*sy,z) for i in range(129)],thick,mat)
def platform(x,y,z,r):
    lathe('Rounded floating terrace',x,y,z,[(0,-.55),(r*.50,-.50),(r*.90,-.22),(r,-.06),(r,.02),(r*.98,.10),(0,.10)],ivory)
    ring('Fine metallic lip',x,y,z+.045,r*.993,.018,gold)
    ring('Inlaid inner circle',x,y,z+.11,r*.86,.012,gold)
def arch(x,y,z,w,h):
    for sign in [-1,1]:
        lathe('Fluted ivory column',x+sign*w/2,y,z,[(0,0),(.22,0),(.23,.12),(.14,.2),(.13,h-w/2),(.19,h-w/2+.10)],ivory)
        ring('Column gold collar',x+sign*w/2,y,z+.20,.145,.014,gold)
    pts=[(x+w/2*cos(a),y,z+h-w/2+w/2*sin(a)) for a in [i*pi/40 for i in range(41)]]
    curve('Porcelain arch crown',pts,.13,ivory)
    curve('Arch champagne reveal',[(a,b-.12,c) for a,b,c in pts],.017,gold)

# Landscape, far islands, and broad polished foreground steps.
mesh('Reflecting pool',[(-180,-100,-.65),(180,-100,-.65),(180,160,-.65),(-180,160,-.65)],[(0,1,2,3)],water)
platform(0,-1.5,-.08,11.5)
for k in range(4):
    r=11.55+k*.44
    lathe('Terrace step '+str(k),0,-1.5,-.17-k*.13,[(r-.5,0),(r,0),(r+.05,-.08),(r-.5,-.08)],ivory)
    ring('Step gold inlay',0,-1.5,-.17-k*.13,r-.09,.012,gold)
for x,y,z,r in [(-10,12,2,4),(11,15,3,5),(-18,28,6,5.3),(22,38,8,6),(-6,40,6,4.2)]:
    lathe('Carved island underside',x,y,z,[(0,-3.4),(r*.18,-3.2),(r*.35,-2.5),(r*.55,-2.0),(r*.7,-1.8),(r*.81,-1.1),(r*.88,-.9),(r*.93,-.35),(r,0),(0,0)],stone)
    platform(x,y,z,r)
    for j in range(3):arch(x+(j-1)*1.85,y+.3,z+.12,1.6,3.1)
    # A broad ribbon waterfall with fine vertical streaks.
    for j in range(13):
        xx=x-.65+j*.10; yy=y-r+.18
        curve('Falling water strand',[(xx,yy,z),(xx+.03,yy-.14,z-1),(xx+.13,yy-.18,-.50)],.042+random.random()*.04,foam)

# Floral geometry is authored as a single mesh per tree, not repeated spheres.
def blossom_cloud(name,points):
    verts=[];faces=[];mids=[]
    for center,rad,color in points:
        cx,cy,cz=center
        q=Vector((random.uniform(-1,1),random.uniform(-1,1),random.uniform(.3,1))).to_track_quat('Z','Y')
        for p in range(5):
            ang=p*2*pi/5+random.uniform(-.08,.08); start=len(verts)
            for i in range(9):
                t=i/8
                for j in range(7):
                    u=j/3-1;wide=sin(pi*t)**.65*.47
                    xx=rad*(.08+t)*cos(ang)+rad*wide*u*-sin(ang)
                    yy=rad*(.08+t)*sin(ang)+rad*wide*u*cos(ang)
                    zz=rad*(.21*t*t+.15*u*u*sin(pi*t)-.07*sin(pi*t))
                    vv=q@Vector((xx,yy,zz));verts.append((cx+vv.x,cy+vv.y,cz+vv.z))
            for i in range(8):
                for j in range(6):a=start+i*7+j;faces.append((a,a+1,a+8,a+7));mids.append(color)
    o=mesh(name,verts,faces,None)
    for m in petals:o.data.materials.append(m)
    for p,i in zip(o.data.polygons,mids):p.material_index=i
    return o
def tree(x,y,z,size,color):
    pts=[]
    curve('Sculpted trunk',[(x,y,z),(x-.15*size,y,z+size*.40),(x+.1*size,y+.12,z+size*.77)],size*.065,bark)
    for branch in range(13):
        a=branch*2.399;reach=random.uniform(.30,.55)*size
        tip=Vector((x+cos(a)*reach,y+sin(a)*reach*.8,z+size*random.uniform(.66,1.0)))
        root=Vector((x,y,z+size*.45));mid=root.lerp(tip,.6);mid.z+=.15*size
        curve('Tapered blossom branch',[root,mid,tip],size*.018,bark)
        for j in range(52):
            aa=random.uniform(0,2*pi);rr=random.random()**.5*size*.27
            pos=tip+Vector((rr*cos(aa),rr*sin(aa),random.uniform(-.14,.18)*size))
            pts.append((pos,random.uniform(.045,.075)*size,(color+random.choice([0,0,1,2]))%6))
    blossom_cloud('Dimensional blossom canopy',pts)
for args in [(-9.3,1.5,.15,5.3,0),(9.2,2,.15,5.5,3),(-7.8,6,.15,3.1,1),(8,7,.15,3.3,0),(-11,13,2.2,2.3,3),(12,16,3.2,2.7,0),(-18,29,6.2,2.8,1),(22,38,8.2,3,3),(-5,41,6.2,2.6,2)]:tree(*args)

# Low edge beds with petals and folded leaves; keep the message area calm.
for side in [-1,1]:
    bed=[]
    for i in range(120):
        x=side*random.uniform(7.0,11);y=random.uniform(-4,7);z=.14
        if (x*x+(y+1.5)**2)>11.4**2:continue
        h=random.uniform(.08,.4);bed.append(((x,y,z+h),random.uniform(.10,.21),random.randrange(6)))
        a=random.uniform(0,2*pi);l=random.uniform(.25,.5)
        mesh('Folded lanceolate leaf',[(x,y,z),(x+cos(a)*l*.5-sin(a)*.10,y+sin(a)*l*.5+cos(a)*.10,z+.12),(x+cos(a)*l,y+sin(a)*l,z+.08),(x+cos(a)*l*.5+sin(a)*.10,y+sin(a)*l*.5-cos(a)*.10,z+.12),(x+cos(a)*l*.5,y+sin(a)*l*.5,z+.18)],[(0,1,4),(1,2,4),(2,3,4),(3,0,4)],random.choice(leaves))
    blossom_cloud('Low border flowers',bed)

# Luminous background sky uses an emissive gradient so it remains clean.
sky.use_nodes=True;p=next(n for n in sky.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
p.inputs['Emission Color'].default_value=(.80,.63,.69,1);p.inputs['Emission Strength'].default_value=.85
tex=sky.node_tree.nodes.new('ShaderNodeTexCoord');sep=sky.node_tree.nodes.new('ShaderNodeSeparateXYZ');ramp=sky.node_tree.nodes.new('ShaderNodeValToRGB')
ramp.color_ramp.elements[0].color=(.93,.62,.57,1);ramp.color_ramp.elements[1].color=(.53,.66,.85,1)
sky.node_tree.links.new(tex.outputs['Generated'],sep.inputs[0]);sky.node_tree.links.new(sep.outputs['X'],ramp.inputs[0]);sky.node_tree.links.new(ramp.outputs[0],p.inputs['Emission Color'])
back=mesh('Distant sky plane',[(-180,130,-40),(180,130,-40),(180,130,100),(-180,130,100)],[(0,1,2,3)],sky)

def area(name,loc,power,size,color,target):
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=color
    o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
area('Warm afternoon key',(-9,-7,15),3200,8,(1,.73,.57),(0,4,0))
area('Pearl sky fill',(10,3,16),1900,12,(.73,.83,1),(0,4,0))
area('Golden petal backlight',(-3,18,12),2600,9,(1,.69,.51),(0,4,2))
bpy.ops.object.light_add(type='SUN',location=(0,0,12));sun=bpy.context.object;sun.data.energy=1.8;sun.data.angle=.09;sun.rotation_euler=(.40,-.48,-.55);sun.data.color=(1,.79,.62)
bpy.ops.object.camera_add(location=(0,-23,9.0));camera=bpy.context.object
camera.rotation_euler=(Vector((0,9,3.5))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=38;scene.camera=camera
scene.render.film_transparent=False
scene.render.filepath=os.path.join(OUT,'garden-background.png')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'pearl-garden.blend'))
with open(os.path.join(OUT,'blender-receipt.json'),'w') as f:json.dump({'version':bpy.app.version_string,'objects':len(scene.objects),'meshes':len(bpy.data.meshes),'samples':scene.cycles.samples,'resolution':[scene.render.resolution_x,scene.render.resolution_y],'device':scene.cycles.device,'authored':True,'thirdPartyAssets':False,'purpose':'Rendered TV scenery, not a runtime GLB asset kit'},f,indent=2)
bpy.ops.render.render(write_still=True)
print('TV_PEARL_RENDER_COMPLETE',scene.render.filepath)
