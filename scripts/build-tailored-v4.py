"""Source-based sewn shell, four continuous openings and invisible body support.
No analytic torso inflation or floating trim. Physics is computed offline.
"""
import bpy,math,json,sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1]
def simplify_path(points,epsilon=4.5):
    def rdp(arr):
        a,b=Vector(arr[0]),Vector(arr[-1]);v=b-a
        if len(arr)<3:return arr
        distances=[abs(v.x*(p[1]-a.y)-v.y*(p[0]-a.x))/max(v.length,1e-8) for p in arr]
        j=max(range(len(arr)),key=lambda i:distances[i])
        return rdp(arr[:j+1])[:-1]+rdp(arr[j:]) if distances[j]>epsilon else [arr[0],arr[-1]]
    j=max(range(len(points)),key=lambda i:math.dist(points[0],points[i]))
    return rdp(points[:j+1])[:-1]+rdp(points[j:]+[points[0]])[:-1]
# Shared source-outline triangulation. v3 remains an archived construction recipe.
prefix=(ROOT/'scripts/build-reference-garment.py').read_text(encoding='utf8').split('verts=[];faces=[];matids=[];uvs=[]')[0]
prefix=prefix.replace("source=ref['outline'];boundary=[]","source=simplify_path(ref['outline']);boundary=[]")
exec(compile(prefix,str(ROOT/'scripts/build-reference-garment.py'),'exec'))
M=len(boundary)
def interval(a,b):
    ia=min(range(M),key=lambda i:math.dist(boundary[i],(a[0]*W,a[1]*H)))
    ib=min(range(M),key=lambda i:math.dist(boundary[i],(b[0]*W,b[1]*H)))
    forward=[];i=ia
    while i!=ib:forward.append(i);i=(i+1)%M
    backward=[];i=ib
    while i!=ia:backward.append(i);i=(i+1)%M
    length=lambda ids:sum(math.dist(boundary[i],boundary[(i+1)%M]) for i in ids)
    return set(forward if length(forward)<length(backward) else backward)
cuffs=interval((0,.23),(.085,.49))|interval((1,.23),(.92,.48))
neck=interval((.417,.01),(.583,.01))
hem=interval((.20,1),(.81,1))
kinds=['cuff' if i in cuffs else 'neck' if i in neck else 'hem' if i in hem else 'sewn' for i in range(M)]
sewn={lookup[i] for i in range(M) if kinds[i]=='sewn' or kinds[(i-1)%M]=='sewn'}
pointuv={};rest=[];index={};faces=[];matids=[];uvs=[]
def xy_for_source(p,side):
    x,y=sourcepoint(p,side)
    return (x-cx)*unit,(H/2-y)*unit
def drape_start(p,side):
    x,z=xy_for_source(p,side);ax=abs(x);sign=1 if x>=0 else -1
    torso=.078*math.sqrt(max(0,1-(ax/.258)**2))
    # Front and back panels form a true arm tube, rather than two flat sleeves.
    axis=math.radians(-24);dx=ax-.205;dz=z-.19
    v=-dx*math.sin(axis)+dz*math.cos(axis)
    sleeve=.065*math.sqrt(max(0,1-(v/.105)**2))
    blend=max(0,min(1,(ax-.19)/.075));depth=torso*(1-blend)+sleeve*blend
    if z>.20 and ax<.11:depth*=1-.37*max(0,min(1,(z-.20)/.06))
    # Relax the complete sleeve patch around the dropped shoulder seam.
    a=math.radians(-16)*max(0,min(1,(ax-.20)/.07))
    xx=.215+(ax-.215)*math.cos(a)-(z-.20)*math.sin(a)
    zz=.20+(ax-.215)*math.sin(a)+(z-.20)*math.cos(a)
    if ax>.20:x=sign*xx;z=zz
    return Vector((x,(-1 if side==0 else 1)*max(.0007,depth),z))
for side in range(2):
    for i,p in enumerate(pts):
        if side and i in sewn:index[(side,i)]=index[(0,i)];continue
        co=drape_start(p,side)
        if i in sewn:co.y=0
        index[(side,i)]=len(rest);rest.append(co);pointuv[len(rest)-1]=(side,i)
    for tri in tris:
        seq=list(tri);a,b,c=[pts[i] for i in seq];area=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
        if all(i in sewn for i in seq):continue
        if (area>0)==(side==0):seq.reverse()
        f=tuple(index[(side,i)] for i in seq)
        if len(set(f))!=3:continue
        faces.append(f);matids.append(side)
        coords=[sourcepoint(pts[i],side) for i in seq]
        uvs.append([((x/W if side==0 else 1-x/W),1-y/H) for x,y in coords])
