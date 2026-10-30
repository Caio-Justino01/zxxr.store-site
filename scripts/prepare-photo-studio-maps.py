"""Compress the projected photographic sky for glTF and refresh mobile maps."""
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'public/media/sky-studio-v4'
Image.open(p/'photographic-sky-atlas-2k.png').save(p/'painted-sky-atlas.jpg',quality=94,subsampling=0,optimize=True)
mobile=p/'mobile';mobile.mkdir(exist_ok=True)
for name in ['painted-sky-atlas.jpg','plaster-normal.png','cement-color.jpg','cement-normal.png','grass-color-2k.jpg','grass-normal-1k.jpg']:
    im=Image.open(p/name);im.thumbnail((512,512) if 'normal' in name or name=='cement-color.jpg' else (1024,1024),Image.Resampling.LANCZOS)
    suffix='png' if 'normal' in name else 'jpg'
    path=mobile/(Path(name).stem+'.'+suffix)
    if suffix=='png':im.save(path,optimize=True)
    else:im.save(path,quality=89,optimize=True)
print('PHOTOGRAPHIC_MAPS_COMPRESSED',p,flush=True)
