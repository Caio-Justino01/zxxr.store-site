"""Photographic sky layers v5. No generated imagery or garment filtering.

Run with project Python (Pillow/Numpy). The official CC0 HDRI is preserved under
public/media/clouds-v5/source. A Blender subprocess only decodes RGBE/linear HDR;
all projection, chroma-alpha extraction and encoding are deterministic here.
"""
from pathlib import Path
import sys,json,math,hashlib,subprocess,struct,zlib
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/media/clouds-v5';SOURCE=OUT/'source'
HDR=SOURCE/'kloofendal_48d_partly_cloudy_puresky_4k.hdr'
NATIVE=SOURCE/'sky-native-tonemapped-4k.png'


def write_png(path,pixels):
    height,width,_=pixels.shape
    def chunk(tag,data):return struct.pack('>I',len(data))+tag+data+struct.pack('>I',zlib.crc32(tag+data)&0xffffffff)
    raw=b''.join(b'\x00'+row.tobytes() for row in pixels)
    path.write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',width,height,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw,7))+chunk(b'IEND',b''))


if '--decode' in sys.argv:
    import bpy
    image=bpy.data.images.load(str(HDR));w,h=image.size
    rgb=np.array(image.pixels[:],dtype=np.float32).reshape(h,w,4)[:,:,:3]
    lum=np.sum(rgb*np.array([.2126,.7152,.0722]),axis=-1)
    exposure=.44/float(np.percentile(lum[h//2:,:],50))
    light=lum*exposure;compressed=light/(1+light)
    rgb=np.clip(rgb*exposure*(compressed/np.maximum(light,1e-8))[...,None],0,.93)
    rgb=np.where(rgb<=.0031308,rgb*12.92,1.055*np.power(rgb,1/2.4)-.055)
    # Paint-like vivid blue, selectively. Neutral photographic cloud pixels
    # remain white/grey; their shapes and captured shading are not redrawn.
    blue=np.clip((rgb[:,:,2]-rgb[:,:,0]-.12)/.24,0,1)
    vivid=np.clip(rgb*np.array([.46,1.06,1.20]),0,1)
    rgb=np.clip(rgb*(1-blue[...,None])+vivid*blue[...,None],0,1)
    write_png(NATIVE,(np.flipud(rgb)*255).astype(np.uint8))
    print('DECODED_PHOTOGRAPHIC_SKY',NATIVE,flush=True)
    raise SystemExit(0)

from PIL import Image,ImageFilter,ImageDraw
OUT.mkdir(exist_ok=True,parents=True);SOURCE.mkdir(exist_ok=True)
assert HDR.exists(),'Download the official CC0 source specified in docs/CLOUDS-v5.md first.'
if not NATIVE.exists():
    blender=ROOT.parent/'.tools/blender-4.5.9-windows-x64/blender.exe'
    subprocess.run([str(blender),'--background','--threads','6','--python',str(Path(__file__).resolve()),'--','--decode'],check=True)
raw=np.array(Image.open(NATIVE).convert('RGB'),dtype=np.float32)/255
H,W=raw.shape[:2]


def photo_projection(azimuth,elevation,hfov,width=1920,height=1280):
    # A photographic perspective view, never a room, horizon or 3D skybox.
    # Every output ray samples only the real sky hemisphere of the capture.
    a,e=math.radians(azimuth),math.radians(elevation)
    forward=np.array([math.sin(a)*math.cos(e),math.cos(a)*math.cos(e),math.sin(e)])
    right=np.array([math.cos(a),-math.sin(a),0])
    up=np.cross(right,forward)
    sx=np.linspace(-1,1,width)*math.tan(math.radians(hfov)/2)
    sy=np.linspace(1,-1,height)*math.tan(math.radians(hfov)/2)*height/width
    xx,yy=np.meshgrid(sx,sy)
    direction=forward+xx[...,None]*right+yy[...,None]*up
    direction/=np.linalg.norm(direction,axis=-1,keepdims=True)
    theta=np.arctan2(direction[:,:,0],direction[:,:,1])
    elev=np.arcsin(np.clip(direction[:,:,2],-1,1))
    assert elev.min()>math.radians(1),'The photographic frame must stay above the horizon'
    u=np.mod(theta/math.tau+.5,1)*(W-1);v=(.5-elev/math.pi)*(H-1)
    ix=np.floor(u).astype(int);iy=np.floor(v).astype(int);tx=u-ix;ty=v-iy
    ix1=(ix+1)%W;iy1=np.minimum(iy+1,H-1)
    result=raw[iy,ix]*(1-tx[...,None])*(1-ty[...,None])+raw[iy,ix1]*tx[...,None]*(1-ty[...,None])+raw[iy1,ix]*(1-tx[...,None])*ty[...,None]+raw[iy1,ix1]*tx[...,None]*ty[...,None]
    return np.clip(result,0,1)


def smooth(a,b,x):
    t=np.clip((x-a)/(b-a),0,1);return t*t*(3-2*t)


def components(mask):
    height,width=mask.shape;flat=mask.ravel();seen=np.zeros(flat.size,dtype=bool);result=[]
    for seed in np.flatnonzero(flat):
        if seen[seed]:continue
        stack=[int(seed)];seen[seed]=True;indices=[];lo_x=width;lo_y=height;hi_x=hi_y=0
        while stack:
            i=stack.pop();indices.append(i);y,x=divmod(i,width)
            lo_x=min(lo_x,x);hi_x=max(hi_x,x);lo_y=min(lo_y,y);hi_y=max(hi_y,y)
            for j,valid in ((i-1,x>0),(i+1,x<width-1),(i-width,y>0),(i+width,y<height-1)):
                if valid and flat[j] and not seen[j]:seen[j]=True;stack.append(j)
        result.append({'indices':np.array(indices,dtype=np.int32),'box':(lo_x,lo_y,hi_x+1,hi_y+1),'size':len(indices),'border':lo_x==0 or lo_y==0 or hi_x==width-1 or hi_y==height-1})
    return sorted(result,key=lambda c:c['size'],reverse=True)


def grow(mask,steps=12):
    for _ in range(steps):
        pad=np.pad(mask,1)
        mask=np.logical_or.reduce([pad[dy:dy+mask.shape[0],dx:dx+mask.shape[1]] for dy in range(3) for dx in range(3)])
    return mask


def cloud_alpha(rgb,edgefade=0,remove_partial=False):
    # Photographic blue-screen key. Preserve captured white/blue-grey cloud
    # tonal variation, and discard the blue photographic atmosphere only.
    r,g,b=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
    blue=b-(r+g)*.5
    whiteness=np.minimum(r,g)
    alpha=(1-smooth(.10,.275,blue))*smooth(.25,.59,whiteness)
    alpha=np.clip(alpha,0,1)
    if remove_partial:
        # Reject photographed cloud groups cut by the frame. A transparent
        # partial puff would otherwise expose a straight horizontal crop edge.
        reject=np.zeros(alpha.shape,dtype=bool)
        for group in components(alpha>.16):
            if group['border']:reject.ravel()[group['indices']]=True
        alpha[grow(reject,10)]=0
    if edgefade:
        h,w=alpha.shape;x=np.minimum(np.arange(w),np.arange(w)[::-1]);y=np.minimum(np.arange(h),np.arange(h)[::-1])
        edge=np.minimum(y[:,None],x[None,:])/max(1,min(h,w)*edgefade)
        alpha*=smooth(0,1,edge)
    # A subpixel feather removes chroma aliasing without cartoon silhouettes.
    a=Image.fromarray((alpha*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.65))
    alpha=np.asarray(a).astype(np.float32)/255
    # Remove the blue plate at fractional edges by solving the photographed
    # mixture against a local blue key; body RGB/shading stays photographic.
    key=np.array([.15,.39,.72])
    unmix=(rgb-key[None,None,:]*(1-alpha[...,None]))/np.maximum(alpha[...,None],.14)
    blend=smooth(.08,.62,alpha)[...,None]
    color=np.clip(rgb*(1-blend)+unmix*blend,0,1)
    return np.dstack([color,alpha])


def isolated_close_clouds(rgb):
    rgba=cloud_alpha(rgb)
    groups=[g for g in components(rgba[:,:,3]>.28) if not g['border'] and g['size']>1200]
    assert len(groups)>=2,'Need two complete photographed clouds'
    first=groups[0]
    x0=sum(first['box'][::2])*.5
    second=next((g for g in groups[1:] if abs(sum(g['box'][::2])*.5-x0)>rgb.shape[1]*.13),groups[1])
    selected=sorted([first,second],key=lambda g:g['box'][0])
    crops=[]
    for group in selected:
        x0,y0,x1,y1=group['box'];pad=35
        box=(max(0,x0-pad),max(0,y0-pad),min(rgb.shape[1],x1+pad),min(rgb.shape[0],y1+pad))
        mask=np.zeros(rgba.shape[:2],dtype=bool);mask.ravel()[group['indices']]=True
        local=grow(mask[box[1]:box[3],box[0]:box[2]],22)
        feather=Image.fromarray((local*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3))
        crop=rgba[box[1]:box[3],box[0]:box[2]].copy();crop[:,:,3]*=np.asarray(feather)/255
        # Discard neighbouring partial puffs admitted by the feather radius.
        # Keep the complete photographed cloud group, not a cropped neighbour.
        pieces=components(crop[:,:,3]>.08)
        if pieces:
            complete=np.zeros(crop.shape[:2],dtype=bool);complete.ravel()[pieces[0]['indices']]=True
            keep=Image.fromarray((grow(complete,4)*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1))
            crop[:,:,3]*=np.asarray(keep)/255
        crops.append(crop)
    return crops


records=[]
def save(name,data,mobile_max,quality=91):
    pixels=(np.clip(data,0,1)*255).astype(np.uint8)
    image=Image.fromarray(pixels,'RGBA' if pixels.shape[2]==4 else 'RGB')
    desktop=OUT/f'{name}.webp';image.save(desktop,quality=quality,method=6,exact=True)
    mobile=image.copy();mobile.thumbnail(mobile_max,Image.Resampling.LANCZOS)
    mobilepath=OUT/f'{name}-mobile.webp';mobile.save(mobilepath,quality=85,method=6,exact=True)
    records.append({'id':name,'desktop':{'file':desktop.name,'size':list(image.size),'bytes':desktop.stat().st_size},'mobile':{'file':mobilepath.name,'size':list(mobile.size),'bytes':mobilepath.stat().st_size},'alpha':pixels.shape[2]==4})
    return image


far=photo_projection(210,46,94)
mid=photo_projection(238,42,90)
left,right=isolated_close_clouds(raw[:H//2])
save('distant-sky',far,(960,640),93)
save('mid-clouds',cloud_alpha(mid,.075,remove_partial=True),(960,640),92)
save('near-left',left,(640,260),94)
save('near-right',right,(640,290),94)

# An inspection sheet only: the deliverable layers keep their real alpha.
sheet=Image.new('RGB',(1200,1250),'#124dab');draw=ImageDraw.Draw(sheet)
for i,record in enumerate(records):
    im=Image.open(OUT/record['desktop']['file']).convert('RGBA');im.thumbnail((1160,260))
    x=20;y=30+i*310
    draw.text((20,y-20),record['id']+' — photographic layer',fill='white')
    sheet.paste(im,(x,y),im)
sheet.save(OUT/'inspection-sheet.jpg',quality=92)
manifest={'version':5,'direction':'Three photographic depth layers, sky only; no room/grass/floor, no generative imagery.',
          'source':{'name':'Kloofendal 48d Partly Cloudy (Pure Sky)','authors':['Greg Zaal','Jarod Guest'],'url':'https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky','download':'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/4k/kloofendal_48d_partly_cloudy_puresky_4k.hdr','license':'CC0','licenseUrl':'https://polyhaven.com/license','downloaded':'2026-10-19','sha256':hashlib.sha256(HDR.read_bytes()).hexdigest(),'nativeHDRSize':[W,H]},
          'process':'HDR luminance compression and selective blue grading; photographic perspective projection; blue chroma alpha with subpixel feather; no generated/invented cloud contours. No garment files or filters changed.',
          'runtimeAssets':records,'sourceFilesNotLoadedByComponent':['source/'],'inspectionOnly':'inspection-sheet.jpg'}
(ROOT/'docs/CLOUDS-v5-manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False),encoding='utf-8')
print('CLOUD_LAYERS_V5_COMPLETE',records,flush=True)
