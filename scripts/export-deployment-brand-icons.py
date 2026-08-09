from __future__ import annotations

import argparse
from pathlib import Path
from shutil import copyfile

from PIL import Image, ImageDraw, ImageFilter


BRANDS = ("github", "vercel", "cloudflare")
MASKABLE_MASTER_FILES = {
    "github": "github-maskable-master.png",
    "vercel": "vercel-maskable-master-final.png",
    "cloudflare": "cloudflare-maskable-master.png",
}
STANDARD_EXPORTS = {
    "favicon-32.png": 32,
    "apple-touch-icon.png": 180,
    "pwa-icon-192.png": 192,
    "pwa-icon-512.png": 512,
}
CANONICAL_EXPORTS = (*STANDARD_EXPORTS.keys(), "pwa-maskable-512.png")


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGB").save(path, format="PNG", optimize=True, compress_level=9)


def build_maskable(master: Image.Image) -> Image.Image:
    size = 512
    foreground_size = 400
    background = master.resize((size, size), Image.Resampling.LANCZOS)
    background = background.filter(ImageFilter.GaussianBlur(radius=30))

    foreground = master.resize(
        (foreground_size, foreground_size),
        Image.Resampling.LANCZOS,
    )
    mask = Image.new("L", (foreground_size, foreground_size), 0)
    draw = ImageDraw.Draw(mask)
    inset = 18
    draw.rectangle(
        (inset, inset, foreground_size - inset, foreground_size - inset),
        fill=255,
    )
    mask = mask.filter(ImageFilter.GaussianBlur(radius=18))

    offset = (size - foreground_size) // 2
    background.paste(foreground, (offset, offset), mask)
    return background


def export_brand(source_dir: Path, destination_dir: Path, brand: str) -> None:
    source = source_dir / f"{brand}-master.png"
    if not source.is_file():
        raise FileNotFoundError(f"Missing brand master: {source}")

    with Image.open(source) as raw:
        master = raw.convert("RGB")
        if master.width != master.height:
            raise ValueError(f"Brand master must be square: {source}")

        target = destination_dir / brand
        for filename, size in STANDARD_EXPORTS.items():
            resized = master.resize((size, size), Image.Resampling.LANCZOS)
            save_png(resized, target / filename)

        maskable_source = source_dir / MASKABLE_MASTER_FILES[brand]
        if maskable_source.is_file():
            with Image.open(maskable_source) as raw_maskable:
                maskable = raw_maskable.convert("RGB").resize(
                    (512, 512),
                    Image.Resampling.LANCZOS,
                )
        else:
            maskable = build_maskable(master)
        save_png(maskable, target / "pwa-maskable-512.png")


def copy_canonical_default(destination_dir: Path, canonical_dir: Path) -> None:
    github_dir = destination_dir / "github"
    canonical_dir.mkdir(parents=True, exist_ok=True)
    for filename in CANONICAL_EXPORTS:
        copyfile(github_dir / filename, canonical_dir / filename)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Export SchatPhone deployment brand icons from square PNG masters.",
    )
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--destination-dir", type=Path, required=True)
    parser.add_argument("--canonical-dir", type=Path)
    args = parser.parse_args()

    for brand in BRANDS:
        export_brand(args.source_dir, args.destination_dir, brand)

    if args.canonical_dir:
        copy_canonical_default(args.destination_dir, args.canonical_dir)


if __name__ == "__main__":
    main()
