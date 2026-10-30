"""Blender companion: mobile environment LOD without altering the master .blend.
Run after build-rental-sky-studio.py. Local textures are resized copies only.
"""
import bpy, json, struct
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'model-source/zxxr-sky-studio-v4.blend'))
collection=bpy.data.collections['EXPORT - Physical painted sky studio']
grass=bpy.data.objects['Studio_PhysicalGrassTufts'];old=grass.data
selected=[p for p in old.polygons if (p.index//2)%8==0]
indices=sorted({i for p in selected for i in p.vertices});mapping={v:i for i,v in enumerate(indices)}
mesh=bpy.data.meshes.new('Mobile sparse grass tufts')
mesh.from_pydata([old.vertices[i].co for i in indices],[],[tuple(mapping[i] for i in p.vertices) for p in selected]);mesh.update()
for m in old.materials:mesh.materials.append(m)
for dest,src in zip(mesh.polygons,selected):dest.material_index=src.material_index
grass.data=mesh
for material in bpy.data.materials:
    if not material.use_nodes:continue
    for node in material.node_tree.nodes:
        if node.type=='TEX_IMAGE' and node.image:
            original=node.image
            stem=Path(original.filepath).stem
            suffix='png' if 'normal' in stem else 'jpg'
            mobile=ROOT/'public/media/sky-studio-v4/mobile'/f'{stem}.{suffix}'
            if mobile.exists():
                im=bpy.data.images.load(str(mobile),check_existing=True)
                im.colorspace_settings.name=original.colorspace_settings.name
                node.image=im
bpy.ops.object.select_all(action='DESELECT')
for ob in collection.objects:ob.select_set(True)
path=ROOT/'public/models/sky-studio-mobile-v4.glb'
bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,
    export_apply=True,export_yup=True,export_animations=False,export_cameras=False,
    export_lights=False,export_materials='EXPORT',export_image_format='AUTO')
blob=path.read_bytes();json_size=struct.unpack_from('<I',blob,12)[0]
gltf=json.loads(blob[20:20+json_size])
for material in gltf['materials']:
    if material.get('name')=='Studio_Turf':
        material['pbrMetallicRoughness']['baseColorFactor']=[.04,.145,.016,1]
payload=json.dumps(gltf,separators=(',',':')).encode('utf-8');payload+=b' '*((-len(payload))%4)
rest=blob[20+json_size:]
path.write_bytes(struct.pack('<4sII',b'glTF',2,20+len(payload)+len(rest))+struct.pack('<I4s',len(payload),b'JSON')+payload+rest)
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in collection.objects if o.type=='MESH')
meta=ROOT/'docs/SKY-STUDIO-v4.json';data=json.loads(meta.read_text(encoding='utf-8'))
data['bytes']=(ROOT/'public/models/sky-studio-v4.glb').stat().st_size
data['mobile']={'glb':str(path.relative_to(ROOT)).replace('\\','/'),'triangles':triangles,'bytes':path.stat().st_size,'textureMax':1024,'grassBlades':1000}
meta.write_text(json.dumps(data,indent=2,ensure_ascii=False),encoding='utf-8')
print('SKY_STUDIO_MOBILE_COMPLETE',triangles,path.stat().st_size,flush=True)
