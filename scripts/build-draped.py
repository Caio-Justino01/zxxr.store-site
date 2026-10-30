"""Gravity-settled garment v2. The original patterns and UVs stay unchanged.
Run with the project's Blender 4.5 LTS. Cloth is solved offline, sampled to
stable-topology shape keys, then exported for inexpensive WebGL playback.
"""
import bpy, os, math, json, sys
from mathutils import Vector

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Reuse the approved flat pattern and its UV map, at a simulation-friendly density.
source=open(os.path.join(ROOT,'scripts','build-garment.py'),encoding='utf-8').read().split("obj.shape_key_add(name='Basis')")[0]
source=source.replace("range(1,67)","range(1,40)").replace("range(1,88)","range(1,51)")
source=source.replace("iy*.037","iy*.063").replace("ix*.037","ix*.066").replace(".0185",".033")
exec(compile(source,os.path.join(ROOT,'scripts','build-garment.py'),'exec'))
scene=bpy.context.scene
scene.render.fps=30
scene.frame_end=160
rest=[v.co.copy() for v in obj.data.vertices]
obj.name='ZXXR_Gravity_Draped'

# Supports are limited to the shoulder strip: the sleeves and hem remain free.
pin=obj.vertex_groups.new(name='Hanger_support')
for v in obj.data.vertices:
    x,y,z=v.co
    if .35 < abs(x) < .78 and z > 1.0:
        pin.add([v.index],1.0,'REPLACE')
cloth=obj.modifiers.new('Gravity and hanger cloth solve','CLOTH')
s=cloth.settings
s.quality=6
s.mass=.3
s.air_damping=3
s.tension_stiffness=35
s.compression_stiffness=35
s.shear_stiffness=12
s.bending_stiffness=.07
s.tension_damping=8
s.compression_damping=8
s.shear_damping=8
s.bending_damping=1
s.vertex_group_mass=pin.name
cloth.collision_settings.use_self_collision=True
cloth.collision_settings.self_distance_min=.009
cloth.collision_settings.self_friction=7
cloth.collision_settings.collision_quality=3
cloth.point_cache.frame_start=1
cloth.point_cache.frame_end=160

# Collision proxy has the same sloping shoulders as the visible hanger.
curve=bpy.data.curves.new('Hanger collision shape','CURVE');curve.dimensions='3D'
curve.bevel_depth=.025;curve.bevel_resolution=2
sp=curve.splines.new('POLY');sp.points.add(4)
for p,co in zip(sp.points,[(-.77,0,.91),(-.47,0,1.055),(0,0,1.22),(.47,0,1.055),(.77,0,.91)]):p.co=(*co,1)
support=bpy.data.objects.new('Hanger collision',curve);bpy.context.collection.objects.link(support)
bpy.context.view_layer.objects.active=support;support.select_set(True);obj.select_set(False)
bpy.ops.object.convert(target='MESH');support=bpy.context.object
support.modifiers.new('Collision','COLLISION');support.collision.thickness_outer=.008
support.hide_render=True

poses={}
for frame in range(1,161):
    scene.frame_set(frame)
    deps=bpy.context.evaluated_depsgraph_get();deps.update()
    if frame in (124,142,160):
        evaluated=obj.evaluated_get(deps)
        poses[frame]=[v.co.copy() for v in evaluated.data.vertices]
    if frame%10==0:print('CLOTH FRAME',frame,flush=True)

base=poses[160]
obj.modifiers.remove(cloth)
bpy.data.objects.remove(support,do_unlink=True)
for v,co in zip(obj.data.vertices,base):v.co=co
obj.shape_key_add(name='Basis')
# State changes preserve pattern width and sleeve length; only the cloth surface changes.
for name,coords in [('WindA',poses[142]),('WindB',poses[124]),('Worn',[Vector(shape(p.x,p.y,side,1,0)) for side in range(2) for p in pts])]:
    key=obj.shape_key_add(name=name)
    for v,co in zip(key.data,coords):v.co=co

# Collar and stitching follow the simulated vertices rather than floating above them.
def nearest(x,z,side):
    return min(range(side*N,(side+1)*N),key=lambda i:(rest[i].x-x)**2+(rest[i].z-z)**2)
seam_refs=[];seam_faces=[]
def seam(points,side,width):
    start=len(seam_refs)
    for x,z in points:
        idx=nearest(x,z,side)
        seam_refs.extend([(idx,-width,side),(idx,width,side)])
    for i in range(len(points)-1):
        a=start+i*2;seam_faces.append((a,a+1,a+3,a+2))
for side in range(2):
    for z in [-1.315,-1.29]:seam([(-1.0+2*i/60,z) for i in range(61)],side,.0018)
    # Exact neckline boundary indices, including the higher back neckline.
    start=len(seam_refs)
    neck=[lookup[i]+side*N for i,kind in enumerate(edge_types) if kind=='neck']
    for idx in neck:seam_refs.extend([(idx,0,side),(idx,-.038,side)])
    for i in range(len(neck)-1):
        a=start+i*2;seam_faces.append((a,a+1,a+3,a+2))
    for sign in [-1,1]:
        for off in [.02,.045]:seam([(sign*(1.43+.21*i/24-off),.06+.62*i/24) for i in range(25)],side,.002)
def stitch_coords(coords):
    out=[]
    for idx,dz,side in seam_refs:
        p=coords[idx].copy();p.z+=dz;p.y+=(-1 if side==0 else 1)*.003;out.append(tuple(p))
    return out
