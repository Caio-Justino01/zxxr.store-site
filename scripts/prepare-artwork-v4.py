"""Separate original print pixels from the client's native UV crops.

This is a technical extraction, not a redraw or resolution enhancement. RGB
samples remain byte-for-byte identical wherever the resulting alpha is nonzero.
Run with the project's Python runtime (Pillow and NumPy).
"""
from pathlib import Path
from collections import deque
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'public/media/reference-v3'
OUT = ROOT / 'public/media/artwork-v4'
PROOF = ROOT / 'docs/previews'
OUT.mkdir(parents=True, exist_ok=True)
PROOF.mkdir(parents=True, exist_ok=True)

# Pixel coordinates are relative to each native reference-v3 crop, not an
# invented common atlas. Bounds exclude collars, hems and garment seams.
REGIONS = {
    'boca-front': {'roi': [435, 170, 518, 211], 'method': 'red-and-black-logo'},
    'boca-back': {'roi': [286, 163, 620, 568], 'method': 'black-silhouette-with-white-interior'},
    'flores-front': {'roi': [348, 174, 586, 416], 'method': 'red'},
    'flores-back': {'roi': [425, 49, 485, 83], 'method': 'red'},
    'me-preservando-front': {'roi': [575, 167, 633, 218], 'method': 'red'},
    'me-preservando-back': {'roi': [164, 108, 753, 202], 'method': 'red'},
    'spiritual-gangsta-front': {'roi': [326, 132, 444, 178], 'method': 'red'},
    'spiritual-gangsta-back': {'roi': [127, 64, 602, 181], 'method': 'red'},
    'zxxr-rosa-front': {'roi': [296, 130, 455, 198], 'method': 'pink-and-white-outline'},
    'zxxr-rosa-back': {'roi': [155, 217, 526, 553], 'method': 'pink-and-white-outline'},
}

def grow(mask, radius=1):
    return np.asarray(Image.fromarray(mask.astype('uint8')*255).filter(
        ImageFilter.MaxFilter(radius*2+1))) > 0

def fill_enclosed(mask):
    """Retain white teeth/ring/letter within the closed black mouth silhouette."""
    h, w = mask.shape
    exterior = np.zeros_like(mask)
    todo = deque()
    for x in range(w):
        if not mask[0, x]: exterior[0, x] = True; todo.append((0, x))
        if not mask[h-1, x]: exterior[h-1, x] = True; todo.append((h-1, x))
    for y in range(h):
        if not mask[y, 0]: exterior[y, 0] = True; todo.append((y, 0))
        if not mask[y, w-1]: exterior[y, w-1] = True; todo.append((y, w-1))
    while todo:
        y, x = todo.popleft()
        for ny, nx in ((y-1,x), (y+1,x), (y,x-1), (y,x+1)):
            if 0 <= ny < h and 0 <= nx < w and not mask[ny,nx] and not exterior[ny,nx]:
                exterior[ny,nx] = True
                todo.append((ny,nx))
    return ~exterior

def extract(rgb, spec):
    h, w = rgb.shape[:2]
    x0,y0,x1,y1 = spec['roi']
    part = rgb[y0:y1, x0:x1].astype('int16')
    r,g,b = part[:,:,0],part[:,:,1],part[:,:,2]
    red = r - np.maximum(g,b)
    alpha = np.zeros((h,w),dtype='uint8')
    method = spec['method']
    if method == 'black-silhouette-with-white-interior':
        # Only the exterior is removed. Enclosed white print stays opaque.
        ink = part.min(axis=2) < 185
        filled = fill_enclosed(ink)
        # One native pixel retains source antialiasing and edge distress.
        # Do not make the light cotton-colored exterior bleed fully opaque.
        edge_alpha = np.clip((232-part.min(axis=2).astype(float))/62,0,1)*255
        local = np.where(filled,255,np.where(grow(filled,1),edge_alpha,0)).astype('uint8')
    elif method == 'pink-and-white-outline':
        magenta = (r-g > 24) & (b-g > 12) & (r > 90)
        # Neutral white belongs to this print, unlike the charcoal cotton.
        # Restrict it to six pixels around pink, matching the native outline.
        neutral = (part.min(axis=2) > 102) & grow(magenta, 6)
        ink = magenta | neutral
        # Adjacent transition samples retain the source antialiasing.
        edge = grow(ink, 1) & (part.max(axis=2) > 82)
        local = np.where(ink,255,np.where(edge,128,0)).astype('uint8')
    else:
        # Source red dominance separates ink from neutral warm cotton without
        # interpreting or replacing any letter, glyph or flower shape.
        # Restrict very faint chroma to two pixels around definite ink. This
        # retains tiny signatures while rejecting warm cotton/JPEG noise.
        supported = grow(red >= 32, 2)
        local = np.clip((red.astype(float)-15)/17,0,1)*255*supported
        if method == 'red-and-black-logo':
            dark = part.max(axis=2) < 95
            black_alpha = np.clip((225-part.max(axis=2).astype(float))/70,0,1)*255
            local = np.maximum(local,np.where(grow(dark,2),black_alpha,0))
        local = np.rint(local).astype('uint8')
    alpha[y0:y1,x0:x1] = local
    return alpha

