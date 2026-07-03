#!/usr/bin/env python3
"""
TIZIRI structured-data tools.

  seed  - parse existing rugs/*.html pages into data/rugs.json (one-time / re-runnable bootstrap)
  build - regenerate JSON-LD in every page from data/rugs.json + data/store.json (the real generator)

Run from the repo root:
    python3 scripts/schema_tools.py seed
    python3 scripts/schema_tools.py build
"""
import json
import os
import re
import sys
from datetime import date, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RUGS_DIR = os.path.join(ROOT, "rugs")
DATA_RUGS = os.path.join(ROOT, "data", "rugs.json")
DATA_STORE = os.path.join(ROOT, "data", "store.json")
SITE = "https://tizirirugs.com"

LDJSON_RE = re.compile(
    r'(<script type="application/ld\+json">)(.*?)(</script>)', re.DOTALL
)


def strip_tags(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s)).strip()


# ---------------------------------------------------------------------------
# SEED — extract data/rugs.json from the existing hand-authored HTML
# ---------------------------------------------------------------------------

def seed():
    rugs = []
    skipped = []
    for fname in sorted(os.listdir(RUGS_DIR)):
        if not fname.endswith(".html"):
            continue
        slug = fname[:-5]
        path = os.path.join(RUGS_DIR, fname)
        with open(path, "r", encoding="utf-8") as f:
            html = f.read()

        if 'http-equiv="refresh"' in html:
            skipped.append((slug, "redirect stub"))
            continue

        m_name = re.search(r'<h1 class="product__name">(.*?)</h1>', html, re.DOTALL)
        m_label = re.search(r'<span class="product__label">(.*?)</span>', html, re.DOTALL)
        m_desc = re.search(r'<p class="product__desc">(.*?)</p>', html, re.DOTALL)
        if not (m_name and m_desc):
            skipped.append((slug, "missing name/description"))
            continue

        name = strip_tags(m_name.group(1))
        label = strip_tags(m_label.group(1)) if m_label else ""
        desc = strip_tags(m_desc.group(1))

        def spec(dt_name):
            m = re.search(
                r'<dt>' + re.escape(dt_name) + r'</dt>\s*<dd>(.*?)</dd>', html, re.DOTALL
            )
            return strip_tags(m.group(1)) if m else None

        origin = spec("Origin")
        dimensions = spec("Dimensions")
        material = spec("Materials")
        pile = spec("Pile")
        age = spec("Age")

        m_price = re.search(r'<span class="product__price">\$([\d,]+)</span>', html)
        price = int(m_price.group(1).replace(",", "")) if m_price else None

        m_avail = re.search(r'"availability":\s*"https://schema\.org/(\w+)"', html)
        availability = m_avail.group(1) if m_avail else "InStock"

        images = []
        m_main = re.search(r'<img\s+src="([^"]+)"[^>]*\bid="mainImage"', html, re.DOTALL)
        if m_main:
            images.append(m_main.group(1))
        for m in re.finditer(r'<button class="product__thumb[^"]*"\s+data-src="([^"]+)"', html):
            images.append(m.group(1))
        # normalise "../rug-photos/..." (or deeper) to an absolute site URL, de-dupe, preserve order
        seen = set()
        norm_images = []
        for src in images:
            clean = re.sub(r'^(\.\./)+', '/', src)
            abs_url = SITE + clean
            if abs_url not in seen:
                seen.add(abs_url)
                norm_images.append(abs_url)
        images = norm_images

        stripe_link = None
        for m in re.finditer(r'<a\s+([^>]*?)>', html):
            attrs = m.group(1)
            if "product__cta--buy" not in attrs:
                continue
            m_href = re.search(r'href="(https://buy\.stripe\.com/[^"]+)"', attrs)
            if m_href:
                stripe_link = m_href.group(1)
                break

        rugs.append({
            "slug": slug,
            "name": name,
            "style": label,
            "category": f"{label} Moroccan Rug".strip() if label else "Moroccan Rug",
            "description": desc,
            "origin": origin,
            "dimensions": dimensions,
            "material": material,
            "pile": pile,
            "age": age,
            "price": price,
            "currency": "USD",
            "availability": availability,
            "images": images,
            "stripeLink": stripe_link,
            "rating": None,
            "reviews": [],
        })

    os.makedirs(os.path.dirname(DATA_RUGS), exist_ok=True)
    with open(DATA_RUGS, "w", encoding="utf-8") as f:
        json.dump(rugs, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"Seeded {len(rugs)} rugs -> {DATA_RUGS}")
    if skipped:
        print(f"Skipped {len(skipped)}:")
        for slug, reason in skipped:
            print(f"  {slug}: {reason}")


