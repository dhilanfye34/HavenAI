#!/usr/bin/env python3
"""
Generate HavenAI desktop app icons.

Draws the same shield-with-lock mark used on the website (ShieldLock.tsx)
and exports:
  - assets/icon.png         512x512, app icon (electron-builder derives .icns/.ico from this)
  - assets/tray.png         32x32,  menubar/tray icon (colored)
  - assets/trayTemplate.png 32x32,  macOS template (white/transparent for dark/light menu bars)
"""

from PIL import Image, ImageDraw
import os


# Match the gradient palette used on the website (violet → blue).
BG_TOP = (99, 102, 241)        # indigo-500
BG_BOT = (59, 130, 246)        # blue-500
FG = (255, 255, 255)           # shield + lock stroke


def _lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def _rounded_rect_background(size: int) -> Image.Image:
    """Square background with a vertical indigo→blue gradient and rounded corners."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    for y in range(size):
        t = y / max(size - 1, 1)
        draw.line([(0, y), (size, y)], fill=_lerp(BG_TOP, BG_BOT, t))
    # Rounded corner mask
    mask = Image.new("L", (size, size), 0)
    mdraw = ImageDraw.Draw(mask)
    radius = int(size * 0.22)
    mdraw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    img.putalpha(mask)
    return img


def _shield_with_lock(size: int, fg=FG, with_background=True) -> Image.Image:
    """
    Draw a shield + padlock, matching the web ShieldLock.tsx mark.

    The shield path is based on the lucide Shield glyph (a 24x24 viewBox),
    rescaled to the target size. For simplicity we approximate the curved
    shield with a polygon — at 512px the difference is imperceptible.
    """
    if with_background:
        img = _rounded_rect_background(size)
    else:
        img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    s = size

    # Geometry in 24x24 viewBox → scaled to `s`
    def p(x, y):
        return (x / 24 * s, y / 24 * s)

    # Stroke width (mirrors strokeWidth=1.5 on a 24-unit viewBox, but beefier
    # for a standalone app icon so it reads at small sizes).
    stroke = max(2, int(s * 0.045))

    # Shield outline — 24-point polygon approximating the lucide path
    shield_pts = [
        p(12, 2.1),
        p(14, 3.0), p(16, 3.9), p(18, 4.6), p(19.7, 5.0),
        p(20, 6),
        p(20, 9), p(20, 11), p(19.95, 13),
        p(19.6, 14.8), p(18.9, 16.3), p(17.8, 17.6),
        p(16.3, 18.8), p(14.4, 19.9), p(12.3, 20.9),
        p(12, 21.0),
        p(11.7, 20.9), p(9.6, 19.9), p(7.7, 18.8),
        p(6.2, 17.6), p(5.1, 16.3), p(4.4, 14.8),
        p(4.05, 13), p(4, 11), p(4, 9), p(4, 6),
        p(5, 5),
        p(6.3, 4.9), p(8.0, 4.4), p(10, 3.5),
    ]
    # Draw filled shield stroke
    draw.polygon(shield_pts, outline=fg, fill=None)
    # Re-draw the outline several times for a thicker stroke
    for dx in range(-stroke // 2, stroke // 2 + 1):
        for dy in range(-stroke // 2, stroke // 2 + 1):
            if dx * dx + dy * dy <= (stroke / 2) ** 2:
                draw.polygon(
                    [(x + dx, y + dy) for (x, y) in shield_pts],
                    outline=fg,
                    fill=None,
                )

    # Lock body — rect(9.5, 11, 5, 4) in the 24 viewBox
    body_l, body_t = p(9.5, 11)
    body_r, body_b = p(14.5, 15)
    body_r_px = max(1, int(s * 0.01))
    draw.rounded_rectangle(
        (body_l, body_t, body_r, body_b),
        radius=body_r_px + int(s * 0.008),
        outline=fg,
        width=stroke,
    )

    # Lock shackle — arc from (10.5,11) up to (13.5,11) curving to y≈9.5
    shackle_l, shackle_t = p(10.5, 9.5)
    shackle_r, shackle_b = p(13.5, 11.5)
    draw.arc(
        (shackle_l, shackle_t, shackle_r, shackle_b),
        start=180,
        end=360,
        fill=fg,
        width=stroke,
    )

    return img


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    assets_dir = os.path.join(script_dir, "assets")
    os.makedirs(assets_dir, exist_ok=True)

    # 1) Main app icon — 512x512 with gradient background
    icon_path = os.path.join(assets_dir, "icon.png")
    _shield_with_lock(512, fg=FG, with_background=True).save(icon_path)
    print(f"Created: {icon_path}")

    # 2) Tray icon — 32x32 colored (for platforms that don't use templates)
    tray_path = os.path.join(assets_dir, "tray.png")
    _shield_with_lock(32, fg=FG, with_background=True).save(tray_path)
    print(f"Created: {tray_path}")

    # 3) Tray template for macOS — white glyph on transparent bg, no background
    tray_template_path = os.path.join(assets_dir, "trayTemplate.png")
    _shield_with_lock(32, fg=(0, 0, 0), with_background=False).save(tray_template_path)
    print(f"Created: {tray_template_path}")

    print("\nIcons generated from the ShieldLock mark.")


if __name__ == "__main__":
    main()
