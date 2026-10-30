"""Package the prototype without dependencies, local tool binaries or build cache."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root=Path(__file__).resolve().parents[1]
target=root.parent/'entrega'/'ZXXR-STORE-PROTOTIPO-v4.zip'
excluded={'node_modules','dist','.git','.cache','.tools'}
with ZipFile(target,'w',ZIP_DEFLATED,compresslevel=6) as archive:
    for item in sorted(root.rglob('*')):
        if not item.is_file():continue
        relative=item.relative_to(root)
        if any(part in excluded for part in relative.parts) or item.suffix in {'.log','.blend1'}:continue
        archive.write(item,Path('zxxr-store')/relative)
with ZipFile(target) as archive:
    assert archive.testzip() is None
    print(f'{target.name}: {len(archive.namelist())} files, {target.stat().st_size/1024/1024:.1f} MiB; ZIP verified.')
