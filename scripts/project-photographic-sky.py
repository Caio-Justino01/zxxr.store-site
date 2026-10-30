"""Project a real CC0 pure-sky photograph onto a physical painted room.

Blender reads the original HDR. It is converted to a bounded reflectance map,
not used as a lighting environment. World-coordinate projection is continuous
across side/rear/ceiling corners. No landscape, procedural cloud shapes, or
generated photographs are used.
"""
import bpy, numpy as np, math, zlib, struct, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/media/sky-studio-v4'
SOURCE=OUT/'kloofendal_48d_partly_cloudy_puresky_2k.hdr'


def png(path,pixels):
    h,w,_=pixels.shape
    def chunk(tag,data):return struct.pack('>I',len(data))+tag+data+struct.pack('>I',zlib.crc32(tag+data)&0xffffffff)
    raw=b''.join(b'\x00'+row.tobytes() for row in pixels)
    path.write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw,7))+chunk(b'IEND',b''))


im=bpy.data.images.load(str(SOURCE),check_existing=False)
w,h=im.size
rgb=np.array(im.pixels[:],dtype=np.float32).reshape(h,w,4)[:,:,:3]
# Image pixels are bottom-up. Pure-sky upper hemisphere is the upper half.
lum=np.sum(rgb*np.array([.2126,.7152,.0722]),axis=-1)
e=.42/float(np.percentile(lum[h//2:,:],50))
l=lum*e
mapped=l/(1+l)
rgb=rgb*e*(mapped/np.maximum(l,1e-8))[...,None]
rgb=np.clip(rgb,0,.91)
rgb=np.where(rgb<=.0031308,rgb*12.92,1.055*np.power(rgb,1/2.4)-.055)
rgb=np.clip(rgb,0,1)
# Blue wall pigment is more saturated than a photographed illumination dome.
# Selective blue grading leaves neutral cloud whites neutral.
blue=np.clip((rgb[:,:,2]-rgb[:,:,0])*6,0,1)
pigment=np.clip(rgb*np.array([.65,1.15,1.15]),0,1)
rgb=rgb*(1-blue[...,None])+pigment*blue[...,None]
png(OUT/'photographic-sky-tonemapped-2k.png',(np.flipud(rgb)*255).astype(np.uint8))


def sample(x,y,z):
    # Centre below the room means even its low walls sample actual sky, not the
    # horizon. The projection uses one origin across all surfaces.
    dx=x;dy=y+12;dz=z+1.5
    radius=np.sqrt(dx*dx+dy*dy+dz*dz)
    theta=np.arctan2(dx,dy)+math.radians(112)
    elevation=np.arcsin(np.clip(dz/radius,-1,1))
    uu=np.mod(theta/(2*math.pi)+.5,1)*(w-1)
    vv=(.5+elevation/math.pi)*(h-1)
    ix=np.floor(uu).astype(int);iy=np.floor(vv).astype(int)
    tx=uu-ix;ty=vv-iy
    ix1=(ix+1)%w;iy1=np.minimum(iy+1,h-1)
    color=rgb[iy,ix]*(1-tx[...,None])*(1-ty[...,None])+rgb[iy,ix1]*tx[...,None]*(1-ty[...,None])+rgb[iy1,ix]*(1-tx[...,None])*ty[...,None]+rgb[iy1,ix1]*tx[...,None]*ty[...,None]
    # Painted material: reduce perfect digital smoothness with restrained tooth
    # and mortar, while retaining the photographic cloud detail.
    tooth=np.sin(x*143.7+y*157.3+z*83.1)*np.sin(x*76.3-y*97.7+z*117.1)*.0038
    course=np.minimum(np.mod(z+.03,.48),.48-np.mod(z+.03,.48))
    joint=np.exp(-(course/.006)**2)*.007
    color=np.clip(color+tooth[...,None]-joint[...,None],0,1)
    return color


N=1024;u,v=np.meshgrid(np.linspace(0,1,N),np.linspace(1,0,N))
surfaces=[(-9+18*u,np.full_like(u,3),7*v),
          (np.full_like(u,-9),-5+8*u,7*v),
          (np.full_like(u,9),3-8*u,7*v),
          (-9+18*u,3-8*v,np.full_like(u,7))]
atlas=np.zeros((2048,2048,3),dtype=np.uint8)
for i,surface in enumerate(surfaces):
    r,c=divmod(i,2);atlas[r*N:(r+1)*N,c*N:(c+1)*N]=(sample(*surface)*255).astype(np.uint8)
png(OUT/'photographic-sky-atlas-2k.png',atlas)
(ROOT/'docs/PHOTOGRAPHIC-SKY-v4.json').write_text(json.dumps({
    'asset':'Kloofendal 48d Partly Cloudy (Pure Sky)',
    'url':'https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky',
    'authors':['Greg Zaal','Jarod Guest'],'license':'CC0',
    'licenseUrl':'https://polyhaven.com/license','downloaded':'2026-10-19',
    'source':str(SOURCE.relative_to(ROOT)).replace('\\','/'),
    'usage':'Tone-mapped bounded albedo photograph projected onto painted physical walls/ceiling; not an illumination/environment map.',
    'atlasMax':2048,'worldOriginBlender':[0,-12,-1.5],'rotationDegrees':112,
    'projection':'Shared equirectangular direction projection; exact same source coordinates on shared room edges.',
    'changes':'HDR exposure/luminance compression, SRGB encoding, subtle paint tooth/mortar overlay, web JPEG compression.'
},indent=2),encoding='utf-8')
print('PHOTOGRAPHIC_SKY_PROJECTED',OUT,flush=True)
