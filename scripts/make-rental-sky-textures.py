"""Original plaster/cement maps for the physical 'Ceu de aluguel' set.

The final sky is projected separately from a real CC0 pure-sky photograph by
project-photographic-sky.py. If that output exists it replaces the legacy color
study here. Downloaded Poly Haven grass maps are compressed separately below.
Run with the project's Python runtime before build-rental-sky-studio.py.
"""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/media/sky-studio-v4'
OUT.mkdir(parents=True, exist_ok=True)
RNG = np.random.default_rng(48219)


def noise3(x, y, z, scale=1, seed=1):
    """Smooth deterministic value noise with an unbounded world-coordinate hash."""
    x, y, z = x * scale, y * scale, z * scale
    ix, iy, iz = np.floor(x), np.floor(y), np.floor(z)
    tx, ty, tz = x - ix, y - iy, z - iz
    tx, ty, tz = [t*t*(3-2*t) for t in (tx, ty, tz)]
    out = np.zeros_like(x)
    for a in (0, 1):
        for b in (0, 1):
            for c in (0, 1):
                h = np.sin((ix+a)*127.1 + (iy+b)*311.7 + (iz+c)*74.7 + seed*19.19)*43758.5453
                h -= np.floor(h)
                out += h * (tx if a else 1-tx) * (ty if b else 1-ty) * (tz if c else 1-tz)
    return out


def smooth(a, b, x):
    t = np.clip((x-a)/(b-a), 0, 1)
    return t*t*(3-2*t)


def normal_map(height, strength=2.2):
    dy,dx=np.gradient(height.astype(np.float32)/255)
    normal=np.stack([-dx*strength,dy*strength,np.ones_like(dx)],axis=-1)
    normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
    return ((normal*.5+.5)*255).astype(np.uint8)


# Clustered brush-like cloud shapes occupy the physical surfaces of the set.
# Their centres are in Blender coordinates: back wall y=3, ceiling z=7.
clusters = [
    (-6.8, 3.1, 5.65, 2.4, .95), (-1.2, 3.1, 6.65, 2.0, .67),
    (5.6, 3.1, 5.0, 2.45, .85), (-7.9, 3.1, 1.3, 2.0, 1.0),
    (7.3, 3.1, .9, 2.5, .85), (1.9, 3.1, 2.35, 1.75, .62),
    (-9.0, -.2, 4.8, 2.3, .95), (-9, -2.5, 1.8, 1.7, .83),
    (9, .1, 5.8, 1.95, .9), (9, -2.0, 2.6, 2.15, .87),
    (-5, .2, 7, 2.5, .8), (2.7, -1.2, 7, 2.3, .9),
]
lobes = []
for cx, cy, cz, width, strength in clusters:
    for j in range(7):
        # Full 3D lobes make the mural meet exactly across the room's corners.
        lobes.append((cx+RNG.normal(0,width*.49), cy+RNG.normal(0,.48),
                      cz+RNG.normal(0,.44), width*RNG.uniform(.45,.78),
                      RNG.uniform(1.05,1.6), RNG.uniform(.35,.73), strength))


def mural(x, y, z):
    low = noise3(x,y,z,.40,3)
    mid = noise3(x,y,z,2.8,5)
    fine = noise3(x,y,z,18,9)
    grain = noise3(x,y,z,96,19)
    wx = x + (noise3(x,y,z,1.9,31)-.5)*.68
    wy = y + (noise3(x,y,z,1.9,32)-.5)*.50
    wz = z + (noise3(x,y,z,2.1,33)-.5)*.40
    cloud = np.zeros_like(x)
    for cx,cy,cz,rx,ry,rz,strength in lobes:
        field=np.exp(-(((wx-cx)/rx)**2 + ((wy-cy)/ry)**2 + ((wz-cz)/rz)**2)*1.25)*strength
        cloud += field*.57
    cloud += (mid-.5)*.16 + (noise3(x,y,z,7.7,51)-.5)*.075 + (fine-.5)*.034
    edge_density=cloud.copy()
    cloud = smooth(.18, .72, cloud)
    # The bottom is a lightly faded turquoise blue, not a distant horizon.
    t = np.clip(z/7, 0, 1)
    sky = np.array([.22,.62,.73])[None,None,:]*(1-t[...,None]) + np.array([.16,.40,.70])[None,None,:]*t[...,None]
    sky *= (.94 + low*.13)[...,None]
    shadow=(1-smooth(.18,1.4,edge_density))*.07
    cloud_tone = np.stack([.935+mid*.055-shadow, .94+mid*.05-shadow, .92+mid*.075-shadow*.72],axis=-1)
    color = sky*(1-cloud[...,None]) + cloud_tone*cloud[...,None]
    # Uneven plaster and dry brush tooth remain visible under both paint colors.
    tooth=(fine-.5)*.026+(grain-.5)*.016
    color += tooth[...,None]
    # A few very subdued repairs, rather than uniformly distressed decoration.
    repair=noise3(x,y,z,.7,77)
    repair=smooth(.70,.83,repair)*.035
    color = color*(1-repair[...,None])+np.array([.66,.68,.63])*repair[...,None]
    # Shallow lime-mortar courses: world height is shared at every corner.
    course=np.minimum(np.mod(z+.03,.48), .48-np.mod(z+.03,.48))
    row=np.floor((z+.03)/.48)
    around=x+y
    stagger=np.mod(around+np.mod(row,2)*.62,1.24)
    joint=(1-smooth(.003,.012,course))*.020
    joint+=((1-smooth(.003,.010,np.minimum(stagger,1.24-stagger))))*.006
    color-=joint[...,None]
    height=.52 + (fine-.5)*.10 + (grain-.5)*.045-joint*3
    return np.clip(color,0,1),height


