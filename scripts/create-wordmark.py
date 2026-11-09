"""Export the Stickly wordmark from a font licensed for the intended use."""
import argparse
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--font', type=Path, required=True, help='Path to a licensed TTF or OTF font')
args = parser.parse_args()
font = TTFont(args.font)
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
advance = 0
parts = []
bounds = []
for character in 'stickly':
    name = cmap[ord(character)]
    pen = SVGPathPen(glyphs)
    glyphs[name].draw(pen)
    parts.append(f'<path d="{pen.getCommands()}" transform="translate({advance} 0)"/>')
    bound = BoundsPen(glyphs)
    glyphs[name].draw(bound)
    x0, y0, x1, y1 = bound.bounds
    bounds.append((x0 + advance, y0, x1 + advance, y1))
    advance += font['hmtx'][name][0]
left = min(b[0] for b in bounds)
bottom = min(b[1] for b in bounds)
right = max(b[2] for b in bounds)
top = max(b[3] for b in bounds)
width, height = right - left, top - bottom
outline = f'<g transform="translate({-left} {top}) scale(1 -1)">{"".join(parts)}</g>'
(root / 'public/stickly-wordmark.svg').write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" fill="#343c2e"><title>stickly</title>{outline}</svg>', encoding='utf-8')
icon = (root / 'public/stickly.svg').read_text(encoding='utf-8').split('</defs>')[1].split('</svg>')[0]
scale = 42 / height
(root / 'public/stickly-logo.svg').write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {76 + width * scale} 64"><title>Stickly</title><defs><linearGradient id="paper" x2=".8" y2="1"><stop stop-color="#f4f1d8"/><stop offset="1" stop-color="#e5e8ce"/></linearGradient></defs>{icon}<g fill="#343c2e" transform="translate(73 11) scale({scale})">{outline}</g></svg>', encoding='utf-8')
