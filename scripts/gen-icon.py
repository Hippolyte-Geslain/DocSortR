"""
Generate a placeholder multi-resolution Windows .ico for DocSortR.

Writes to client/build-resources/icon.ico.

Dependency: Pillow (pip install pillow). Pillow is already a transitive
dep of the server, so the build venv has it. For a one-shot run outside
the venv:

    python -m pip install --user pillow
    python scripts/gen-icon.py

The icon is a rounded square on the DocSortR accent color with a white
"D" glyph. Swap this for a real brand icon when available — the build
picks up whatever .ico lives at client/build-resources/icon.ico.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ACCENT = (99, 102, 241)  # tailwind indigo-500-ish (matches accent-500 usage)
FG = (255, 255, 255)
SIZES = [16, 24, 32, 48, 64, 128, 256]


def render(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    radius = max(2, size // 6)
    draw.rounded_rectangle(
        (0, 0, size - 1, size - 1), radius=radius, fill=ACCENT
    )

    # Pick a font: prefer a bundled DejaVu; fall back to default bitmap
    # font so the script works on any machine.
    font: ImageFont.ImageFont
    try:
        font = ImageFont.truetype("arialbd.ttf", int(size * 0.62))
    except OSError:
        try:
            font = ImageFont.truetype("DejaVuSans-Bold.ttf", int(size * 0.62))
        except OSError:
            font = ImageFont.load_default()

    text = "D"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(
        ((size - tw) / 2 - bbox[0], (size - th) / 2 - bbox[1]),
        text,
        fill=FG,
        font=font,
    )
    return img


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    out = root / "client" / "build-resources" / "icon.ico"
    out.parent.mkdir(parents=True, exist_ok=True)

    base = render(256)
    base.save(out, format="ICO", sizes=[(s, s) for s in SIZES])
    print(f"wrote {out} ({', '.join(f'{s}x{s}' for s in SIZES)})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
