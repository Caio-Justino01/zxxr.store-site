"""Deliver v6 without replacing any preceding package."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
target = root.parent / 'entrega' / 'ZXXR-STORE-PROTOTIPO-v6.zip'
excluded = {'node_modules', 'dist', '.git', '.cache', '.tools', 'work', '__pycache__'}
with ZipFile(target, 'w', ZIP_DEFLATED, compresslevel=6) as archive:
    for item in sorted(root.rglob('*')):
        if not item.is_file():
            continue
        relative = item.relative_to(root)
        if any(part in excluded for part in relative.parts):
            continue
        if item.suffix in {'.log', '.blend1', '.pyc'} or item.name.startswith('.env'):
            continue
        archive.write(item, Path('zxxr-store') / relative)
with ZipFile(target) as archive:
    assert archive.testzip() is None
    names = archive.namelist()
    for required in ['src/components/GradientBackdrop.tsx', 'src/lib/gradient-renderer.ts', 'src/hero-v6.css', 'docs/HERO-v6.md', 'docs/VALIDACAO.md']:
        assert f'zxxr-store/{required}' in names
    assert not any('/work/' in name or '/.env' in name for name in names)
    print(f'{target.name}: {len(names)} files, {target.stat().st_size / 1024 / 1024:.1f} MiB; ZIP verified.')
