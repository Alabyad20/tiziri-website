#!/usr/bin/env python3
"""
Google Merchant Center product feed generator.

Reads data/rugs.json and writes google-merchant-feed.xml (RSS 2.0 with the
g: namespace) at the repo root, so it deploys to
https://tizirirugs.com/google-merchant-feed.xml

Only physical, ready-to-ship rugs are included: a rug qualifies when it is
InStock, has a price, and its product page has no made-to-order size list
(made-to-order pages show "From $X" ranges, which Merchant Center would
flag as a price mismatch).

Runs as part of the Netlify build (see netlify.toml), so the feed stays in
sync with rugs.json automatically.

    python3 scripts/generate_merchant_feed.py
"""
import html
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RUGS_DIR = os.path.join(ROOT, "rugs")
DATA_RUGS = os.path.join(ROOT, "data", "rugs.json")
OUT = os.path.join(ROOT, "google-merchant-feed.xml")
SITE = "https://tizirirugs.com"

MAX_ADDITIONAL_IMAGES = 10  # Merchant Center limit


def clean_text(s):
    """Unescape entities and normalise whitespace for feed text nodes."""
    s = html.unescape(s or "")
    return re.sub(r"\s+", " ", s).strip()


def is_ready_to_ship(rug):
    if rug.get("availability") != "InStock" or not rug.get("price"):
        return False
    page = os.path.join(RUGS_DIR, rug["slug"] + ".html")
    if not os.path.exists(page):
        return False
    with open(page, "r", encoding="utf-8") as f:
        return "product__sizes" not in f.read()


def dims_short(rug):
    """'305 x 203 cm (10 ft 0 in × 6 ft 8 in)' -> '305 x 203 cm'"""
    m = re.match(r"([\d.]+)\s*[x×]\s*([\d.]+)\s*cm", clean_text(rug["dimensions"]), re.I)
    return f"{m.group(1)} x {m.group(2)} cm" if m else clean_text(rug["dimensions"])


def build_item(rug):
    slug = rug["slug"]
    name = clean_text(rug["name"])
    style = clean_text(rug.get("style") or "Berber")
    size = dims_short(rug)
    title = f"{name} — Handwoven Moroccan {style} Rug, {size}"
    description = (
        f"{clean_text(rug['description'])} One-of-a-kind {style} rug, handwoven "
        f"by Berber artisans in Morocco. {size}. "
        f"{clean_text(rug.get('material') or 'Wool')}. In stock in the USA — "
        "ships free within 1-2 business days."
    )
    images = rug.get("images") or []

    e = html.escape
    lines = [
        "    <item>",
        f"      <g:id>{e(slug)}</g:id>",
        f"      <g:title>{e(title[:150])}</g:title>",
        f"      <g:description>{e(description[:5000])}</g:description>",
        f"      <g:link>{SITE}/rugs/{e(slug)}.html</g:link>",
        f"      <g:image_link>{e(images[0])}</g:image_link>" if images else None,
    ]
    for img in images[1:1 + MAX_ADDITIONAL_IMAGES]:
        lines.append(f"      <g:additional_image_link>{e(img)}</g:additional_image_link>")
    lines += [
        "      <g:availability>in_stock</g:availability>",
        f"      <g:price>{rug['price']:.2f} {rug.get('currency') or 'USD'}</g:price>",
        "      <g:condition>new</g:condition>",
        "      <g:brand>TIZIRI</g:brand>",
        "      <g:identifier_exists>no</g:identifier_exists>",
        "      <g:google_product_category>598</g:google_product_category>",
        f"      <g:product_type>Home &amp; Garden &gt; Decor &gt; Rugs &gt; {e(style)}</g:product_type>",
        f"      <g:color>{e((rug.get('color') or 'Multicolor').capitalize())}</g:color>",
        "      <g:material>Wool</g:material>",
        f"      <g:size>{e(size)}</g:size>",
        "      <g:shipping>",
        "        <g:country>US</g:country>",
        "        <g:service>FedEx Home Delivery</g:service>",
        "        <g:price>0.00 USD</g:price>",
        "      </g:shipping>",
        "    </item>",
    ]
    return "\n".join(l for l in lines if l)


def main():
    with open(DATA_RUGS, "r", encoding="utf-8") as f:
        rugs = json.load(f)
    included = [r for r in rugs if is_ready_to_ship(r)]
    items = "\n".join(build_item(r) for r in included)
    feed = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>TIZIRI — Handwoven Moroccan Rugs</title>
    <link>{SITE}</link>
    <description>One-of-a-kind handwoven Moroccan rugs, in stock in the USA.</description>
{items}
  </channel>
</rss>
"""
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(feed)
    print(f"google-merchant-feed.xml: {len(included)} products "
          f"({', '.join(r['slug'] for r in included)})")


if __name__ == "__main__":
    sys.exit(main())
