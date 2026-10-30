"""A native 3840 px Cycles proof of the same source-traced garments.
This is a 3D render, not a photograph of manufactured products.
"""
import bpy,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
def material(name,color,rough=.7,metal=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*color,1);b.inputs['Roughness'].default_value=rough;b.inputs['Metallic'].default_value=metal;return m
steel=material('Black powder coated steel',(.012,.012,.012),.36,.65)
silver=material('Brushed hook',(.35,.35,.35),.25,.9)
def tube(name,coords,radius,mat):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=radius;c.bevel_resolution=4
    p=c.splines.new('POLY');p.points.add(len(coords)-1)
    for v,co in zip(p.points,coords):v.co=(*co,1)
    ob=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(ob);ob.data.materials.append(mat);return ob
models={}
for cut in ['offwhite','black']:
    with bpy.data.libraries.load(str(ROOT/f'model-source/zxxr-reference-{cut}-v3.blend')) as (src,dst):
        dst.objects=[n for n in src.objects if n.startswith('ZXXR_reference') or n=='Collar_and_hems']
    models[cut]=dst.objects
items=[('boca','back'),('flores','front'),('me-preservando','back'),('spiritual-gangsta','back'),('zxxr-rosa','back')]
for i,(slug,side) in enumerate(items):
    cut='black' if i>=3 else 'offwhite';angle=(0 if side=='front' else math.pi)+.14
    group=bpy.data.objects.new(slug,None);bpy.context.collection.objects.link(group);group.location=((i-2)*3.15,0,3.6-1.54*1.05);group.scale=(1.05,)*3;group.rotation_euler.z=angle
    for src in models[cut]:
        ob=src.copy();ob.data=src.data.copy();bpy.context.collection.objects.link(ob);ob.parent=group
        if ob.data.shape_keys:
            ob.data.shape_keys.animation_data_clear()
            for k in ob.data.shape_keys.key_blocks:k.value=0
        for index,mat in enumerate(ob.data.materials):
            copy=mat.copy();ob.data.materials[index]=copy
            for node in copy.node_tree.nodes:
                if node.type=='TEX_IMAGE':
                    face='front' if mat.name.startswith('Front') else 'back'
                    node.image=bpy.data.images.load(str(ROOT/f'public/media/reference-v3/{slug}-{face}.webp'),check_existing=False)
    hanger=tube('Hanger shoulders',[(-.6,0,.86),(-.34,0,1.05),(-.08,0,1.24),(.08,0,1.24),(.34,0,1.05),(.6,0,.86),(-.6,0,.86)],.025,steel);hanger.parent=group
    hookcoords=[(0,0,1.22),(0,0,1.39),(.065,0,1.47),(.065,0,1.54),(0,0,1.57),(-.055,0,1.53),(-.055,0,1.47)]
    hook=tube('Steel hanger hook',hookcoords,.009,silver);hook.parent=group
for arr in models.values():
    for ob in arr:bpy.data.objects.remove(ob,do_unlink=True)
tube('Full width clothing rail',[(-8.05,0,3.6),(8.05,0,3.6)],.034,steel)
for s in [-1,1]:
    tube('Rack support',[(s*8.05,0,0),(s*8.05,0,3.6)],.04,steel)
    tube('Rack feet',[(s*8.05,-.7,0),(s*8.05,.7,0)],.045,steel)
profile=[(-10,-.08),(1.5,-.08)]
for i in range(1,33):
    a=i/32*math.pi/2;profile.append((1.5+1.8*math.sin(a),1.72-1.8*math.cos(a)))
profile.append((3.3,12))
verts=[(x,y,z) for y,z in profile for x in [-25,25]];faces=[(2*i,2*i+1,2*i+3,2*i+2) for i in range(len(profile)-1)]
me=bpy.data.meshes.new('Seamless cyclorama');me.from_pydata(verts,[],faces);me.update();wall=bpy.data.objects.new('Seamless photographic studio',me);bpy.context.collection.objects.link(wall)
plaster=material('Fine matte plaster',(.43,.42,.40),.88);wall.data.materials.append(plaster)
noise=plaster.node_tree.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=28;noise.inputs['Detail'].default_value=3
bump=plaster.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Distance'].default_value=.008;bump.inputs['Strength'].default_value=.14
plaster.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height']);plaster.node_tree.links.new(bump.outputs[0],plaster.node_tree.nodes['Principled BSDF'].inputs['Normal'])
for p in wall.data.polygons:p.use_smooth=True
def light(name,loc,power,size,target=(0,0,1.8)):
    bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.name=name;l.data.energy=power;l.data.shape='DISK';l.data.size=size;l.rotation_euler=(Vector(target)-l.location).to_track_quat('-Z','Y').to_euler()
light('Large key softbox',(-4,-5,7),1900,6);light('White bounce',(5,-3,4),750,5);light('Ceiling softbox',(0,1,7),1600,5)
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.7,.7,.7,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.35
bpy.ops.object.camera_add(location=(0,-19,4.3));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,2.0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=17.1;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True;scene.render.resolution_x=3840;scene.render.resolution_y=1500;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX'
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(ROOT/'docs/previews/studio-v3-3840.png')
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'model-source/zxxr-studio-v3.blend'));bpy.ops.render.render(write_still=True)
print('4K native studio proof complete',flush=True)