me=bpy.data.meshes.new('Sewn oversized shell four openings');me.from_pydata(rest,[],faces);me.update()
obj=bpy.data.objects.new('ZXXR_tailored_'+NAME,me);bpy.context.collection.objects.link(obj)
bpy.context.view_layer.objects.active=obj;obj.select_set(True)
blank=(.012,.013,.015,1) if DARK else (.79,.77,.70,1)
def cotton(name,face=None,rib=False):
    m=bpy.data.materials.new(name);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=blank;bs.inputs['Roughness'].default_value=.88;bs.inputs['Sheen Weight'].default_value=.18
    noise=m.node_tree.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=380
    bump=m.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Distance'].default_value=.0006;bump.inputs['Strength'].default_value=.14
    m.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height']);m.node_tree.links.new(bump.outputs['Normal'],bs.inputs['Normal'])
    if face:
        tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(ROOT/f'public/media/artwork-v4/{SLUG}-{face}.png'))
        mix=m.node_tree.nodes.new('ShaderNodeMixRGB');mix.inputs[1].default_value=blank
        m.node_tree.links.new(tex.outputs['Alpha'],mix.inputs[0]);m.node_tree.links.new(tex.outputs['Color'],mix.inputs[2]);m.node_tree.links.new(mix.outputs[0],bs.inputs['Base Color'])
    return m
for m in [cotton('Front','front'),cotton('Back','back'),cotton('CottonInside'),cotton('CottonInsideBack'),cotton('Rib')]:me.materials.append(m)
neckpts=[Vector((boundary[i][0],boundary[i][1])) for i in neck]
for p,mid in zip(me.polygons,matids):
    p.material_index=mid;p.use_smooth=True
    # Continuous band uses faces of the sewn shell, with no detached quads.
    inds=[pointuv[v] for v in p.vertices]
    if all(min((pts[i]-n).length for n in neckpts)*unit<.013 for side,i in inds):p.material_index=4
uv=me.uv_layers.new(name='UVMap')
for p,coords in zip(me.polygons,uvs):
    for li,co in zip(p.loop_indices,coords):uv.data[li].uv=co
edge_uses={};face_set=set()
for p in me.polygons:
    key=tuple(sorted(p.vertices));assert key not in face_set,'Duplicate sewing face';face_set.add(key)
    for a,b in p.edge_keys:
        key=(min(a,b),max(a,b));edge_uses[key]=edge_uses.get(key,0)+1
assert max(edge_uses.values())<=2,'Non manifold sewing seam'
# A physical support that never becomes part of the exported visible geometry.
bodyverts=[];bodyfaces=[];rings=[(-.28,.225,.052),(-.17,.232,.062),(.03,.235,.065),(.17,.230,.063),(.23,.195,.055),(.275,.058,.045)]
for z,rx,ry in rings:
    for j in range(40):
        a=2*math.pi*j/40;bodyverts.append((rx*math.cos(a),ry*math.sin(a),z))
for r in range(len(rings)-1):
    for j in range(40):a=r*40+j;b=r*40+(j+1)%40;bodyfaces.append((a,b,b+40,a+40))
bodyfaces.extend([tuple(reversed(range(40))),tuple((len(rings)-1)*40+j for j in range(40))])
bm=bpy.data.meshes.new('Invisible torso collision');bm.from_pydata(bodyverts,[],bodyfaces);bm.update()
body=bpy.data.objects.new('Invisible body support',bm);bpy.context.collection.objects.link(body)
smooth=body.modifiers.new('Soft continuous torso support','SUBSURF');smooth.levels=2
colliders=[body]
for sign in [-1,1]:
    start=Vector((sign*.168,0,.205));end=Vector((sign*.335,0,-.01));v=end-start
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,radius=1,location=(start+end)/2)
    arm=bpy.context.object;arm.name='Invisible relaxed upper arm';arm.scale=(.048,.048,v.length/2+.025);arm.rotation_euler=v.to_track_quat('Z','Y').to_euler();colliders.append(arm)
for ob in colliders:
    ob.modifiers.new('Collision','COLLISION');ob.collision.thickness_outer=.0016;ob.collision.cloth_friction=4;ob.hide_render=True
pin=obj.vertex_groups.new(name='Narrow shoulder seam supports')
for i,kind in enumerate(kinds):
    x,y=boundary[i]
    if kind=='sewn' and .08<abs((x-cx)*unit)<.18 and y<H*.10:
        pin.add([index[(0,lookup[i])]],1,'REPLACE')
cloth=obj.modifiers.new('Cotton on invisible body offline solve','CLOTH');s=cloth.settings
s.quality=18;s.mass=.18;s.air_damping=8;s.tension_stiffness=65;s.compression_stiffness=60;s.shear_stiffness=30;s.bending_stiffness=.7
s.tension_damping=10;s.compression_damping=10;s.shear_damping=10;s.bending_damping=2;s.vertex_group_mass=pin.name
reinforce=obj.vertex_groups.new(name='Continuous sewn openings')
for i,kind in enumerate(kinds):
    if kind!='sewn':
        reinforce.add([index[(side,lookup[i])] for side in range(2)],1,'REPLACE')
