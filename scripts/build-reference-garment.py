"""v3: source-traced sewing pattern, metre-scale cotton solve, editable poses.
Run Blender --background --python scripts/build-reference-garment.py -- --dark
Physics dimensions are presentation assumptions, not production measurements.
"""
import bpy, json, math, os, sys
from pathlib import Path
from mathutils import Vector
from mathutils.geometry import delaunay_2d_cdt
ROOT=Path(__file__).resolve().parents[1]
DARK='--dark' in sys.argv
SLUG='spiritual-gangsta' if DARK else 'boca'
NAME='black' if DARK else 'offwhite'
data=json.loads((ROOT/f'model-source/patterns-v3/{SLUG}.json').read_text())
ref=data['views'][0];W,H=ref['width'],ref['height'];unit=.82/W
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.fps=30;scene.frame_end=110
source=ref['outline'];boundary=[]
for i,a in enumerate(source):
    b=source[(i+1)%len(source)];steps=max(1,round(math.dist(a,b)/11))
    for j in range(steps):
        t=j/steps;boundary.append((a[0]*(1-t)+b[0]*t,a[1]*(1-t)+b[1]*t))
neckhalf=W*.083;cx=W/2
def neck_y(x,back=False):
    t=min(1,abs(x-cx)/neckhalf)
    return H*(.009+(.018 if back else .074)*math.sqrt(max(0,1-t*t)))
boundary=[(x,neck_y(x)) if abs(x-cx)<neckhalf and y<H*.09 else (x,y) for x,y in boundary]
def inside(x,y):
    c=False
    for i,a in enumerate(boundary):
        b=boundary[(i+1)%len(boundary)]
        if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:c=not c
    return c
points=list(boundary)
for yi,y in enumerate(range(12,H,20)):
    for x in range(12,W,20):
        xx=x+(yi%2)*10
        if inside(xx,y):points.append((xx,y))
result=delaunay_2d_cdt([Vector(p) for p in points],[(i,(i+1)%len(boundary)) for i in range(len(boundary))],[list(range(len(boundary)))],1,1e-4)
pts,_,tris,orig,_,_=result;N=len(pts)
lookup={o:i for i,oset in enumerate(orig) for o in oset if o<len(boundary)}
def sourcepoint(p,side):
    x,y=p
    if side and abs(x-cx)<neckhalf and y<H*.17:
        f=neck_y(x);b=neck_y(x,True)
        y-=max(0,min(1,(H*.17-y)/(H*.17-f)))*(f-b)
    return x,y
verts=[];faces=[];matids=[];uvs=[]
for side in range(2):
    for p in pts:
        x,y=sourcepoint(p,side);xx=(x-cx)*unit;zz=(H/2-y)*unit
        belly=max(0,1-(xx/.27)**2)
        support=max(0,min(1,(zz-.17)/.07))
        depth=.005+.006*belly+.012*support+ .0008*math.sin(xx*69+zz*13)
        verts.append((xx,(-1 if side==0 else 1)*depth,zz))
    for tri in tris:
        seq=list(tri)
        a,b,c=[pts[i] for i in seq];area=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
        if (area>0)==(side==0):seq.reverse()
        faces.append(tuple(i+side*N for i in seq));matids.append(side)
        coords=[sourcepoint(pts[i],side) for i in seq]
        uvs.append([((x/W if side==0 else 1-x/W),1-y/H) for x,y in coords])
edgekinds=[]
for i,a in enumerate(boundary):
    j=(i+1)%len(boundary);b=boundary[j];mx=(a[0]+b[0])/2;my=(a[1]+b[1])/2
    neck=abs(mx-cx)<neckhalf+2 and my<H*.1
    hem=my>H*.98
    cuff=abs(mx-cx)>W*.36 and H*.16<my<H*.52 and abs(b[1]-a[1])>abs(b[0]-a[0])*1.15
    kind='neck' if neck else 'hem' if hem else 'cuff' if cuff else 'sewn';edgekinds.append(kind)
    if kind=='sewn':
        aa,bb=lookup[i],lookup[j]
        faces.append((aa,bb,bb+N,aa+N));matids.append(2);uvs.append([(0,0)]*4)
