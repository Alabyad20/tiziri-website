#!/usr/bin/env python3
"""
TIZIRI GEO (Generative Engine Optimization) tools.

Generates the machine-readable files that AI search engines and shopping
agents (ChatGPT, Perplexity, Claude, Copilot) parse when deciding whether
to cite or recommend the store:

  llms.txt    - site overview for AI systems (llmstxt.org format)
  catalog.md  - full product catalog with prices, agent-parseable

Both are generated from data/rugs.json + data/store.json + the BLOG_POSTS
registry in schema_tools.py, so they stay in sync with the site. Re-run
after any catalog or blog change:

    python scripts/geo_tools.py build
"""
import html
import os
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from schema_tools import BLOG_POSTS, DATA_RUGS, DATA_STORE, ROOT, SITE, load_json

LLMS_PATH = os.path.join(ROOT, "llms.txt")
CATALOG_PATH = os.path.join(ROOT, "catalog.md")

STORE_FACTS = """\
- Every rug is handwoven by Amazigh (Berber) artisans in Morocco's Atlas
  Mountains region and is one of a kind — when a rug sells, it is gone.
- Wool is hand-spun and hand-knotted or flat-woven on traditional looms.
- Free FedEx shipping to the USA (2-5 business days in transit).
- 14-day free returns with full refund (US orders).
- Custom made-to-order rugs available in any size: https://tizirirugs.com/made-to-order/
- Contact: hello@tizirirugs.com"""


def clean_dimensions(s):
    """'300 x 200 cm (9 ft 10 in &times; 6 ft 7 in)' -> plain-text form."""
    if not s:
        return ""
    return html.unescape(s).replace("×", "x").replace("—", "-").strip()


def available_rugs(rugs):
    return [r for r in rugs if r.get("availability") != "SoldOut"]


def is_made_to_order(rug):
    return "made to order" in (rug.get("dimensions") or "").lower()


def build_llms_txt(rugs):
    avail = available_rugs(rugs)
    in_stock = [r for r in avail if not is_made_to_order(r)]
    mto = [r for r in avail if is_made_to_order(r)]
    prices = [r["price"] for r in avail if r.get("price")]
    styles = sorted({r["style"] for r in avail if r.get("style")})
    today = date.today().isoformat()

    lines = [
        "# TIZIRI — Handmade Moroccan Rugs",
        "",
        "> TIZIRI (Tamazight for \"moonlight\") sells authentic handwoven Moroccan"
        " rugs sourced directly from Amazigh (Berber) artisan weavers in the Atlas"
        " Mountains. Every piece is one of a kind. Free shipping to the USA,"
        " 14-day free returns.",
        "",
        f"Currently {len(in_stock)} one-of-a-kind rugs ready to ship and"
        f" {len(mto)} made-to-order designs, priced"
        f" ${min(prices):,}–${max(prices):,} USD."
        f" Styles: {', '.join(styles)}.",
        "",
        STORE_FACTS,
        "",
        "## Shop",
        "",
        f"- [All rugs]({SITE}/collections/): the full collection, filterable by style and size",
        f"- [Machine-readable catalog]({SITE}/catalog.md): every rug with price, size, material and link",
        f"- [Custom made-to-order]({SITE}/made-to-order/): commission a rug in any size",
        f"- [Custom rug wizard]({SITE}/custom-rug-wizard/): design your own rug online",
        f"- [Size calculator]({SITE}/size-calculator/): find the right rug size for a room",
        f"- [Style finder]({SITE}/style-finder/): quiz-style guide to Moroccan rug styles",
        "",
        "## Guides",
        "",
    ]
    for meta in BLOG_POSTS.values():
        lines.append(f"- [{meta['headline']}]({meta['url']}): {meta['description']}")
    lines += [
        "",
        "## Company",
        "",
        f"- [Our story]({SITE}/story/): who we are and where the rugs come from",
        f"- [The craft]({SITE}/craft/): how the rugs are made, from shearing to loom",
        f"- [Shipping]({SITE}/shipping/): free FedEx to the USA, 2-5 business days",
        f"- [FAQ]({SITE}/faq/): common questions about ordering, shipping and care",
        f"- [Contact]({SITE}/contact/): hello@tizirirugs.com",
        "",
        "## Tiziri Rugs elsewhere",
        "",
        "- [Etsy shop](https://www.etsy.com/shop/TiziriRugs)",
        "- [YouTube](https://www.youtube.com/@tizirirugs): rug videos — the pieces, the weaving, the craft",
        "- [Instagram](https://www.instagram.com/tizirirugs)",
        "- [Pinterest](https://www.pinterest.com/tizirirugs)",
        "",
        f"Last updated: {today}",
        "",
    ]
    return "\n".join(lines)