s.vertex_group_bending=reinforce.name;s.bending_stiffness_max=5
cloth.collision_settings.use_self_collision=True;cloth.collision_settings.self_distance_min=.0036;cloth.collision_settings.distance_min=.0025;cloth.collision_settings.collision_quality=6
cloth.point_cache.frame_start=1;cloth.point_cache.frame_end=160
poses={}
for frame in range(1,161):
    t=max(0,min(1,(frame-120)/25));t=t*t*(3-2*t)
    body.rotation_euler.x=.025*t
    for arm in colliders[1:]:arm.location.z=.0975+.009*t
    scene.frame_set(frame);deps=bpy.context.evaluated_depsgraph_get();deps.update()
    if frame in (84,102,120,160):poses[frame]=[v.co.copy()*4 for v in obj.evaluated_get(deps).data.vertices]
    if frame%20==0:print(NAME,'SUPPORTED CLOTH',frame,flush=True)
obj.modifiers.remove(cloth)
# Remove sub-millimetre solver chatter while retaining the broad physical folds.
# The same local filter is applied to every sampled pose, never to the artwork.
neighbors=[set() for _ in me.vertices]
for e in me.edges:
    a,b=e.vertices;neighbors[a].add(b);neighbors[b].add(a)
openverts={index[(side,lookup[i])] for i,k in enumerate(kinds) if k!='sewn' for side in range(2)}
for frame,coords in poses.items():
    for iteration in range(3):
        smooth=[]
        for i,p in enumerate(coords):
            avg=sum((coords[j] for j in neighbors[i]),Vector())/len(neighbors[i])
            smooth.append(p.lerp(avg,.45 if i in openverts else .13))
        coords=smooth
    poses[frame]=coords
for ob in colliders:bpy.data.objects.remove(ob,do_unlink=True)
for v,p in zip(me.vertices,poses[120]):v.co=p
obj.shape_key_add(name='Basis')
for name,coords in [('WindA',poses[102]),('WindB',poses[84]),('Worn',poses[160])]:
    k=obj.shape_key_add(name=name)
    for v,p in zip(k.data,coords):v.co=p
# Ribana is a continuous closed band projected onto the simulated cloth surface.
# Unlike v3's floating quads, both edges follow actual garment triangles in each pose.
neckadj={}
for i in neck:
    for side in range(2):
        a=index[(side,lookup[i])];b=index[(side,lookup[(i+1)%M])]
        neckadj.setdefault(a,set()).add(b);neckadj.setdefault(b,set()).add(a)
ring=[];q=next(iter(neckadj));previous=None
while q not in ring:
    ring.append(q);options=neckadj[q]-({previous} if previous is not None else set());n=next(iter(options));previous,q=q,n
assert len(ring)==len(neckadj),'Neckline must be one closed loop'
def rib_coords(coords):
    bvh=BVHTree.FromPolygons(coords,faces,all_triangles=True)
    center=sum((coords[i] for i in ring),Vector())/len(ring);out=[]
    for idx in ring:
        p=coords[idx];radial=Vector((p.x-center.x,p.y-center.y,0)).normalized()
        target=p+radial*.042+Vector((0,0,-.024))
        hit,normal,_,_=bvh.find_nearest(target)
        _,innernormal,_,_=bvh.find_nearest(p)
        out.extend([p+innernormal*.0012,hit+normal*.0015])
    return out
ribpos={name:rib_coords([v.co.copy() for v in obj.data.shape_keys.key_blocks[name].data]) for name in ['Basis','WindA','WindB','Worn']}
rf=[]
for i in range(len(ring)):
    j=(i+1)%len(ring);rf.append((2*i,2*i+1,2*j+1,2*j))
rm=bpy.data.meshes.new('Continuous surface fitted rib collar');rm.from_pydata(ribpos['Basis'],[],rf);rm.update()
ribuv=rm.uv_layers.new(name='UVMap')
for i,p in enumerate(rm.polygons):
    for li,uvco in zip(p.loop_indices,[(i/len(ring),0),(i/len(ring),1),((i+1)/len(ring),1),((i+1)/len(ring),0)]):ribuv.data[li].uv=uvco
rib=bpy.data.objects.new('Rib_collar_continuous',rm);bpy.context.collection.objects.link(rib);rm.materials.append(me.materials[4]);rib.shape_key_add(name='Basis')
for name in ['WindA','WindB','Worn']:
    k=rib.shape_key_add(name=name)
    for v,p in zip(k.data,ribpos[name]):v.co=p