mesh=bpy.data.meshes.new('Source traced oversized panels');mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new('ZXXR_reference_'+NAME,mesh);bpy.context.collection.objects.link(obj)
bpy.context.view_layer.objects.active=obj;obj.select_set(True)
blank=(.018,.019,.021,1) if DARK else (.79,.77,.69,1)
for name in ['Front','Back','Seams']:
    m=bpy.data.materials.new(name);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=blank
    bs.inputs['Roughness'].default_value=.86;bs.inputs['Sheen Weight'].default_value=.3
    noise=m.node_tree.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=380;noise.inputs['Roughness'].default_value=.7
    bump=m.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.12;bump.inputs['Distance'].default_value=.001
    m.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height']);m.node_tree.links.new(bump.outputs['Normal'],bs.inputs['Normal'])
    if name!='Seams':
        tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(ROOT/f'public/media/reference-v3/{SLUG}-{name.lower()}.webp'))
        geo=m.node_tree.nodes.new('ShaderNodeNewGeometry');mix=m.node_tree.nodes.new('ShaderNodeMixRGB');mix.inputs[2].default_value=blank
        m.node_tree.links.new(geo.outputs['Backfacing'],mix.inputs[0]);m.node_tree.links.new(tex.outputs['Color'],mix.inputs[1]);m.node_tree.links.new(mix.outputs[0],bs.inputs['Base Color'])
    obj.data.materials.append(m)
for p,mid in zip(mesh.polygons,matids):p.material_index=mid;p.use_smooth=True
uv=mesh.uv_layers.new(name='UVMap')
for p,coords in zip(mesh.polygons,uvs):
    for li,co in zip(p.loop_indices,coords):uv.data[li].uv=co
rest=[v.co.copy() for v in mesh.vertices]
pin=obj.vertex_groups.new(name='Hanger support patches')
for v in mesh.vertices:
    x,y,z=v.co
    # Support only the sewn shoulder edge. Pinning a chest band creates a false ridge.
    px=x/unit+cx
    top=min((by for bx,by in boundary if abs(bx-px)<14),default=H)
    edge_z=(H/2-top)*unit
    if .078<abs(x)<.18 and z>edge_z-.006:
        pin.add([v.index],1,'REPLACE')
cloth=obj.modifiers.new('Cotton gravity at actual scale','CLOTH');s=cloth.settings
s.quality=10;s.mass=.18;s.air_damping=7;s.tension_stiffness=75;s.compression_stiffness=65;s.shear_stiffness=45;s.bending_stiffness=1.5
s.tension_damping=12;s.compression_damping=12;s.shear_damping=10;s.bending_damping=2;s.vertex_group_mass=pin.name
cloth.collision_settings.use_self_collision=True;cloth.collision_settings.self_distance_min=.002;cloth.collision_settings.collision_quality=3
reinforce=obj.vertex_groups.new(name='Sewn collar cuffs and hem')
for i,kind in enumerate(edgekinds):
    if kind!='sewn':
        for side in range(2):reinforce.add([lookup[i]+side*N],1,'REPLACE')
s.vertex_group_bending=reinforce.name;s.bending_stiffness_max=12
cloth.point_cache.frame_start=1;cloth.point_cache.frame_end=110
# Collision shell matches the visible hanger: fabric cannot pass through it.
hp=[(-.153,.207),(-.087,.262),(-.025,.302),(-.02,.32),(.02,.32),(.025,.302),(.087,.262),(.153,.207),(.143,.197),(-.143,.197)]
hv=[(x,y,z) for y in [-.011,.011] for x,z in hp];L=len(hp)
hf=[tuple(reversed(range(L))),tuple(range(L,2*L))]+[(i,(i+1)%L,(i+1)%L+L,i+L) for i in range(L)]
hm=bpy.data.meshes.new('Actual hanger collision shell');hm.from_pydata(hv,[],hf);hm.update()
support=bpy.data.objects.new('Actual hanger collision shell',hm);bpy.context.collection.objects.link(support);support.modifiers.new('Collision','COLLISION');support.collision.thickness_outer=.002;support.hide_render=True
poses={}
for f in range(1,111):
    scene.frame_set(f);deps=bpy.context.evaluated_depsgraph_get();deps.update()
    if f in (80,95,110):poses[f]=[v.co.copy() for v in obj.evaluated_get(deps).data.vertices]
    if f%10==0:print(NAME,'CLOTH',f,flush=True)
obj.modifiers.remove(cloth)
bpy.data.objects.remove(support,do_unlink=True)
base=poses[110]
# Fourfold presentation scale is applied after physics, matching the storefront.
base=[p*4 for p in base]
for v,p in zip(mesh.vertices,base):v.co=p
obj.shape_key_add(name='Basis')
worn=[]
for i,p in enumerate(base):
    q=p.copy();original=rest[i];body=max(0,1-(original.x/.265)**4);vertical=max(0,min(1,(.24-original.z)/.12))
    # Keep the traced cut and dropped sleeves: only inflate the empty torso.
    q.y+=(-1 if i<N else 1)*.21*body*vertical
    worn.append(q)
for name,coords in [('WindA',[p*4 for p in poses[95]]),('WindB',[p*4 for p in poses[80]]),('Worn',worn)]:
    k=obj.shape_key_add(name=name)
    for v,p in zip(k.data,coords):v.co=p
