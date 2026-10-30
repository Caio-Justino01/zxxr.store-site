"""Keep source TTF/licences; make deterministic WOFF2 subsets for the site."""
from pathlib import Path
from fontTools import subset

root = Path(__file__).resolve().parent.parent
font_dir = root / "public-store" / "fonts"
for stem in ("ArchivoBlack-Regular", "Inter-Variavel"):
    options = subset.Options()
    options.flavor = "woff2"
    options.recalc_timestamp = False
    options.layout_features = ["*"]
    font = subset.load_font(str(font_dir / (stem + ".ttf")), options)
    processor = subset.Subsetter(options=options)
    processor.populate(unicodes=list(range(0x0000, 0x0250)) + list(range(0x0300, 0x0370)) + list(range(0x2000, 0x2070)) + list(range(0x20A0, 0x20D0)) + list(range(0x2190, 0x2200)) + [0x2122, 0x2212, 0xFEFF, 0xFFFD])
    processor.subset(font)
    target = font_dir / (stem + ".woff2")
    subset.save_font(font, str(target), options)
    print(f"{target.name}: {target.stat().st_size} bytes")