# ---------------------------------------------------------------------------
# BUILD — regenerate JSON-LD from data/rugs.json + data/store.json
# ---------------------------------------------------------------------------

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def sku_for(slug):
    return f"TIZIRI-{slug.upper()}"


def build_product_schema(rug, store):
    url = f"{SITE}/rugs/{rug['slug']}.html"
    node = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": rug["name"],
        "description": rug["description"],
        "url": url,
        "image": rug["images"] if rug["images"] else [f"{SITE}/rug-photos/IMG-20260607-WA0056.webp"],
        "sku": sku_for(rug["slug"]),
        "brand": {"@type": "Brand", "name": "TIZIRI"},
        "category": rug["category"],
        "countryOfOrigin": "MA",
        "material": rug["material"] or "Wool, hand-knotted",
        "additionalProperty": [
            {"@type": "PropertyValue", "name": "Handmade", "value": "Yes"},
        ],
    }
    if rug.get("dimensions"):
        node["additionalProperty"].append(
            {"@type": "PropertyValue", "name": "Dimensions", "value": rug["dimensions"]}
        )
    if rug.get("pile"):
        node["additionalProperty"].append(
            {"@type": "PropertyValue", "name": "Pile", "value": rug["pile"]}
        )
    if rug.get("age"):
        node["additionalProperty"].append(
            {"@type": "PropertyValue", "name": "Age", "value": rug["age"]}
        )

    # Offer — omitted entirely for price-on-enquiry rugs. See plan doc for reasoning:
    # an Offer without a price is a structured-data ERROR, not a soft warning, and is
    # worse than having no Offer at all.
    if rug.get("price"):
        price_valid_until = (date.today() + timedelta(days=store["priceValidDays"])).isoformat()
        node["offers"] = {
            "@type": "Offer",
            "price": str(rug["price"]),
            "priceCurrency": rug.get("currency", "USD"),
            "priceValidUntil": price_valid_until,
            "availability": f"https://schema.org/{rug.get('availability', 'InStock')}",
            "itemCondition": "https://schema.org/NewCondition",
            "url": url,
            "seller": dict(store["organizationRef"]),
            "shippingDetails": {"@id": store["shippingDetailsUSA"]["@id"]},
            "hasMerchantReturnPolicy": {"@id": store["returnPolicy"]["@id"]},
        }

    # Reviews — only added when real data exists. Never fabricated.
    if rug.get("rating"):
        node["aggregateRating"] = {
            "@type": "AggregateRating",
            "ratingValue": rug["rating"]["value"],
            "reviewCount": rug["rating"]["count"],
        }
    if rug.get("reviews"):
        node["review"] = [
            {
                "@type": "Review",
                "author": {"@type": "Person", "name": r["author"]},
                "reviewRating": {"@type": "Rating", "ratingValue": r["rating"]},
                "reviewBody": r["body"],
            }
            for r in rug["reviews"]
        ]

    return node


def build_breadcrumb_schema(rug):
    url = f"{SITE}/rugs/{rug['slug']}.html"
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "TIZIRI", "item": SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": "All Rugs", "item": f"{SITE}/collections/"},
            {"@type": "ListItem", "position": 3, "name": rug["name"], "item": url},
        ],
    }


def replace_ldjson_blocks(html, new_blocks, path):
    """Idempotent by construction: always replaces the full <script>...</script>
    span (tags included) with a fixed-format block, never appending to whatever
    whitespace happened to already be there. Re-running on already-generated
    output must produce byte-identical results."""
    matches = list(LDJSON_RE.finditer(html))
    if len(matches) != len(new_blocks):
        raise ValueError(
            f"{path}: expected {len(new_blocks)} ld+json block(s), found {len(matches)}"
        )
    out = html
    for m, block in reversed(list(zip(matches, new_blocks))):
        payload = json.dumps(block, indent=2, ensure_ascii=False)
        json.loads(payload)  # re-validate before writing anything
        # every line (including the opening brace) gets exactly one 4-space indent
        indented = "\n".join(
            ("    " + line if line.strip() else line) for line in payload.splitlines()
        )
        replacement = f'{m.group(1)}\n{indented}\n    {m.group(3)}'
        out = out[:m.start()] + replacement + out[m.end():]
    return out


def build_rug_page(rug, store):
    path = os.path.join(RUGS_DIR, f"{rug['slug']}.html")
    with open(path, "r", encoding="utf-8") as f:
        html = f.read()
    product = build_product_schema(rug, store)
    breadcrumb = build_breadcrumb_schema(rug)
    new_html = replace_ldjson_blocks(html, [product, breadcrumb], path)
    return path, new_html


