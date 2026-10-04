"""Cuts the static Archivo instances from the variable font.

Usage: python3 scripts/cut-fonts.py path/to/Archivo[wdth,wght].ttf
Needs fonttools (and brotli when the source is a woff2 file).
"""

import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

CUTS = [
    ("Archivo-Regular", "Archivo", "Regular", 400, 100),
    ("Archivo-Medium", "Archivo", "Medium", 500, 100),
    ("Archivo-SemiBold", "Archivo", "SemiBold", 600, 100),
    ("Archivo-Bold", "Archivo", "Bold", 700, 100),
    ("ArchivoExpanded-Bold", "Archivo Expanded", "Bold", 700, 115),
]
REPLACED_NAME_IDS = (1, 2, 3, 4, 6, 16, 17, 21, 22, 25)


def set_names(font, postscript, family, style):
    names = font["name"]
    for name_id in REPLACED_NAME_IDS:
        names.removeNames(nameID=name_id)
    full = family if style == "Regular" else f"{family} {style}"
    for platform, encoding, language in ((3, 1, 0x409), (1, 0, 0)):
        names.setName(family, 1, platform, encoding, language)
        names.setName(style, 2, platform, encoding, language)
        names.setName(postscript, 3, platform, encoding, language)
        names.setName(full, 4, platform, encoding, language)
        names.setName(postscript, 6, platform, encoding, language)


def main(source):
    out = Path(__file__).resolve().parent.parent / "assets" / "fonts"
    for postscript, family, style, weight, width in CUTS:
        font = TTFont(source)
        font.flavor = None
        cut = instancer.instantiateVariableFont(
            font, {"wght": weight, "wdth": width}, inplace=False
        )
        set_names(cut, postscript, family, style)
        cut.save(out / f"{postscript}.ttf")


if __name__ == "__main__":
    main(sys.argv[1])
