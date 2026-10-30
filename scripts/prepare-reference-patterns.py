"""Derive native UV images and sewing outlines from the client's clean mockups.
No generative redraw, font substitution or invented print detail.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
import json, math
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/media/reference-v3';OUT.mkdir(parents=True,exist_ok=True)
PAT=ROOT/'model-source/patterns-v3';PAT.mkdir(parents=True,exist_ok=True)
items=[('boca','3296'),('flores','3282'),('me-preservando','3283'),('spiritual-gangsta','3281'),('zxxr-rosa','3271')]

def outline(mask):
    # Directed cell edges give the true concave armhole, unlike a row bounding box.
    adjacent={}
    padded=np.pad(mask,1)
    neighbors=[padded[:-2,1:-1],padded[1:-1,2:],padded[2:,1:-1],padded[1:-1,:-2]]
    for edge,n in enumerate(neighbors):
        ys,xs=np.where(mask & ~n)
        for x,y in zip(xs.tolist(),ys.tolist()):
            a,b=[((x,y),(x+1,y)),((x+1,y),(x+1,y+1)),((x+1,y+1),(x,y+1)),((x,y+1),(x,y))][edge]
            adjacent.setdefault(a,[]).append(b)
    loops=[]
    while adjacent:
        start=next(iter(adjacent));p=start;loop=[]
        while p in adjacent:
            loop.append(p);options=adjacent[p];n=options.pop()
            if not options:del adjacent[p]
            p=n
            if p==start:break
        if len(loop)>10:loops.append(loop)
    def area(l):return abs(sum(l[i][0]*l[(i+1)%len(l)][1]-l[(i+1)%len(l)][0]*l[i][1] for i in range(len(l))))
    return max(loops,key=area)

def rdp(points,eps):
    a=np.array(points[0],float);b=np.array(points[-1],float)
    v=b-a;length=np.linalg.norm(v)
    if len(points)<3:return points
    q=np.array(points,float)-a
    distances=np.linalg.norm(q,axis=1) if length<1e-5 else np.abs(v[0]*q[:,1]-v[1]*q[:,0])/length
    i=int(np.argmax(distances))
    if distances[i]>eps:return rdp(points[:i+1],eps)[:-1]+rdp(points[i:],eps)
    return [points[0],points[-1]]

manifest=[]
for slug,number in items:
    file=ROOT/'public/media/source'/f'IMG_{number} 1.jpg'
    image=Image.open(file).convert('RGB');w,h=image.size
    views=[]
    for side,top,bottom in [('front',0,h//2),('back',h//2,h)]:
        crop=image.crop((0,top,w,bottom));rgb=np.asarray(crop)
        mask=rgb.min(axis=2)<244
        contour=outline(mask)
        x0=min(p[0] for p in contour);x1=max(p[0] for p in contour)
        y0=min(p[1] for p in contour);y1=max(p[1] for p in contour)
        cut=crop.crop((x0,y0,x1,y1))
        # Alpha follows the exterior contour, including light pixels in the print.
        local=[(x-x0,y-y0) for x,y in contour]
        alpha=Image.new('L',cut.size);ImageDraw.Draw(alpha).polygon(local,fill=255)
        gallery=cut.convert('RGBA');gallery.putalpha(alpha)
        gallery.save(OUT/f'{slug}-{side}.png',optimize=True)
        # UV bleed outside the sewing outline prevents white fringes at seams.
        # Only exterior pixels change; all garment and print pixels stay intact.
        tex=np.array(cut)
        # Twelve source pixels of texture bleed also accommodate the slightly
        # different front/back sewing outlines. This is outside the print area.
        am=np.array(alpha.filter(ImageFilter.MinFilter(25)))>0
        for yy in range(cut.height):
            xx=np.flatnonzero(am[yy])
            if len(xx):
                tex[yy,:xx[0]]=tex[yy,min(xx[-1],xx[0]+5)]
                tex[yy,xx[-1]+1:]=tex[yy,max(xx[0],xx[-1]-5)]
        cut=Image.fromarray(tex)
        # Full source resolution is retained in the main UV texture.
        cut.save(OUT/f'{slug}-{side}.webp',lossless=True,quality=100,method=6)
        small=cut.copy();small.thumbnail((1024,1024),Image.Resampling.LANCZOS)
        small.save(OUT/f'{slug}-{side}-small.webp',quality=96,method=6)
        contour=[(x-x0,y-y0) for x,y in contour]
        k=max(range(len(contour)),key=lambda i:contour[i][0])
        ordered=contour[k:]+contour[:k]
        j=max(range(len(ordered)),key=lambda i:math.dist(ordered[0],ordered[i]))
        simplified=rdp(ordered[:j+1],1.4)[:-1]+rdp(ordered[j:]+[ordered[0]],1.4)[:-1]
        views.append({'side':side,'box':[x0,top+y0,x1-x0,y1-y0],'width':cut.width,'height':cut.height,'outline':simplified})
        print(slug,side,cut.size,'outline',len(simplified),flush=True)
    data={'id':slug,'source':file.name,'originalSize':[w,h],'views':views}
    (PAT/f'{slug}.json').write_text(json.dumps(data,indent=2),encoding='utf-8')
    manifest.append(data)
(ROOT/'docs/REFERENCE-MANIFEST-v3.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