def build_index(store):
    path = os.path.join(ROOT, "index.html")
    with open(path, "r", encoding="utf-8") as f:
        html = f.read()
    graph = {
        "@context": "https://schema.org",
        "@graph": [store["organization"], store["website"]],
    }
    new_html = replace_ldjson_blocks(html, [graph], path)
    return path, new_html


def build_collections(rugs):
    path = os.path.join(ROOT, "collections", "index.html")
    with open(path, "r", encoding="utf-8") as f:
        html = f.read()
    item_list = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Handwoven Moroccan Rugs — TIZIRI",
        "description": (
            "Browse our complete collection of handwoven Moroccan rugs. Beni Ourain, Azilal, "
            "Mrirt, Boucherouite and contemporary pieces — sourced directly from Berber artisans."
        ),
        "url": f"{SITE}/collections/",
        "numberOfItems": len(rugs),
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": i + 1,
                "name": rug["name"],
                "url": f"{SITE}/rugs/{rug['slug']}.html",
            }
            for i, rug in enumerate(rugs)
        ],
    }
    new_html = replace_ldjson_blocks(html, [item_list], path)
    return path, new_html


BLOG_POSTS = {
    "blog/beni-ourain-rug-guide/index.html": {
        "headline": "The Complete Guide to Beni Ourain Rugs",
        "description": (
            "Everything you need to know about Beni Ourain rugs — what they are, how to "
            "authenticate one, how to style it, what to pay, and how to care for it for decades."
        ),
        "image": f"{SITE}/rug-photos/IMG-20260607-WA0056.webp",
        "datePublished": "2026-06-26",
        "url": f"{SITE}/blog/beni-ourain-rug-guide/",
    },
    "blog/how-to-authenticate-moroccan-rug/index.html": {
        "headline": "How to Tell if a Moroccan Rug is Authentic: 7 Things to Look For",
        "description": (
            "Seven things to look for when buying a Moroccan rug — and four red flags that "
            "tell you it is machine-made or misrepresented."
        ),
        "image": f"{SITE}/rug-photos/IMG-20260530-WA0227.webp",
        "datePublished": "2026-06-26",
        "url": f"{SITE}/blog/how-to-authenticate-moroccan-rug/",
    },
    "blog/how-to-clean-moroccan-wool-rug/index.html": {
        "headline": "How to Clean a Moroccan Wool Rug Without Ruining It",
        "description": (
            "The right way to clean, spot-treat and deep-wash a Moroccan wool rug — and the "
            "common mistakes that cause permanent damage."
        ),
        "image": f"{SITE}/rug-photos/IMG-20260530-WA0224.webp",
        "datePublished": "2026-06-26",
        "url": f"{SITE}/blog/how-to-clean-moroccan-wool-rug/",
    },
}


def build_blog(store):
    results = []
    for rel, meta in BLOG_POSTS.items():
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            continue
        with open(path, "r", encoding="utf-8") as f:
            html = f.read()
        article = {
            "@context": "https://schema.org/",
            "@type": "Article",
            "headline": meta["headline"],
            "description": meta["description"],
            "image": meta["image"],
            "author": dict(store["organizationRef"]),
            "publisher": dict(store["organizationRef"]),
            "datePublished": meta["datePublished"],
            "dateModified": meta.get("dateModified", meta["datePublished"]),
            "mainEntityOfPage": {"@type": "WebPage", "@id": meta["url"]},
            "url": meta["url"],
        }
        new_html = replace_ldjson_blocks(html, [article], path)
        results.append((path, new_html))
    return results


def build():
    rugs = load_json(DATA_RUGS)
    store = load_json(DATA_STORE)

    writes = []
    errors = []
    for rug in rugs:
        try:
            writes.append(build_rug_page(rug, store))
        except Exception as e:
            errors.append(f"{rug['slug']}: {e}")
    try:
        writes.append(build_index(store))
    except Exception as e:
        errors.append(f"index.html: {e}")
    try:
        writes.append(build_collections(rugs))
    except Exception as e:
        errors.append(f"collections/index.html: {e}")
    try:
        writes.extend(build_blog(store))
    except Exception as e:
        errors.append(f"blog: {e}")

    if errors:
        print("BUILD ABORTED — no files written. Errors:", file=sys.stderr)
        for e in errors:
            print(f"  {e}", file=sys.stderr)
        sys.exit(1)

    for path, new_html in writes:
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_html)

    print(f"Regenerated structured data in {len(writes)} files.")


if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in ("seed", "build"):
        print(__doc__)
        sys.exit(1)
    {"seed": seed, "build": build}[sys.argv[1]]()