for p in rm.polygons:
    p.use_smooth=True
    # Correct winding with the nearest cloth normal.
    c=p.center;bvh=BVHTree.FromPolygons(poses[120],faces,all_triangles=True);_,normal,_,_=bvh.find_nearest(c)
    if p.normal.dot(normal)<0:p.flip()
rm.update()
# Real textile thickness and round finish are baked identically for every pose.
def finish(ob,level):
    out=None;results={}
    sub=ob.modifiers.new('Smooth cotton surface','SUBSURF');sub.levels=level
    solid=ob.modifiers.new('Actual 1 mm fabric thickness','SOLIDIFY');solid.thickness=.004 if ob==obj else .0016;solid.offset=-.5;solid.material_offset=2;solid.material_offset_rim=2
    for name in ['Basis','WindA','WindB','Worn']:
        for k in ob.data.shape_keys.key_blocks:k.value=0
        if name!='Basis':ob.data.shape_keys.key_blocks[name].value=1
        bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();deps.update();ev=ob.evaluated_get(deps)
        if out is None:out=bpy.data.meshes.new_from_object(ev,preserve_all_data_layers=True,depsgraph=deps)
        results[name]=[v.co.copy() for v in ev.data.vertices]
    ob.modifiers.remove(sub);ob.modifiers.remove(solid)
    return out,results
source_mesh=obj.data
rib_source=rib.data
def export(level,suffix):
    for ob,src in [(obj,source_mesh),(rib,rib_source)]:
        ob.data=src
        out,result=finish(ob,level);ob.data=out;ob.shape_key_add(name='Basis')
        for name in ['WindA','WindB','Worn']:
            k=ob.shape_key_add(name=name)
            for v,p in zip(k.data,result[name]):v.co=p
        for f,a,b in [(1,0,0),(61,.22,0),(121,0,0),(181,0,.16),(241,0,0)]:
            for name,value in [('WindA',a),('WindB',b)]:
                k=ob.data.shape_keys.key_blocks[name];k.value=value;k.keyframe_insert(data_path='value',frame=f)
        ob.data.shape_keys.animation_data.action.name='Supported cotton settle '+ob.name
    scene.frame_set(1);bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);rib.select_set(True);bpy.context.view_layer.objects.active=obj
    bpy.ops.export_scene.gltf(filepath=str(ROOT/f'public/models/oversized-{NAME}-v4{suffix}.glb'),export_format='GLB',use_selection=True,export_animations=True,export_morph=True,export_morph_normal=True,export_materials='EXPORT',export_animation_mode='ACTIVE_ACTIONS')
export(0,'-mobile');export(1,'')
world=scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.65,.65,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5
def light(loc,power,size):
    bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.data.energy=power;l.data.size=size;l.rotation_euler=(Vector((0,0,0))-l.location).to_track_quat('-Z','Y').to_euler()
light((-3,-4,5),450,4);light((3,-2,2),180,3);light((0,3,3),250,3)
bpy.ops.object.camera_add(location=(0,-7,.1));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,-.05))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=3.65;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.resolution_x=1100;scene.render.resolution_y=1100;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.view_settings.view_transform='AgX'
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/f'model-source/zxxr-tailored-{NAME}-v4.blend'))
out=ROOT/'docs/previews/tailored-v4';out.mkdir(parents=True,exist_ok=True)
for side,angle in [('front',0),('back',math.pi),('profile',math.pi/2),('three-quarter',math.pi/5)]:
    obj.rotation_euler.z=rib.rotation_euler.z=angle;scene.render.filepath=str(out/f'{SLUG}-{side}.png');bpy.ops.render.render(write_still=True)
# Verify the unthickened sewing shell has only neck, hem and two sleeve loops.
edgecount={}
for p in source_mesh.polygons:
    for a,b in p.edge_keys:edgecount[(min(a,b),max(a,b))]=edgecount.get((min(a,b),max(a,b)),0)+1
adj={}
for (a,b),n in edgecount.items():
    if n==1:adj.setdefault(a,set()).add(b);adj.setdefault(b,set()).add(a)
loops=0;visited=set()
for v in adj:
    if v in visited:continue
    loops+=1;stack=[v]
    while stack:
        q=stack.pop()
        if q in visited:continue
        visited.add(q);stack.extend(adj[q]-visited)
manifest={'source':data['source'],'base':'own source-derived sewn shell','construction':'welded shoulder and side seams, continuous surface-fitted rib collar, actual thickness, invisible torso and upper-arm collision','openBoundaryLoops':loops,'physicsFrames':160,'widthMetresAssumedForPhysics':.82,'manufacturingMeasurements':False,'analyticInflation':False,'vertices':len(obj.data.vertices)}
(ROOT/f'docs/MODEL-{NAME}-v4.json').write_text(json.dumps(manifest,indent=2));print('TAILORED V4 COMPLETE',manifest,flush=True)
assert loops==4,f'Expected 4 garment openings, got {loops}'
