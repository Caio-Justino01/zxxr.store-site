"""Native oversized garment, editable morph targets and GLB. Run with Blender 4.5 LTS.
No visible mannequin: Worn is a precomputed change of the fabric surface itself.
"""
import bpy, math, os, json
from mathutils import Vector
from mathutils.geometry import delaunay_2d_cdt

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'public','models'); os.makedirs(OUT,exist_ok=True)
SOURCE=os.path.join(ROOT,'model-source');os.makedirs(SOURCE,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)

# Clockwise outline, with true openings at neck, hem and both sleeve cuffs.
corners=[(-1.02,-1.35),(1.02,-1.35),(1.02,.13),(1.43,.06),(1.64,.68),(.84,1.02),(.33,1.11)]
outline=[]; edge_types=[]
for i in range(len(corners)-1):
 a,b=corners[i],corners[i+1];steps=max(3,round(math.dist(a,b)/.045))
 for j in range(steps):
  t=j/steps;outline.append((a[0]*(1-t)+b[0]*t,a[1]*(1-t)+b[1]*t));edge_types.append('open' if i in (0,3) else 'side')
# curved neckline travels right to left
for j in range(25):
 t=j/24;x=.33-.66*t;y=1.11-.21*math.sin(math.pi*t)
 outline.append((x,y));edge_types.append('neck')
left=[(-.84,1.02),(-1.64,.68),(-1.43,.06),(-1.02,.13),(-1.02,-1.35)]
prev=(-.33,1.11)
for i,b in enumerate(left):
 steps=max(3,round(math.dist(prev,b)/.045))
 for j in range(1,steps+1):
  t=j/steps
  if i==len(left)-1 and j==steps:continue
  outline.append((prev[0]*(1-t)+b[0]*t,prev[1]*(1-t)+b[1]*t));edge_types.append('open' if i==2 else 'side')
 prev=b

def inside(x,y):
 c=False
 for i,a in enumerate(outline):
  b=outline[(i+1)%len(outline)]
  if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:c=not c
 return c

points=list(outline)
for iy in range(1,67):
 z=-1.35+iy*.037
 for ix in range(1,88):
  x=-1.64+ix*.037+(iy%2)*.0185
  if inside(x,z):points.append((x,z))
edges=[(i,(i+1)%len(outline)) for i in range(len(outline))]
res=delaunay_2d_cdt([Vector(p) for p in points],edges,[list(range(len(outline)))],1,1e-6)
pts,_,tris,orig,_,_=res
N=len(pts);verts=[];faces=[];matids=[];uvs=[]

def shape(x,z,side,worn=0,wind=0):
 # Dropped shoulder silhouette and elliptical body volume.
 ax=abs(x);body=max(0,1-(ax/1.06)**2)**.48
 sleeve=max(0,math.sin(math.pi*min(1,max(0,(z-.06)/.70))))
 upper=max(.40,min(1,(1.20-z)/.50))
 depth=((.065+.035*body)*(1-worn)+worn*(.075+.245*body if ax<1.02 else .145*sleeve+.024))*upper
 if side==0 and ax<.36 and z>.84:depth+=.045*max(0,1-(ax/.36)**2)
 folds=(.006*math.sin(x*17+4*math.sin(z*2))+.009*math.sin(x*8+z*3)+.003*math.sin(x*29-z*6))*(.65+max(0,1-z)*.18)
 depth+=folds
 dz=.0
 if side==1 and z>.86 and ax<.36:dz=.15*(1-(ax/.36)**2)*min(1,(z-.86)/.13)
 # Sleeves drop a little more when worn; torso settles into a natural hem.
 dz-=(.13+worn*.18)*max(0,(ax-.84)/.80)
 depth+=wind*.028*math.sin(x*4+z*3)*max(0,min(1,(1.03-z)/1.8))
 xx=x+wind*.017*math.sin(z*3+x)*max(0,1-z)/2
 return (xx,(-1 if side==0 else 1)*depth,z+dz+wind*.014*math.sin(x*4)*max(0,1-z)/2)

