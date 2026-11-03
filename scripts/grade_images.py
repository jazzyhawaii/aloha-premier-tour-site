#!/usr/bin/env python3
"""Unify sourced travel photography into one cohesive editorial grade
for the Aloha Premier Tour concept site: warm highlights, deep
cocoa/green shadows (split-tone), gentle filmic contrast, soft vignette,
fine grain. No numpy -- pure PIL point tables + blend compositing."""

import math
import os
from PIL import Image, ImageEnhance, ImageOps, ImageFilter, ImageChops, ImageDraw

SRC_DIR = "/private/tmp/claude-501/-Users-jazmynhansen-Aloha-Premier-Tour---01/dd4c3215-9ef1-4485-a4c9-0e924c33652e/images"
OUT_DIR = "/Users/jazmynhansen/Aloha Premier Tour - 01/assets/img/graded"

# brand colors sampled from the real logo (10.png)
BROWN = (41, 28, 21)      # cocoa shadow tint
GREEN = (92, 122, 61)     # olive/tidal green
SAND = (233, 222, 198)    # warm highlight tint

os.makedirs(OUT_DIR, exist_ok=True)


def scurve_point(x, strength=18):
    # gentle filmic S-curve, x in 0..255
    t = x / 255.0
    t = t + strength / 255.0 * math.sin(math.pi * t) * 0.5
    t = max(0.0, min(1.0, t))
    return int(round(t * 255))


_SCURVE_LUT = [scurve_point(x) for x in range(256)]


def lift_shadows_point(x, amount=10):
    # raise black point slightly so shadows don't crush (filmic)
    t = x / 255.0
    lifted = amount / 255.0 + t * (1 - amount / 255.0)
    return int(round(max(0, min(1, lifted)) * 255))


def build_channel_lut(lift_amt, curve_strength):
    lut = []
    for x in range(256):
        v = lift_shadows_point(x, lift_amt)
        v = _SCURVE_LUT[v] if curve_strength else v
        lut.append(v)
    return lut


def split_tone(im, shadow_color, highlight_color, shadow_strength=0.16, highlight_strength=0.10):
    """Blend a dark overlay (multiply) into shadows and a warm overlay
    (screen-ish/soft-light approx via blend) into highlights, using the
    luminance mask so midtones stay closer to the source."""
    gray = im.convert("L")

    # shadow mask: stronger where image is dark
    shadow_mask = gray.point(lambda p: int(255 * max(0.0, (120 - p) / 120.0)) if p < 120 else 0)
    shadow_layer = Image.new("RGB", im.size, shadow_color)
    shadow_blend = Image.blend(im, ImageChops.multiply(im, shadow_layer), shadow_strength)
    im = Image.composite(shadow_blend, im, shadow_mask)

    # highlight mask: stronger where image is bright
    hi_mask = gray.point(lambda p: int(255 * max(0.0, (p - 150) / 105.0)) if p > 150 else 0)
    hi_layer = Image.new("RGB", im.size, highlight_color)
    hi_blend = Image.blend(im, ImageChops.screen(im, hi_layer), highlight_strength)
    im = Image.composite(hi_blend, im, hi_mask)

    return im


def add_grain(im, amount=6):
    import random
    w, h = im.size
    noise = Image.new("L", (w, h))
    px = noise.load()
    random.seed(42)
    for y in range(h):
        for x in range(w):
            px[x, y] = 128 + random.randint(-amount, amount)
    noise = noise.convert("RGB")
    return ImageChops.overlay(im, noise)


def vignette(im, strength=0.22):
    w, h = im.size
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    max_dim = max(w, h)
    draw.ellipse(
        [-max_dim * 0.25, -max_dim * 0.2, w + max_dim * 0.25, h + max_dim * 0.2],
        fill=255,
    )
    mask = mask.filter(ImageFilter.GaussianBlur(max_dim * 0.18))
    dark = ImageEnhance.Brightness(im).enhance(1 - strength)
    return Image.composite(im, dark, mask)


def grade(path_in, path_out, max_edge=2400, grain_amt=5, vignette_strength=0.18):
    im = Image.open(path_in).convert("RGB")
    im = ImageOps.exif_transpose(im)

    # resize first (grain/vignette scale relative to final size)
    w, h = im.size
    scale = max_edge / max(w, h)
    if scale < 1:
        im = im.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    # gentle filmic tone curve w/ lifted blacks
    lut = build_channel_lut(lift_amt=8, curve_strength=1) * 3
    im = im.point(lut)

    # unify warmth: +red, +slight yellow(green), -blue in highlights
    r, g, b = im.split()
    r = r.point(lambda x: min(255, int(x * 1.035 + 2)))
    g = g.point(lambda x: min(255, int(x * 1.012)))
    b = b.point(lambda x: max(0, int(x * 0.955)))
    im = Image.merge("RGB", (r, g, b))

    # slight desaturation for an editorial (not postcard) feel, then
    # restore a touch of vibrance so greens/teals still read coastal
    im = ImageEnhance.Color(im).enhance(0.9)

    # brand split-tone: cocoa into shadows, warm sand into highlights
    im = split_tone(im, BROWN, SAND, shadow_strength=0.15, highlight_strength=0.08)

    # contrast + brightness polish
    im = ImageEnhance.Contrast(im).enhance(1.06)
    im = ImageEnhance.Brightness(im).enhance(1.01)

    # soft vignette for cinematic framing
    im = vignette(im, strength=vignette_strength)

    # fine grain for "natural texture"
    im = add_grain(im, amount=grain_amt)

    # gentle sharpen after all the blurring/compositing
    im = im.filter(ImageFilter.UnsharpMask(radius=1.6, percent=60, threshold=2))

    im.save(path_out, "JPEG", quality=86, optimize=True)
    print(f"graded {os.path.basename(path_in)} -> {path_out}  {im.size}")


JOBS = [
    ("1.jpg", "cultural-hands-taro.jpg", 2000, 0.14),
    ("2.webp", "aerial-waimanalo.jpg", 2400, 0.20),
    ("3.webp", "horseback-sunset-trio.jpg", 2400, 0.18),
    ("4.webp", "aerial-bluehawaiian.jpg", 2400, 0.20),
    ("5.webp", "aerial-napali.jpg", 2400, 0.20),
    ("6.webp", "horseback-family.jpg", 2200, 0.16),
    ("7.webp", "convertible-coast-road.jpg", 2400, 0.18),
    ("8.webp", "taro-fields-mountain.jpg", 2400, 0.16),
    ("9.webp", "aerial-makapuu-sunset.jpg", 2600, 0.22),
]

for src_name, out_name, max_edge, vig in JOBS:
    grade(os.path.join(SRC_DIR, src_name), os.path.join(OUT_DIR, out_name), max_edge=max_edge, vignette_strength=vig)

print("done")