sm=bpy.data.meshes.new('Collar and double needle hems');sm.from_pydata(stitch_coords(base),[],seam_faces);sm.update()
stitch=bpy.data.objects.new('Collar_and_hems',sm);bpy.context.collection.objects.link(stitch)
stitch.data.materials.append(obj.data.materials[2]);stitch.shape_key_add(name='Basis')
for name in ['WindA','WindB','Worn']:
    key=stitch.shape_key_add(name=name)
    coords=[v.co for v in obj.data.shape_keys.key_blocks[name].data]
    for v,co in zip(key.data,stitch_coords(coords)):v.co=co

def smooth_export_mesh(ob):
    """Bake subdivision separately for each pose, preserving UVs and topology."""
    names=['WindA','WindB','Worn']
    modifier=ob.modifiers.new('Tailoring surface finish','SUBSURF')
    modifier.levels=1;modifier.render_levels=1
    results={};smooth_mesh=None
    for name in ['Basis']+names:
        for key in ob.data.shape_keys.key_blocks:key.value=0
        if name!='Basis':ob.data.shape_keys.key_blocks[name].value=1
        bpy.context.view_layer.update()
        deps=bpy.context.evaluated_depsgraph_get();deps.update()
        evaluated=ob.evaluated_get(deps)
        if name=='Basis':
            smooth_mesh=bpy.data.meshes.new_from_object(evaluated,preserve_all_data_layers=True,depsgraph=deps)
        results[name]=[v.co.copy() for v in evaluated.data.vertices]
    ob.modifiers.remove(modifier)
    ob.data=smooth_mesh
    ob.shape_key_add(name='Basis')
    for name in names:
        key=ob.shape_key_add(name=name)
        for v,co in zip(key.data,results[name]):v.co=co
if '--mobile' not in sys.argv:
    smooth_export_mesh(obj)
    smooth_export_mesh(stitch)

# A restrained cotton surface. The printed pixels remain the original artwork.
for material in obj.data.materials:
    bs=material.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Roughness'].default_value=.9
    bs.inputs['Sheen Weight'].default_value=.25
    noise=material.node_tree.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=210
    bump=material.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.18;bump.inputs['Distance'].default_value=.008
    material.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height'])
    material.node_tree.links.new(bump.outputs['Normal'],bs.inputs['Normal'])
for ob in [obj,stitch]:
    for p in ob.data.polygons:p.use_smooth=True
    for frame,a,b in [(1,0,0),(46,.32,0),(91,0,0),(136,0,.22),(181,0,0)]:
        for name,value in [('WindA',a),('WindB',b)]:
            k=ob.data.shape_keys.key_blocks[name];k.value=value;k.keyframe_insert(data_path='value',frame=frame)
    ob.data.shape_keys.animation_data.action.name='Cloth_settle_'+ob.name
scene.frame_end=181;scene.frame_set(1)
bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);stitch.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'oversized-draped-v2'+('-mobile' if '--mobile' in sys.argv else '')+'.glb'),export_format='GLB',use_selection=True,export_animations=True,export_morph=True,export_morph_normal=True,export_materials='EXPORT',export_animation_mode='ACTIVE_ACTIONS')

manifest={'simulation':'Blender Cloth, gravity, shoulder supports, hanger collision and self collision','frames':160,'vertices':len(base),'sourcePattern':'build-garment.py original mockup outline and UV','bounds':{'rest':[list(min(v[a] for v in rest) for a in range(3)),list(max(v[a] for v in rest) for a in range(3))],'draped':[list(min(v[a] for v in base) for a in range(3)),list(max(v[a] for v in base) for a in range(3))]}}
with open(os.path.join(ROOT,'docs','CLOTH-SIMULATION-v2'+('-mobile' if '--mobile' in sys.argv else '')+'.json'),'w') as f:json.dump(manifest,f,indent=2)
if '--model-only' in sys.argv:
    print('Model-only export complete',flush=True)
    sys.exit(0)

world=scene.world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.65,.65,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.6
def area(name,loc,power,size):
    bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.name=name;l.data.energy=power;l.data.shape='DISK';l.data.size=size;l.rotation_euler=(Vector((0,0,0))-l.location).to_track_quat('-Z','Y').to_euler()
area('Large camera left softbox',(-3,-4,5),550,4)
area('Gentle fill',(3,-1,2),170,3)
area('Edge separation',(1,4,3),320,3)
bpy.ops.object.camera_add(location=(0,-7,.15));cam=bpy.context.object
cam.rotation_euler=(Vector((0,0,-.18))-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.type='ORTHO';cam.data.ortho_scale=3.45;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=20
scene.render.resolution_x=1000;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.render.film_transparent=True;scene.view_settings.view_transform='AgX'
bpy.ops.file.pack_all();bpy.ops.file.make_paths_relative()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SOURCE,'zxxr-gravity-draped-v2.blend'))
proof=os.path.join(ROOT,'public','media','draped');os.makedirs(proof,exist_ok=True)
slugs=['boca'] if '--proof-only' in sys.argv else ['boca','flores','me-preservando','spiritual-gangsta','zxxr-rosa']
for slug in slugs:
    dark=slug in ['spiritual-gangsta','zxxr-rosa']
    obj.data.materials[2].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.022,.022,.025,1) if dark else (.80,.77,.67,1)
    for slot,name in [(0,'front'),(1,'back')]:
        for node in obj.data.materials[slot].node_tree.nodes:
            if node.type=='TEX_IMAGE':node.image=bpy.data.images.load(os.path.join(ROOT,'public','media','prints',slug+'-'+name+'.png'),check_existing=True)
    for side in ['front','back']:
        obj.rotation_euler.z=0 if side=='front' else math.pi
        stitch.rotation_euler.z=obj.rotation_euler.z
        scene.render.filepath=os.path.join(proof,slug+'-'+side+'.png')
        bpy.ops.render.render(write_still=True)
print('Gravity draped v2 complete',manifest,flush=True)
