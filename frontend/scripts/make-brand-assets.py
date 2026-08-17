"""Regenerates the favicon set and the Open Graph card from the existing art.

    python3 frontend/scripts/make-brand-assets.py

Writes src/app/{favicon.ico, icon.png, apple-icon.png, opengraph-image.png}, which
Next.js picks up by convention. Run it after changing the logo or the card faces —
otherwise those four files are binaries nobody can reproduce.

Needs Pillow, and the two system fonts named below: this is a macOS script. Georgia
Bold stands in for Cinzel, which is loaded from Google Fonts at runtime and is not
installed locally; it is also the declared fallback for --font-display, so the card
matches what a visitor without Cinzel would see.
"""

import pathlib

from PIL import Image, ImageDraw, ImageEnhance, ImageFont

ROOT = str(pathlib.Path(__file__).resolve().parent.parent)
PORTAL = f"{ROOT}/public/images/mystical-portal.png"
RUNES = f"{ROOT}/public/backgrounds/battle-arena.png"
CARDS = [f"{ROOT}/public/gifs/{n}.png" for n in ("spark", "lightning", "thunder")]

INK = (10, 12, 22)
INK_LIFT = (23, 27, 51)
GOLD = (235, 203, 126)
GOLD_MID = (217, 174, 78)
TEXT_MID = (169, 174, 199)

SERIF_BOLD = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
SANS = "/System/Library/Fonts/Supplemental/Arial.ttf"


def portal_mark(size: int) -> Image.Image:
    """The rune sigil, cropped tight and lifted off a dark square."""
    art = Image.open(PORTAL).convert("RGBA")
    # The glow occupies roughly the middle 84% of the square; trim the dead margin.
    w, h = art.size
    inset = int(w * 0.06)
    art = art.crop((inset, inset, w - inset, h - inset)).resize((size, size), Image.LANCZOS)

    art = ImageEnhance.Color(art).enhance(1.35)
    art = ImageEnhance.Brightness(art).enhance(1.25)

    canvas = Image.new("RGBA", (size, size), INK + (255,))
    canvas.alpha_composite(art)
    return canvas


def write_icons() -> None:
    large = portal_mark(512)
    large.convert("RGB").save(f"{ROOT}/src/app/icon.png", optimize=True)
    portal_mark(180).convert("RGB").save(f"{ROOT}/src/app/apple-icon.png", optimize=True)
    portal_mark(256).save(
        f"{ROOT}/src/app/favicon.ico",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64)],
    )


def backdrop(width: int, height: int) -> Image.Image:
    """Ink blue, lifted towards the top edge — the same wash the site uses."""
    base = Image.new("RGB", (width, height), INK)

    # An ellipse centred on the top edge, wide enough that no edge of it lands
    # inside the canvas and shows up as a seam.
    glow_size = (int(width * 2.4), int(height * 2.6))
    glow = Image.radial_gradient("L").resize(glow_size, Image.LANCZOS)
    glow = glow.point(lambda v: max(0, 255 - v * 2))
    layer = Image.new("L", (width, height), 0)
    layer.paste(glow, (width // 2 - glow_size[0] // 2, -glow_size[1] // 2))

    base.paste(Image.new("RGB", (width, height), INK_LIFT), (0, 0), layer)
    return base


def write_og_image() -> None:
    width, height = 1200, 630
    canvas = backdrop(width, height).convert("RGBA")

    runes = Image.open(RUNES).convert("RGBA")
    runes = runes.resize((int(height * 1.9), int(height * 1.27)), Image.LANCZOS)
    faded = Image.blend(Image.new("RGBA", runes.size, (0, 0, 0, 0)), runes, 0.12)
    canvas.alpha_composite(faded, (width - runes.size[0] + 120, (height - runes.size[1]) // 2))

    # Three cards, fanned, on the right.
    for path, angle, offset in zip(CARDS, (-14, 0, 14), ((640, 200), (790, 158), (940, 200))):
        card = Image.open(path).convert("RGBA")
        card = card.resize((int(300 * 1024 / 1536), 300), Image.LANCZOS)
        card = card.rotate(-angle, resample=Image.BICUBIC, expand=True)
        shadow = Image.new("RGBA", card.size, (0, 0, 0, 0))
        shadow.paste((0, 0, 0, 120), (0, 0), card.split()[3])
        canvas.alpha_composite(shadow, (offset[0] + 6, offset[1] + 12))
        canvas.alpha_composite(card, offset)

    draw = ImageDraw.Draw(canvas)
    title = ImageFont.truetype(SERIF_BOLD, 74)
    subtitle = ImageFont.truetype(SANS, 28)
    kicker = ImageFont.truetype(SANS, 20)

    draw.text((80, 214), "HAND", font=title, fill=GOLD)
    draw.text((80, 296), "OF FATE", font=title, fill=GOLD_MID)
    draw.rectangle((82, 400, 322, 401), fill=GOLD_MID)
    draw.text((80, 424), "Mystical 1v1 card duels", font=subtitle, fill=TEXT_MID)
    draw.text(
        (80, 470),
        "Claim a 3x5 board one column at a time",
        font=kicker,
        fill=(118, 124, 158),
    )

    canvas.convert("RGB").save(f"{ROOT}/src/app/opengraph-image.png", optimize=True)


if __name__ == "__main__":
    write_icons()
    write_og_image()
    print("assets written")
