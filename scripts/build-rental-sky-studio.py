"""Physical painted-sky photography set; Blender 4.5; original optimized asset.

Prepare plaster/cement with make-rental-sky-textures.py (project Python), project
the CC0 photograph with project-photographic-sky.py (Blender), then compress it
with prepare-photo-studio-maps.py (project Python). Build the geometry with:
blender --background --python scripts/build-rental-sky-studio.py
The GLB contains only physical set meshes. Camera, lights and a scale rail are
saved in the editable .blend and excluded from browser geometry export.
"""
import bpy, math, json, random, struct, sys
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
TEX=ROOT/'public/media/sky-studio-v4'
OUT=ROOT/'public/models/sky-studio-v4.glb'
PREVIEW=ROOT/'docs/previews/sky-studio-v4-study.png'
QUICK='--quick' in sys.argv
if QUICK:PREVIEW=ROOT/'docs/previews/sky-studio-v4-colorproof.png'
random.seed(9527)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
set_collection=bpy.data.collections.new('EXPORT - Physical painted sky studio')
scene.collection.children.link(set_collection)
proof_collection=bpy.data.collections.new('PROOF ONLY - Camera lights scale rail')
scene.collection.children.link(proof_collection)


def move_collection(ob,collection=set_collection):
    for c in list(ob.users_collection):c.objects.unlink(ob)
    collection.objects.link(ob)


def mat(name,color,roughness=.8,metallic=0):
    m=bpy.data.materials.new(name);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=roughness;p.inputs['Metallic'].default_value=metallic
    return m


def textured(name,colorfile,heightfile=None,roughness=.9,distance=.012):
    m=mat(name,(.5,.5,.5),roughness);n=m.node_tree.nodes;l=m.node_tree.links;p=n['Principled BSDF']
    image=n.new('ShaderNodeTexImage');image.image=bpy.data.images.load(str(TEX/colorfile));image.extension='EXTEND'
    l.new(image.outputs['Color'],p.inputs['Base Color'])
    if heightfile:
        h=n.new('ShaderNodeTexImage');h.image=bpy.data.images.load(str(TEX/heightfile));h.image.colorspace_settings.name='Non-Color';h.extension='EXTEND'
        b=n.new('ShaderNodeNormalMap');b.inputs['Strength'].default_value=.7
        l.new(h.outputs['Color'],b.inputs['Color']);l.new(b.outputs['Normal'],p.inputs['Normal'])
    return m

sky=textured('Studio_SkyPaint', 'painted-sky-atlas.jpg','plaster-normal.png',.96,.008)
sky.node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value=.08
cement=textured('Studio_Cement','cement-color.jpg','cement-normal.png',.88,.018)
turf=textured('Studio_Turf','grass-color-2k.jpg','grass-normal-1k.jpg',.98)
for node in turf.node_tree.nodes:
    if node.type=='TEX_IMAGE':node.extension='REPEAT'
# Neutral studio light must not turn leaf litter into a pale carpet. The
# material color factor represents the dark green backing of a cut turf mat.
nodes=turf.node_tree.nodes;links=turf.node_tree.links
albedo=next(n for n in nodes if n.type=='TEX_IMAGE' and 'grass-color' in n.image.name)
mul=nodes.new('ShaderNodeMixRGB');mul.blend_type='MULTIPLY';mul.inputs[0].default_value=1
mul.inputs[2].default_value=(.04,.145,.016,1)
links.new(albedo.outputs['Color'],mul.inputs[1]);links.new(mul.outputs[0],nodes['Principled BSDF'].inputs['Base Color'])
nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value=.08
turfedge=mat('Studio_TurfEdges',(.025,.018,.008),.99)
joint=mat('Studio_WallJoint',(.13,.20,.23),.96)
steel=mat('Proof_PowderCoatedSteel',(.012,.012,.013),.37,.63)


def plane(name,verts,uv,material,collection=set_collection):
    me=bpy.data.meshes.new(name);me.from_pydata(verts,[],[(0,1,2,3)]);me.update()
    ob=bpy.data.objects.new(name,me);collection.objects.link(ob);me.materials.append(material)
    layer=me.uv_layers.new(name='StudioUV')
    for loop in me.loops:layer.data[loop.index].uv=uv[loop.vertex_index]
    return ob