def checker(size):
    w,h = size
    yy,xx = np.indices((h,w))
    value = np.where(((xx//16+yy//16)%2)==0,214,176).astype('uint8')
    return Image.fromarray(np.dstack((value,value,value,np.full_like(value,255))),'RGBA')

manifest = json.loads((ROOT/'docs/REFERENCE-MANIFEST-v3.json').read_text(encoding='utf-8'))
entries = []
proofs = []
for item in manifest:
    for view in item['views']:
        key = f"{item['id']}-{view['side']}"
        original = Image.open(SRC/f'{key}.png').convert('RGBA')
        rgb = np.asarray(original)[:,:,:3]
        spec = REGIONS[key]
        alpha = extract(rgb, spec)
        # Enforce the original garment alpha, though all ROIs are inside it.
        alpha = np.minimum(alpha,np.asarray(original)[:,:,3])
        rgba = np.dstack((rgb,alpha))
        result = Image.fromarray(rgba,'RGBA')
        result.save(OUT/f'{key}.png',optimize=True)
        support = alpha > 0
        assert tuple(result.size)==(view['width'],view['height'])
        assert np.array_equal(rgba[support,:3],rgb[support])
        ys,xs = np.where(support)
        bbox = [int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]
        x0,y0,x1,y1 = bbox
        core_white = (rgb.min(axis=2)>220) & (alpha==255)
        core_pink = (rgb[:,:,0].astype(int)-rgb[:,:,1] > 60) & (rgb[:,:,2].astype(int)-rgb[:,:,1] > 50) & (alpha==255)
        if key == 'boca-back': assert int(core_white.sum()) > 15000, 'Mouth white print was lost'
        if key == 'zxxr-rosa-back': assert int(core_white.sum()) > 5000, 'Pink white outline was lost'
        entries.append({
            'id':item['id'],'side':view['side'],'source':item['source'],
            'sourceCrop':view['box'],'nativeUVSize':list(original.size),
            'region':spec['roi'],'artworkBounds':bbox,'method':spec['method'],
            'alphaPixels':int(support.sum()),'opaqueWhitePixels':int(core_white.sum()),
            'opaquePinkPixels':int(core_pink.sum()),'nonzeroRGBMatchesSource':True,
            'output':f'public/media/artwork-v4/{key}.png',
        })
        # Proof uses display-only scaling; delivered UV assets remain native.
        detail = result.crop((max(0,x0-10),max(0,y0-10),min(result.width,x1+10),min(result.height,y1+10)))
        detail.thumbnail((425,340),Image.Resampling.LANCZOS)
        tile = Image.new('RGB',(450,390),(246,244,240))
        check = checker(detail.size)
        check.alpha_composite(detail)
        tile.paste(check.convert('RGB'),((450-detail.width)//2,34+(340-detail.height)//2))
        ImageDraw.Draw(tile).text((12,10),key,fill=(20,20,20))
        proofs.append(tile)
        print(key,original.size,'bounds',bbox,'white',int(core_white.sum()),flush=True)

patches = []
for tone, source, box in [
    ('offwhite','boca-front',[260,370,516,626]),
    ('black','zxxr-rosa-front',[250,270,506,526]),
]:
    patch = Image.open(SRC/f'{source}.png').convert('RGB').crop(box)
    patch.save(OUT/f'cotton-patch-{tone}.png',optimize=True)
    patches.append({'tone':tone,'source':f'public/media/reference-v3/{source}.png','box':box,'nativeSize':list(patch.size),'output':f'public/media/artwork-v4/cotton-patch-{tone}.png','process':'Native unprinted cotton crop, no synthesis, scale change, sharpening or seam removal; not seamless.'})

sheet = Image.new('RGB',(450*2,390*5),(245,243,238))
for i,tile in enumerate(proofs):sheet.paste(tile,((i%2)*450,(i//2)*390))
sheet.save(PROOF/'artwork-v4-checkerboard.png',optimize=True)

# Composite proof specifically exposes lost white ring/teeth or pink outline.
detail_sheet = Image.new('RGB',(1200,700),(75,76,78))
draw = ImageDraw.Draw(detail_sheet)
for i,key in enumerate(['boca-back','zxxr-rosa-back']):
    image = Image.open(OUT/f'{key}.png').convert('RGBA')
    box = next(e['artworkBounds'] for e in entries if f"{e['id']}-{e['side']}"==key)
    piece = image.crop((box[0]-2,box[1]-2,box[2]+2,box[3]+2))
    piece.thumbnail((520,600),Image.Resampling.LANCZOS)
    bg = Image.new('RGBA',piece.size,(231,226,215,255) if i==0 else (29,31,33,255))
    bg.alpha_composite(piece)
    detail_sheet.paste(bg.convert('RGB'),(i*600+(600-piece.width)//2,60+(600-piece.height)//2))
    draw.text((i*600+30,25),key+' — original white print retained',fill=(255,255,255))
detail_sheet.save(PROOF/'artwork-v4-white-print-check.png',optimize=True)

doc = {'version':4,'process':'Native UV print extraction. All visible RGB samples preserved byte-for-byte. Alpha only; no upscale, font redraw, recolor, generative fill or invented print detail. Display proof sheets are resized only for inspection.',
       'alphaRules':{'red':'Red minus max(green,blue), opaque at >=32, transparent at <=15; faint transitions restricted to two native pixels from core ink.','pink':'Magenta core plus neutral bright pixels within six native pixels, including original white outline; one pixel transition.','mouth':'Fill only holes enclosed by original dark silhouette to preserve teeth, ring and R; alpha-weight one native exterior edge pixel.'},
       'sourceManifest':'docs/REFERENCE-MANIFEST-v3.json','entries':entries,'cottonPatches':patches,
       'limitations':['Sources are composite JPEG mockups, not separate production artwork. Antialias samples contain the original cotton color at ink edges.','Mouth exterior extraction includes one native pixel of edge bleed; white details enclosed in the silhouette stay opaque.','Cotton patches are native crops and are not seamless; use sparingly for material tone/detail, not stretched as photographic folds.']}
(ROOT/'docs/ARTWORK-v4.json').write_text(json.dumps(doc,indent=2,ensure_ascii=False),encoding='utf-8')