for side in range(2):
 for p in pts:verts.append(shape(p.x,p.y,side))
 for tri in tris:
  if len(tri)!=3:continue
  a,b,c=[pts[i] for i in tri];area=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
  seq=list(tri)
  if (area<0)==(side==0):seq.reverse()
  faces.append(tuple(i+side*N for i in seq));matids.append(side)
  uvs.append([((pts[i].x+1.64)/3.28 if side==0 else (1.64-pts[i].x)/3.28,(pts[i].y+1.35)/2.46) for i in seq])
# CDT may reorder vertices. Recover exact boundary indices from originating indices.
lookup={o:i for i,oset in enumerate(orig) for o in oset if o<len(outline)}
for i,kind in enumerate(edge_types):
 j=(i+1)%len(outline)
 if kind in ('open','neck'):continue
 a,b=lookup[i],lookup[j]
 faces.append((a,b,b+N,a+N));matids.append(2);uvs.append([(0,0),(1,0),(1,1),(0,1)])

mesh=bpy.data.meshes.new('Oversized_surface');mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new('ZXXR_Oversized',mesh);bpy.context.collection.objects.link(obj)
bpy.context.view_layer.objects.active=obj;obj.select_set(True)
for name in ['Front','Back','Seams']:
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(.80,.77,.67,1)
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.92
 if name in ('Front','Back'):
  tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(os.path.join(ROOT,'public','media','prints','boca-'+name.lower()+'.png'))
  m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
 else:bs.inputs['Base Color'].default_value=(.79,.75,.64,1)
 obj.data.materials.append(m)
for i,p in enumerate(mesh.polygons):p.material_index=matids[i];p.use_smooth=True
uv=mesh.uv_layers.new(name='UVMap')
for p,coords in zip(mesh.polygons,uvs):
 for li,co in zip(p.loop_indices,coords):uv.data[li].uv=co
obj.shape_key_add(name='Basis')
for name,worn,wind in [('Worn',1,0),('WindA',0,1),('WindB',0,-1)]:
 key=obj.shape_key_add(name=name)
 for side in range(2):
  for i,p in enumerate(pts):key.data[i+side*N].co=shape(p.x,p.y,side,worn,wind)
# Ribbed collar strip follows the opening, with its own shape keys.
neck=[i for i,k in enumerate(edge_types) if k=='neck']
def collar_coords(worn=0,wind=0):
 arr=[]
 for side in range(2):
  for i in neck:
   x,z=outline[i];a=Vector(shape(x,z,side,worn,wind))
   arr.append(tuple(a));a.z-=.043;arr.append(tuple(a))
 return arr
cv=collar_coords();cf=[];L=len(neck)*2
for side in range(2):
 for i in range(len(neck)-1):
  a=side*L+i*2;cf.append((a,a+1,a+3,a+2))
cm=bpy.data.meshes.new('Ribbed_collar');cm.from_pydata(cv,[],cf);cm.update()
collar=bpy.data.objects.new('Collar',cm);bpy.context.collection.objects.link(collar);collar.data.materials.append(obj.data.materials[2])
for p in cm.polygons:p.use_smooth=True
collar.shape_key_add(name='Basis')
for name,worn,wind in [('Worn',1,0),('WindA',0,1),('WindB',0,-1)]:
 key=collar.shape_key_add(name=name)
 for i,co in enumerate(collar_coords(worn,wind)):key.data[i].co=co
# Double-needle hems, cuffs and dropped-shoulder seams are geometry, not painted marks.
seam_params=[];seam_faces=[]
def seam_path(points,side,width=.002):
 start=len(seam_params)
 for x,z in points:
  seam_params.append((x,z-width,side));seam_params.append((x,z+width,side))
 for i in range(len(points)-1):
  a=start+i*2;seam_faces.append((a,a+1,a+3,a+2))