N=1024
u,v=np.meshgrid(np.linspace(0,1,N),np.linspace(1,0,N))
surfaces=[
    (-9+18*u,np.full_like(u,3),7*v),
    (np.full_like(u,-9),-5+8*u,7*v),
    (np.full_like(u,9),3-8*u,7*v),
    (-9+18*u,3-8*v,np.full_like(u,7)),
]
atlas=np.zeros((N*2,N*2,3),dtype=np.uint8)
heights=np.zeros((N*2,N*2),dtype=np.uint8)
for i,coords in enumerate(surfaces):
    print('Mural panel',i,flush=True)
    color,height=mural(*coords)
    r,c=divmod(i,2)
    atlas[r*N:(r+1)*N,c*N:(c+1)*N]=(color*255).astype(np.uint8)
    heights[r*N:(r+1)*N,c*N:(c+1)*N]=(np.clip(height,0,1)*255).astype(np.uint8)
Image.fromarray(atlas).save(OUT/'painted-sky-atlas.jpg',quality=95,subsampling=0,optimize=True)
Image.fromarray(heights).save(OUT/'plaster-height.png',optimize=True)
normals=np.zeros_like(atlas)
for i in range(4):
    r,c=divmod(i,2)
    normals[r*N:(r+1)*N,c*N:(c+1)*N]=normal_map(heights[r*N:(r+1)*N,c*N:(c+1)*N],3.6)
Image.fromarray(normals).resize((1024,1024),Image.Resampling.BOX).save(OUT/'plaster-normal.png',optimize=True)

# Floor and the grass mat are original material maps as well.
x,y=np.meshgrid(np.linspace(-9,9,N),np.linspace(-5,4,N))
z=np.zeros_like(x)
f=noise3(x,y,z,.7,15)*.4+noise3(x,y,z,3.8,16)*.22+noise3(x,y,z,43,17)*.15
floor=np.stack([.34+f*.19,.335+f*.19,.315+f*.19],axis=-1)
scratches=(1-smooth(.004,.012,np.abs(np.sin(x*.42+y*.13+.5))))*.012
floor-=scratches[...,None]
Image.fromarray((np.clip(floor,0,1)*255).astype(np.uint8)).save(OUT/'cement-color.jpg',quality=94,optimize=True)
floor_height=.5+(noise3(x,y,z,43,17)-.5)*.25+(noise3(x,y,z,4,16)-.5)*.08
Image.fromarray((floor_height*255).astype(np.uint8)).save(OUT/'cement-height.png',optimize=True)
Image.fromarray(normal_map(floor_height*255,4.0)).resize((512,512),Image.Resampling.BOX).save(OUT/'cement-normal.png',optimize=True)

S=512
x,y=np.meshgrid(np.linspace(-8,8,S),np.linspace(-1,3,S))
z=np.zeros_like(x)
n=noise3(x,y,z,2.3,21)
grain=noise3(x,y,z,51,22)
turf=np.stack([.115+n*.16+grain*.05,.17+n*.19+grain*.07,.035+n*.055],axis=-1)
Image.fromarray((np.clip(turf,0,1)*255).astype(np.uint8)).save(OUT/'turf-base.jpg',quality=94,optimize=True)
print('Original local material maps:',OUT,flush=True)

photographic=OUT/'photographic-sky-atlas-2k.png'
if photographic.exists():
    Image.open(photographic).save(OUT/'painted-sky-atlas.jpg',quality=94,subsampling=0,optimize=True)

# Preserve downloaded grass originals; create compressed runtime copies and a
# smaller mobile map set. Download locations and CC0 provenance are documented.
grass_inputs=[('leafy-grass-diff-2k.jpg','grass-color-2k.jpg',91),
              ('leafy-grass-normal-1k.jpg','grass-normal-1k.jpg',94)]
for source,dest,quality in grass_inputs:
    if (OUT/source).exists():
        Image.open(OUT/source).save(OUT/dest,quality=quality,optimize=True)
mobile=OUT/'mobile';mobile.mkdir(exist_ok=True)
for name in ['painted-sky-atlas.jpg','plaster-normal.png','cement-color.jpg',
             'cement-normal.png','grass-color-2k.jpg','grass-normal-1k.jpg']:
    if not (OUT/name).exists():continue
    image=Image.open(OUT/name)
    size=512 if 'normal' in name or name=='cement-color.jpg' else 1024
    image.thumbnail((size,size),Image.Resampling.LANCZOS)
    suffix='png' if 'normal' in name else 'jpg'
    target=mobile/(Path(name).stem+'.'+suffix)
    if suffix=='png':image.save(target,optimize=True)
    else:image.save(target,quality=89,optimize=True)