# Collar and hem strips are attached to exact boundary vertices in every pose.
sv=[];sf=[];refs=[]
for side in range(2):
    for i,kind in enumerate(edgekinds):
        if kind not in ('neck','hem','cuff'):continue
        j=(i+1)%len(boundary);a,b=lookup[i]+side*N,lookup[j]+side*N
        width=.022 if kind=='neck' else .004
        start=len(refs);refs.extend([(a,0,side),(a,width,side),(b,width,side),(b,0,side)]);sf.append(tuple(range(start,start+4)))
def trim(coords):
    arr=[]
    for idx,inset,side in refs:
        p=coords[idx].copy();p.z-=inset;p.y+=(-1 if side==0 else 1)*.0025;arr.append(p)
    return arr
sm=bpy.data.meshes.new('Rib collar and double needle edges');sm.from_pydata(trim(base),[],sf);sm.update()
stitch=bpy.data.objects.new('Collar_and_hems',sm);bpy.context.collection.objects.link(stitch);sm.materials.append(obj.data.materials[2]);stitch.shape_key_add(name='Basis')
for name in ['WindA','WindB','Worn']:
    k=stitch.shape_key_add(name=name)
    for v,p in zip(k.data,trim([v.co for v in obj.data.shape_keys.key_blocks[name].data])):v.co=p
# Bake a smooth desktop surface, preserving all pose topology and UV coordinates.
def finish(ob):
    mod=ob.modifiers.new('Surface subdivision','SUBSURF');mod.levels=1
    results={};out=None
    for name in ['Basis','WindA','WindB','Worn']:
        for k in ob.data.shape_keys.key_blocks:k.value=0
        if name!='Basis':ob.data.shape_keys.key_blocks[name].value=1
        bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();deps.update();ev=ob.evaluated_get(deps)
        if out is None:out=bpy.data.meshes.new_from_object(ev,preserve_all_data_layers=True,depsgraph=deps)
        results[name]=[v.co.copy() for v in ev.data.vertices]
    ob.modifiers.remove(mod);ob.data=out;ob.shape_key_add(name='Basis')
    for name in ['WindA','WindB','Worn']:
        k=ob.shape_key_add(name=name)
        for v,p in zip(k.data,results[name]):v.co=p
def animate():
    for ob in [obj,stitch]:
        for p in ob.data.polygons:p.use_smooth=True
        for f,a,b in [(1,0,0),(61,.25,0),(121,0,0),(181,0,.2),(241,0,0)]:
            for name,value in [('WindA',a),('WindB',b)]:
                k=ob.data.shape_keys.key_blocks[name];k.value=value;k.keyframe_insert(data_path='value',frame=f)
        ob.data.shape_keys.animation_data.action.name='Cotton_settle_'+ob.name
    scene.frame_set(1)
def export(suffix):
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);stitch.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(ROOT/f'public/models/oversized-{NAME}-v3{suffix}.glb'),export_format='GLB',use_selection=True,export_animations=True,export_morph=True,export_morph_normal=True,export_materials='EXPORT',export_animation_mode='ACTIVE_ACTIONS')
animate();export('-mobile')
finish(obj);animate();export('')
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.6,.6,.6,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
def area(loc,power,size):
    bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.data.energy=power;l.data.shape='DISK';l.data.size=size;l.rotation_euler=(Vector((0,0,0))-l.location).to_track_quat('-Z','Y').to_euler()
area((-3,-4,5),450,4);area((3,-2,1),140,3);area((1,3,3),300,3)
bpy.ops.object.camera_add(location=(0,-7,.2));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,-.12))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=3.55;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=1200;scene.render.resolution_y=1100;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.view_settings.view_transform='AgX'
bpy.ops.file.pack_all();bpy.ops.file.make_paths_relative();bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/f'model-source/zxxr-reference-{NAME}-v3.blend'))
out=ROOT/'docs/previews';out.mkdir(exist_ok=True)
for side in ['front','back']:
    obj.rotation_euler.z=stitch.rotation_euler.z=0 if side=='front' else math.pi
    scene.render.filepath=str(out/f'{SLUG}-{side}-model-v3.png');bpy.ops.render.render(write_still=True)
manifest={'pattern':str(ref['box']),'source':data['source'],'widthMetresAssumedForPhysics':.82,'physicsFrames':110,'simulationVertices':len(base),'desktopVertices':len(obj.data.vertices),'seamOpenings':{k:edgekinds.count(k) for k in set(edgekinds)}}
(ROOT/f'docs/MODEL-{NAME}-v3.json').write_text(json.dumps(manifest,indent=2))
print('V3 COMPLETE',manifest,flush=True)