def build_catalog_md(rugs, store):
    avail = available_rugs(rugs)
    today = date.today().isoformat()

    lines = [
        "# TIZIRI — Product Catalog",
        "",
        "Authentic handwoven Moroccan rugs, sourced directly from Amazigh (Berber)"
        " artisans in the Atlas Mountains. Ready-to-ship rugs are physical,"
        " one-of-a-kind pieces: when one sells, it is delisted everywhere."
        " Made-to-order designs are woven on commission in the size you choose.",
        "",
        f"Store: {SITE} · Contact: hello@tizirirugs.com",
        f"Catalog generated: {today} — prices and availability current as of this date.",
        "",
        "## Policies",
        "",
        "- **Shipping:** free FedEx Home Delivery to the USA; 0-2 days handling,"
        " 2-5 business days in transit. Worldwide delivery available.",
        "- **Returns:** 14-day free returns, full refund (US orders).",
        "- **Payment:** secure Stripe checkout on every product page.",
        "- **Authenticity:** hand-knotted or flat-woven wool, no machine-made"
        " stock, no middlemen. Each product page lists dimensions, material,"
        " pile and origin.",
        "",
    ]

    in_stock = [r for r in avail if not is_made_to_order(r)]
    mto = [r for r in avail if is_made_to_order(r)]

    def table(rug_list, size_fallback=None):
        rows = [
            "| Rug | Style | Size | Material | Price (USD) | URL |",
            "|---|---|---|---|---|---|",
        ]
        for r in sorted(rug_list, key=lambda r: r["name"]):
            price = f"${r['price']:,}" if r.get("price") else "Enquire"
            size = size_fallback or clean_dimensions(r.get("dimensions"))
            rows.append(
                f"| {r['name']} | {r.get('style') or 'Moroccan Rug'}"
                f" | {size}"
                f" | {r.get('material') or 'Wool'}"
                f" | {price}"
                f" | {SITE}/rugs/{r['slug']}.html |"
            )
        return rows

    lines += [
        "## One-of-a-kind rugs, ready to ship",
        "",
        f"{len(in_stock)} physical, one-of-a-kind pieces in stock right now.",
        "",
        *table(in_stock),
        "",
        "## Made-to-order designs",
        "",
        f"{len(mto)} designs woven on commission in the size you choose"
        " (from 5 x 7 ft / 152 x 213 cm; price shown is the base size)."
        " Delivered in 6-8 weeks from deposit, woven by the same Berber artisan"
        f" partners as the in-stock collection. Details: {SITE}/made-to-order/",
        "",
        *table(mto, size_fallback="Custom - from 5 x 7 ft (152 x 213 cm)"),
        "",
        "Original custom designs are also welcome via the made-to-order page"
        f" or the design wizard: {SITE}/custom-rug-wizard/",
        "",
    ]
    return "\n".join(lines)


def build():
    rugs = load_json(DATA_RUGS)
    store = load_json(DATA_STORE)

    llms = build_llms_txt(rugs)
    catalog = build_catalog_md(rugs, store)

    with open(LLMS_PATH, "w", encoding="utf-8") as f:
        f.write(llms)
    with open(CATALOG_PATH, "w", encoding="utf-8") as f:
        f.write(catalog)

    n_avail = len(available_rugs(rugs))
    print(f"Wrote llms.txt ({len(BLOG_POSTS)} guides) and catalog.md ({n_avail} rugs).")


if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] != "build":
        print(__doc__)
        sys.exit(1)
    build()