def tile_uv(i):
    # Atlas image rows are top-down while Blender UV V runs bottom-up.
    col=i%2;row=i//2
    pad=.00025
    u0=col*.5+pad;u1=(col+1)*.5-pad
    v0=1-(row+1)*.5+pad;v1=1-row*.5-pad
    return [(u0,v0),(u1,v0),(u1,v1),(u0,v1)]

# Normals face into the room. The painted pattern meets at exact coordinates.
plane('Studio_BackWall',[(-9,3,0),(9,3,0),(9,3,7),(-9,3,7)],tile_uv(0),sky)
plane('Studio_LeftWall',[(-9,-5,0),(-9,3,0),(-9,3,7),(-9,-5,7)],tile_uv(1),sky)
plane('Studio_RightWall',[(9,3,0),(9,-5,0),(9,-5,7),(9,3,7)],tile_uv(2),sky)
plane('Studio_PaintedCeiling',[(-9,3,7),(9,3,7),(9,-5,7),(-9,-5,7)],tile_uv(3),sky)
plane('Studio_CementFloor',[(-12,-10,-.055),(12,-10,-.055),(12,3.3,-.055),(-12,3.3,-.055)],[(0,0),(1,0),(1,1),(0,1)],cement)


def cube(name,loc,scale,material,bevel=0,collection=set_collection):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);ob=bpy.context.object;ob.name=name
    ob.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    ob.data.materials.append(material);move_collection(ob,collection)
    if bevel:
        mod=ob.modifiers.new('Physical edge bevel','BEVEL');mod.width=bevel;mod.segments=2
        bpy.context.view_layer.objects.active=ob;bpy.ops.object.modifier_apply(modifier=mod.name)
        for p in ob.data.polygons:p.use_smooth=True
        normal=ob.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
        bpy.ops.object.modifier_apply(modifier=normal.name)
    return ob

# Thin joints document a constructed room, avoiding a seamless virtual skybox.
cube('Studio_RearFloorExpansionJoint',(0,2.984,-.005),(18,.022,.08),joint,.006)
cube('Studio_LeftFloorExpansionJoint',(-8.984,-1,0),(.022,8,.06),joint,.004)
cube('Studio_RightFloorExpansionJoint',(8.984,-1,0),(.022,8,.06),joint,.004)
cube('Studio_CeilingPlasterRepairJoint',(0,2.995,6.97),(18,.016,.026),joint,.003)

# A removable turf mat, cut edges intentionally exposed over concrete.
# Browser coordinates: x +-7.8, z -2.68 to +.40, top y .015.
matbody=cube('Studio_GrassMatWithVisibleEdges',(0,1.15,-.006),(15.6,3.1,.09),turfedge,.018)
plane('Studio_TurfMatSurface',[(-7.79,-.39,.043),(7.79,-.39,.043),(7.79,2.69,.043),(-7.79,2.69,.043)],[(0,0),(7.8,0),(7.8,1.55),(0,1.55)],turf)

# Physical low-poly tufts (not billboard photos): 8,000 blades / 24,000 tris.
# Sparse at the foreground cut edge, with bent tips and quiet color variation.
grass_mats=[mat('Studio_GrassBlade_'+str(i),c,.98) for i,c in enumerate([
    (.025,.065,.006),(.045,.085,.011),(.06,.10,.015),(.018,.045,.006),(.075,.085,.02)])]
verts=[];faces=[];mats=[]
for i in range(8000):
    x=random.uniform(-7.78,7.78);y=random.uniform(-.38,2.68)
    height=random.uniform(.018,.050);w=random.uniform(.003,.006)
    a=random.uniform(0,math.tau);dx,dy=math.cos(a)*w,math.sin(a)*w
    bend=random.uniform(.012,.035);bx,by=math.cos(a+.8)*bend,math.sin(a+.8)*bend
    k=len(verts)
    verts.extend([(x-dx,y-dy,.041),(x+dx,y+dy,.041),
                  (x+bx*.4+dx*.56,y+by*.4+dy*.56,.041+height*.61),
                  (x+bx*.4-dx*.56,y+by*.4-dy*.56,.041+height*.61),
                  (x+bx,y+by,.041+height)])
    faces.extend([(k,k+1,k+2,k+3),(k+3,k+2,k+4)])
    m=random.choices(range(5),[3,4,3,3,1])[0];mats.extend([m,m])
