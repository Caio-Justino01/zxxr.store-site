"""Choose the audited clean shell and retarget Boca's original UV artwork.
Geometry/indices/poses remain byte-identical to the clean black export.
Run with Blender after build-tailored-v4.py -- --dark.
"""
import bpy,json,struct,shutil,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
folder=ROOT/'public/models';source=ROOT/'model-source';blank=(.79,.77,.70,1)
records=[]
for suffix in ['','-mobile']:
    original=folder/f'oversized-black-v4{suffix}.glb';target=folder/f'oversized-offwhite-v4{suffix}.glb'
    if target.exists() and not (folder/f'oversized-offwhite-study-v4{suffix}.glb').exists():shutil.copy2(target,folder/f'oversized-offwhite-study-v4{suffix}.glb')
    raw=original.read_bytes();jl=struct.unpack_from('<I',raw,12)[0];gltf=json.loads(raw[20:20+jl]);offset=20+jl;bl=struct.unpack_from('<I',raw,offset)[0];binary=bytearray(raw[offset+8:offset+8+bl])
    geometry_hash=hashlib.sha256(binary).hexdigest()
    for side,image in zip(['front','back'],gltf.get('images',[])):
        content=(ROOT/f'public/media/artwork-v4/boca-{side}.png').read_bytes()
        binary.extend(b'\x00'*((-len(binary))%4));start=len(binary);binary.extend(content)
        image['bufferView']=len(gltf['bufferViews']);image['mimeType']='image/png';image['name']='boca-'+side
        gltf['bufferViews'].append({'buffer':0,'byteOffset':start,'byteLength':len(content)})
    for material in gltf.get('materials',[]):
        pbr=material.setdefault('pbrMetallicRoughness',{})
        pbr['baseColorFactor']=[1,1,1,1] if material.get('name') in ['Front','Back'] else list(blank)
    gltf.setdefault('extras',{})['zxxr']={'geometry':'audited shared oversized cut','source':'IMG_3281 1.jpg pattern compared with all five references','artwork':'Boca RGB originals, independent RGBA textures','originalGeometryBufferSha256':geometry_hash,'manufacturingMeasurements':False}
    gltf['buffers'][0]['byteLength']=len(binary)
    encoded=json.dumps(gltf,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4);binary.extend(b'\x00'*((-len(binary))%4))
    output=struct.pack('<III',0x46546c67,2,12+8+len(encoded)+8+len(binary))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(binary),0x004e4942)+binary
    target.write_bytes(output);(folder/f'oversized-shared-v4{suffix}.glb').write_bytes(output)
    records.append({'file':f'oversized-shared-v4{suffix}.glb','compatibilityAlias':target.name,'geometryBufferSha256':geometry_hash,'sourceGeometry':original.name,'geometryChanged':False,'bytes':len(output)})
old=source/'zxxr-tailored-offwhite-v4.blend'
if old.exists() and not (source/'zxxr-tailored-offwhite-study-v4.blend').exists():shutil.copy2(old,source/'zxxr-tailored-offwhite-study-v4.blend')
bpy.ops.wm.open_mainfile(filepath=str(source/'zxxr-tailored-black-v4.blend'))
for obj in bpy.data.objects:
    if obj.name.startswith('ZXXR_tailored_black'):obj.name='ZXXR_shared_oversized_Boca'
for material in bpy.data.materials:
    if not material.use_nodes:continue
    bs=material.node_tree.nodes.get('Principled BSDF')
    if bs:bs.inputs['Base Color'].default_value=blank
    for node in material.node_tree.nodes:
        if node.type=='MIX_RGB':node.inputs[1].default_value=blank
        if node.type=='TEX_IMAGE':
            side='front' if material.name.startswith('Front') else 'back'
            node.image=bpy.data.images.load(str(ROOT/f'public/media/artwork-v4/boca-{side}.png'),check_existing=False)
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(old));bpy.ops.wm.save_as_mainfile(filepath=str(source/'zxxr-shared-oversized-v4.blend'))
scene=bpy.context.scene;scene.cycles.samples=24;scene.render.resolution_x=1200;scene.render.resolution_y=1200
objects=[o for o in bpy.data.objects if o.type=='MESH' and o.data.shape_keys]
for side,angle in [('front',0),('back',3.141592653589793)]:
    for obj in objects:obj.rotation_euler.z=angle
    scene.render.filepath=str(ROOT/f'docs/previews/tailored-v4/boca-shared-{side}.png');bpy.ops.render.render(write_still=True)
(ROOT/'docs/SHARED-CUT-v4.json').write_text(json.dumps({'selection':'audited black source pattern used as common prototype cut after silhouette/gola comparison','geometryUnchanged':True,'models':records,'comparison':'docs/previews/audit-v4-contact/SHARED-CUT-COMPARISON.md','previousWhiteStudyPreserved':True},indent=2))
print('SHARED CUT SELECTED: source geometry and all four poses unchanged',flush=True)