for side in range(2):
 for z in [-1.315,-1.298]:seam_path([(-1.00+2.00*i/60,z) for i in range(61)],side,.0018)
 for sign in [-1,1]:
  for off in [.025,.040]:seam_path([(sign*(1.43+.21*i/24-off),.06+.62*i/24) for i in range(25)],side,.0015)
  seam_path([(sign*(.84+.18*i/36),1.015-.88*i/36) for i in range(37)],side,.0016)
def seam_coords(worn=0,wind=0):
 result=[]
 for x,z,side in seam_params:
  p=Vector(shape(x,z,side,worn,wind));p.y+=(-1 if side==0 else 1)*.003;result.append(tuple(p))
 return result
sm=bpy.data.meshes.new('Double_needle_stitches');sm.from_pydata(seam_coords(),[],seam_faces);sm.update()
stitch=bpy.data.objects.new('Stitching',sm);bpy.context.collection.objects.link(stitch);stitch.data.materials.append(obj.data.materials[2]);stitch.shape_key_add(name='Basis')
for name,worn,wind in [('Worn',1,0),('WindA',0,1),('WindB',0,-1)]:
 key=stitch.shape_key_add(name=name)
 for i,co in enumerate(seam_coords(worn,wind)):key.data[i].co=co
for ob in [obj,collar,stitch]:
 for frame,a,b in [(1,0,0),(31,1,0),(61,0,0),(91,0,1),(121,0,0)]:
  for name,value in [('WindA',a),('WindB',b)]:
   k=ob.data.shape_keys.key_blocks[name];k.value=value;k.keyframe_insert(data_path='value',frame=frame)
 ob.data.shape_keys.animation_data.action.name='Breeze_'+ob.name

bpy.context.scene.frame_end=121;bpy.context.scene.render.fps=30;bpy.context.scene.frame_set(1)
bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);collar.select_set(True);stitch.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'oversized.glb'),export_format='GLB',use_selection=True,export_animations=True,export_morph=True,export_morph_normal=True,export_materials='EXPORT',export_animation_mode='ACTIVE_ACTIONS')

# Editable source + native studio renders used as HTML fallback and editorial photos.
world=bpy.context.scene.world;world.color=(1,1,1);world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(1,1,1,1);world.node_tree.nodes['Background'].inputs[1].default_value=.65
def area(name,loc,power,size):
 bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.name=name;l.data.energy=power;l.data.shape='DISK';l.data.size=size;l.rotation_euler=(Vector((0,0,0))-l.location).to_track_quat('-Z','Y').to_euler()
area('Softbox key',(-3,-4,5),450,5);area('Softbox fill',(3,-1,2),220,4);area('Back softbox',(1,4,3),300,3)
bpy.ops.object.camera_add(location=(.24,-5.8,.4));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=3.75;bpy.context.scene.camera=cam
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=900;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.view_settings.view_transform='AgX'
bpy.ops.file.pack_all();bpy.ops.file.make_paths_relative()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SOURCE,'zxxr-oversized.blend'))
proof=os.path.join(ROOT,'public','media','products');os.makedirs(proof,exist_ok=True)
for slug in ['boca','flores','me-preservando','spiritual-gangsta']:
 dark=slug=='spiritual-gangsta';color=(.022,.022,.025,1) if dark else (.80,.77,.67,1)
 for slot,name in [(0,'front'),(1,'back')]:
  nodes=obj.data.materials[slot].node_tree.nodes
  for node in nodes:
   if node.type=='TEX_IMAGE':node.image=bpy.data.images.load(os.path.join(ROOT,'public','media','prints',slug+'-'+name+'.png'),check_existing=True)
 obj.data.materials[2].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=color
 for side in ['front','back']:
  obj.rotation_euler.z=0 if side=='front' else math.pi;collar.rotation_euler.z=obj.rotation_euler.z;stitch.rotation_euler.z=obj.rotation_euler.z
  scene.render.filepath=os.path.join(proof,slug+'-'+side+'.png');bpy.ops.render.render(write_still=True)
print('ZXXR model exported:',len(verts),'vertices;',len(faces),'faces; 3 morph targets; breeze animation; 8 renders.')