me=bpy.data.meshes.new('Original cut grass tufts');me.from_pydata(verts,[],faces);me.update()
ob=bpy.data.objects.new('Studio_PhysicalGrassTufts',me);set_collection.objects.link(ob)
for m in grass_mats:me.materials.append(m);m.use_backface_culling=False
for p,m in zip(me.polygons,mats):p.material_index=m


def cylinder_between(name,a,b,r,material,collection=proof_collection):
    mid=(Vector(a)+Vector(b))*.5;direction=Vector(b)-Vector(a)
    bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=r,depth=direction.length,location=mid)
    o=bpy.context.object;o.name=name;o.rotation_euler=direction.to_track_quat('Z','Y').to_euler()
    o.data.materials.append(material);move_collection(o,collection)
    for p in o.data.polygons:p.use_smooth=True
    return o

# A scale rail is proof-only: the live application owns its arara.
cylinder_between('Proof only - garment rail',(-7.85,0,3.6),(7.85,0,3.6),.035,steel)
for s in [-1,1]:
    cylinder_between('Proof only - rack support',(s*7.85,0,0),(s*7.85,0,3.6),.045,steel)
    cylinder_between('Proof only - rack foot',(s*7.85,-.65,0),(s*7.85,.65,0),.045,steel)


def area(name,loc,power,size,target,color=(1,1,1)):
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;move_collection(o,proof_collection)
    o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.data.color=color
    o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
    return o

area('Neutral large front-left softbox',(-5,-6,5.3),2100,4,(0,0,1.9))
area('Neutral front right white bounce',(6,-4,4),1150,5,(0,0,1.8))
area('Neutral high softbox',(0,-.5,6.5),1000,3.5,(0,0,1.5))
# A directional source adds coherent real shadows on the grass and cement.
bpy.ops.object.light_add(type='SUN',location=(-4,-4,7));sun=bpy.context.object;sun.name='Neutral window daylight';sun.data.energy=.5;sun.data.angle=.22
sun.rotation_euler=(Vector((0,1,0))-sun.location).to_track_quat('-Z','Y').to_euler();move_collection(sun,proof_collection)
scene.world.use_nodes=True;bg=scene.world.node_tree.nodes['Background'];bg.inputs[0].default_value=(.65,.68,.70,1);bg.inputs[1].default_value=.18

bpy.ops.object.camera_add(location=(0,-20,4.7));camera=bpy.context.object;camera.name='Studio proof camera';move_collection(camera,proof_collection)
camera.rotation_euler=(Vector((0,1,2.7))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='PERSP';camera.data.lens=40;camera.data.clip_end=100;scene.camera=camera
scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True
scene.render.resolution_x=1920;scene.render.resolution_y=1080;scene.render.resolution_percentage=100
if QUICK:
    scene.render.resolution_percentage=50;scene.cycles.samples=16
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(PREVIEW)
scene.render.film_transparent=False
PREVIEW.parent.mkdir(exist_ok=True,parents=True);OUT.parent.mkdir(exist_ok=True,parents=True)

# Export only static physical geometry. Lights remain configurable by Three.js.
bpy.ops.object.select_all(action='DESELECT')
for ob in set_collection.objects:ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',use_selection=True,
    export_apply=True,export_yup=True,export_animations=False,export_cameras=False,
    export_lights=False,export_materials='EXPORT',export_image_format='AUTO')
# Blender's glTF exporter recognizes the albedo image through MixRGB but omits
# its multiplier. Set the standard glTF factor explicitly for renderer parity.
blob=OUT.read_bytes();json_size=struct.unpack_from('<I',blob,12)[0]
gltf=json.loads(blob[20:20+json_size])
for material in gltf['materials']:
    if material.get('name')=='Studio_Turf':
        material['pbrMetallicRoughness']['baseColorFactor']=[.04,.145,.016,1]
