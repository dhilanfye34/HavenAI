#!/usr/bin/env python3
"""
Generate HavenAI desktop app icons from the website's ShieldLock SVG.

Renders the exact same shield-with-lock mark used on the website
(webapp/app/icon.svg) as a crisp vector, and exports:
  - assets/icon.png         512x512, app icon (electron-builder derives .icns/.ico from this)
  - assets/tray.png         32x32,  menubar/tray icon (colored)
  - assets/trayTemplate.png 32x32,  macOS template (black/transparent for menu bars)

Requires: cairosvg, pillow  (pip install cairosvg pillow)
"""

import io
import os

import cairosvg
from PIL import Image, ImageDraw


# Match the gradient palette used on the website (violet -> blue).
BG_TOP = (99, 102, 241)   # indigo-500
BG_BOT = (59, 130, 246)   # blue-500


def _lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def _rounded_gradient_bg(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    for y in range(size):
        t = y / max(size - 1, 1)
        draw.line([(0, y), (size, y)], fill=_lerp(BG_TOP, BG_BOT, t))
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, size - 1, size - 1), radius=int(size * 0.22), fill=255
    )
    img.putalpha(mask)
    return img


# The website mark: identical paths to webapp/app/icon.svg and ShieldLock.tsx.
# Stroke color is a variable so we can render white-on-gradient, or black
# for the macOS tray template.
SHIELD_SVG = """<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">
  <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
  <rect x="9.5" y="11" width="5" height="4" rx="0.5"/>
  <path d="M10.5 11V9.5a1.5 1.5 0 0 1 3 0V11"/>
</svg>"""


def _render_shield(size: int, stroke: str, inset_ratio: float, sw: float) -> Image.Image:
    """Render the shield SVG into an RGBA image of (size x size), centered,
    with the glyph occupying the inner region defined by `inset_ratio`.
    """
    inner = int(size * inset_ratio)
    svg = SHIELD_SVG.format(size=inner, stroke=stroke, sw=sw)
    png_bytes = cairosvg.svg2png(bytestring=svg.encode("utf-8"),
                                 output_width=inner, output_height=inner)
    glyph = Image.open(io.BytesIO(png_bytes)).convert("RGBA")

    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    off = (size - inner) // 2
    canvas.alpha_composite(glyph, (off, off))
    return canvas


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    assets = os.path.join(here, "assets")
    os.makedirs(assets, exist_ok=True)

    # 1) Main app icon: 512x512, white shield on indigo/blue gradient.
    bg = _rounded_gradient_bg(512)
    shield = _render_shield(512, stroke="#ffffff", inset_ratio=0.70, sw=1.6)
    bg.alpha_composite(shield)
    icon_path = os.path.join(assets, "icon.png")
    bg.save(icon_path)
    print(f"Created: {icon_path}")

    # 2) Tray icon (colored): 32x32, same gradient + white glyph.
    bg_tray = _rounded_gradient_bg(32)
    shield_tray = _render_shield(32, stroke="#ffffff", inset_ratio=0.72, sw=2.2)
    bg_tray.alpha_composite(shield_tray)
    tray_path = os.path.join(assets, "tray.png")
    bg_tray.save(tray_path)
    print(f"Created: {tray_path}")

    # 3) Tray template (macOS): 32x32, black glyph on transparent (no bg).
    tray_tpl = _render_shield(32, stroke="#000000", inset_ratio=0.82, sw=2.0)
    tpl_path = os.path.join(assets, "trayTemplate.png")
    tray_tpl.save(tpl_path)
    print(f"Created: {tpl_path}")

    print("\nIcons generated from the website ShieldLock SVG.")


if __name__ == "__main__":
    main()
