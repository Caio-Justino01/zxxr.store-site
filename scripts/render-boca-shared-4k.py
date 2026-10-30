"""Native inspection render, using the approved shared oversized source unchanged.

Blender --background --threads 6 --python scripts/render-boca-shared-4k.py
Use -- --draft for a small framing check. No master file is saved or modified.
The output is a 3D render at 3840x2160, not a photograph or recovered 4K artwork.
"""
import bpy,math,json,hashlib,sys,struct
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'model-source/zxxr-shared-oversized-v4.blend'
DEST=ROOT/'docs/previews/tailored-v4/boca-shared-4k.png'
DRAFT='--draft' in sys.argv
if DRAFT:DEST=DEST.with_name('boca-shared-4k-draft.png')
source_sha=hashlib.sha256(SOURCE.read_bytes()).hexdigest()
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
scene=bpy.context.scene
scene.render.threads_mode='FIXED';scene.render.threads=6

garments=[o for o in bpy.data.objects if o.type=='MESH' and o.data.shape_keys and (o.name.startswith('ZXXR_') or o.name=='Rib_collar_continuous')]
assert len(garments)>=2,'Expected sewn shell and continuous collar in shared source'


def mesh_hash(obj):
    h=hashlib.sha256()
    for v in obj.data.vertices:h.update(struct.pack('<3f',*v.co))
    for p in obj.data.polygons:
        for v in p.vertices:h.update(struct.pack('<I',v))
    for layer in obj.data.uv_layers:
        for uv in layer.data:h.update(struct.pack('<2f',*uv.uv))
    return h.hexdigest()


geometry_before={o.name:mesh_hash(o) for o in garments}
art=[]
for o in garments:
    # Freeze only pose values/frame, exactly as the source's resting state.
    # No vertices, UVs, shape-key coordinates or material nodes are modified.
    o.rotation_euler.z=math.pi
    o.hide_render=False
    if o.data.shape_keys.animation_data:o.data.shape_keys.animation_data_clear()
    for key in o.data.shape_keys.key_blocks:key.value=0
    for m in o.data.materials:
        if m and m.use_nodes:
            for node in m.node_tree.nodes:
                if node.type=='TEX_IMAGE' and node.image:
                    info={'material':m.name,'image':node.image.name,'nativeSize':list(node.image.size),'path':node.image.filepath}
                    if info not in art:art.append(info)

# Use just the existing garment, hiding prior proof lighting/backdrops/supports.
for ob in list(bpy.data.objects):
    if ob not in garments:bpy.data.objects.remove(ob,do_unlink=True)
scene.frame_set(1);bpy.context.view_layer.update()
corners=[o.matrix_world@Vector(c) for o in garments for c in o.bound_box]
lo=Vector([min(v[a] for v in corners) for a in range(3)])
hi=Vector([max(v[a] for v in corners) for a in range(3)])
centre=(lo+hi)*.5;width=hi.x-lo.x;height=hi.z-lo.z


def matte(name,color,roughness=.88):
    material=bpy.data.materials.new(name);material.use_nodes=True
    bs=material.node_tree.nodes['Principled BSDF'];bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=roughness
    return material


# A real neutral backdrop/floor, without changing the product source material.
neutral=matte('Inspection only - neutral matte backdrop',(.19,.19,.19))
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,2,0),rotation=(math.pi/2,0,0));back=bpy.context.object;back.name='Inspection only - neutral wall';back.data.materials.append(neutral)
floor_mat=matte('Inspection only - neutral floor',(.17,.17,.17))
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,lo.z-.60));floor=bpy.context.object;floor.name='Inspection only - floor';floor.data.materials.append(floor_mat)


def light(name,loc,energy,size):
    bpy.ops.object.light_add(type='AREA',location=loc);ob=bpy.context.object;ob.name=name
    ob.data.energy=energy;ob.data.shape='DISK';ob.data.size=size;ob.data.color=(1,1,1)
    ob.rotation_euler=(centre-ob.location).to_track_quat('-Z','Y').to_euler()


light('Inspection neutral key',(-3,-4,4),500,4)
light('Inspection neutral fill',(3,-3,1.5),210,3)
light('Inspection neutral edge',(1,1,3),250,3)
scene.world.use_nodes=True
world=scene.world.node_tree.nodes['Background'];world.inputs[0].default_value=(.6,.6,.6,1);world.inputs[1].default_value=.32

bpy.ops.object.camera_add(location=(centre.x,-8,centre.z+.03));cam=bpy.context.object;cam.name='Inspection camera - Boca back'
cam.rotation_euler=(centre-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO'
cam.data.ortho_scale=max(width/.79,height*(3840/2160)/.86)
cam.data.clip_start=.01;cam.data.clip_end=200;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.cycles.use_adaptive_sampling=True;scene.cycles.adaptive_threshold=.055;scene.cycles.adaptive_min_samples=6
scene.cycles.max_bounces=4;scene.cycles.diffuse_bounces=2;scene.cycles.glossy_bounces=2
scene.cycles.transmission_bounces=2;scene.cycles.transparent_max_bounces=2
scene.render.resolution_x=3840;scene.render.resolution_y=2160;scene.render.resolution_percentage=25 if DRAFT else 100
if DRAFT:scene.cycles.samples=12
scene.render.film_transparent=False;scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=0
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(DEST)
DEST.parent.mkdir(parents=True,exist_ok=True)
geometry_after={o.name:mesh_hash(o) for o in garments}
assert geometry_before==geometry_after,'Inspection must preserve source geometry and UVs'
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==source_sha,'The master source must remain untouched'
record={'label':'Render 3D — Boca / costas','outputPixels':[3840,2160],
        'originalArtwork':'Native original RGB/alpha assets and their UVs, unchanged. Output resolution does not recover or invent 4K print detail.',
        'source':str(SOURCE.relative_to(ROOT)).replace('\\','/'),'sourceSha256':source_sha,
        'geometryAndUVUnchanged':geometry_before==geometry_after,'geometryHashes':geometry_before,
        'nativeTextures':art,'threads':6,'samples':scene.cycles.samples,
        'view':'Back, rest pose, neutral light, unmodified product materials',
        'renderType':'Native Blender/Cycles 3D inspection render; not a photograph of a manufactured product.',
        'garmentBounds':{'minimum':list(lo),'maximum':list(hi)},'orthoScale':cam.data.ortho_scale}
DEST.with_suffix('.json').write_text(json.dumps(record,indent=2,ensure_ascii=False),encoding='utf-8')
print('BOCA_PROOF_FRAMING',record['garmentBounds'],cam.data.ortho_scale,art,flush=True)
bpy.ops.render.render(write_still=True)
print('BOCA_SHARED_4K_PROOF_COMPLETE',DEST,flush=True)