payload=json.dumps(gltf,separators=(',',':')).encode('utf-8')
payload+=b' '*((-len(payload))%4)
rest=blob[20+json_size:]
OUT.write_bytes(struct.pack('<4sII',b'glTF',2,20+len(payload)+len(rest))+struct.pack('<I4s',len(payload),b'JSON')+payload+rest)
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in set_collection.objects if o.type=='MESH')
manifest={
    'name':'Ceu de aluguel - physical painted photography set',
    'version':4,'triangles':triangles,'glb':str(OUT.relative_to(ROOT)).replace('\\','/'),
    'coordinateSystem':{'GLB':'Three.js Y up, front +Z','source':'Blender Z up, front -Y'},
    'boundsThree':{'x':[-12,12],'y':[-.055,7],'z':[-3.3,10]},
    'paintedRoomThree':{'x':[-9,9],'y':[0,7],'z':[-3,5]},
    'garmentSpaceThree':{'x':[-6.3,6.3],'y':[.7,3.6],'z':[-.4,1.5]},
    'grassMatThree':{'x':[-7.8,7.8],'y':[-.05,.17],'z':[-2.70,.40]},
    'sources':[
        {'kind':'user visual direction only','path':'C:/Users/caiom/Downloads/36cbe2c17eec7de85928cffbf3c05684.jpg','usedAsTexture':False},
        {'kind':'original procedural authored plaster/cement maps','script':'scripts/make-rental-sky-textures.py','externalAssets':False},
        {'kind':'photographed pure sky projected as bounded painted-wall albedo','name':'Kloofendal 48d Partly Cloudy (Pure Sky)','authors':['Greg Zaal','Jarod Guest'],'provider':'Poly Haven','url':'https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky','license':'CC0','licenseUrl':'https://polyhaven.com/license','downloaded':'2026-10-19','script':'scripts/project-photographic-sky.py','usedAsEnvironment':False},
        {'kind':'photographed grass albedo and normal','name':'Leafy Grass','author':'Charlotte Baglioni','provider':'Poly Haven','url':'https://polyhaven.com/a/leafy_grass','license':'CC0','licenseUrl':'https://polyhaven.com/license','downloaded':'2026-10-19','changes':'JPEG compression; original pixels preserved; material tinted dark green for the turf mat; UV repeats every 2 scene units (source capture spans 2 metres)'},
        {'kind':'original Blender geometry','script':'scripts/build-rental-sky-studio.py','externalAssets':False}
    ],
    'license':'Original geometry/plaster/cement authored for ZXXR. Grass by Charlotte Baglioni and pure-sky photograph by Greg Zaal/Jarod Guest via Poly Haven, CC0. Attribution recorded although not required by CC0.',
    'integration':[
        'Load GLB at identity transform; it is already Y-up after glTF export.',
        'Remove or hide prior flat backdrop/floor before insertion; retain the application-owned clothing rack.',
        'Set mesh.receiveShadow=true for all meshes, grass castShadow=false on mobile; walls and turf mat may castShadow=true.',
        'Use existing neutral front lights and neutral RoomEnvironment. Do not use the blue mural as an environment map: it would stain off-white cotton.',
        'Floor has real roughness and height normal maps; wall mural joins use shared source coordinates across corners.',
        'A ceiling and side walls remain outside a tightly cropped camera; fit camera to see rear/corner cues when desired.',
        'No lights, cameras, rail or garments are included in GLB. The .blend study includes a scale rack for proof only.'
    ],
    'suggestedThreeLighting':{
        'exposure':1.0,'neutralHemisphereIntensity':.75,
        'keyDirectional':{'position':[-5,6.2,6],'intensity':2.1,'castShadow':True,'shadowMapSize':2048,'shadowRadius':3},
        'fillDirectional':{'position':[6,4,4],'intensity':.7},
        'topDirectional':{'position':[0,6.6,-.8],'intensity':.8}
    },
    'grassColorFactorLinear':[.04,.145,.016,1],
    'limitations':['Procedural painted mural and cut grass are a modeled set, not a photograph of a built installation.','No lightmap is baked; browser must provide neutral lighting and contact shadows.']
}
(ROOT/'docs/SKY-STUDIO-v4.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False),encoding='utf-8')
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'model-source/zxxr-sky-studio-v4.blend'))
bpy.ops.render.render(write_still=True)
print('SKY_STUDIO_COMPLETE',triangles,'triangles',OUT,PREVIEW,flush=True)
