"""One-shot: generate rugs/{itto,tilila,touda,yenna}.html from the najat.html template."""
import json, re, html

TPL = open("rugs/najat.html", encoding="utf-8").read()
rugs = {r["name"]: r for r in json.load(open("data/rugs.json", encoding="utf-8")) if r.get("stripeLink")}

META = {
    "Itto":   {"descriptor": "Sculpted Ivory Beni Ourain",
               "alt_hero": "All-ivory Beni Ourain rug with sculpted rectangular panels carved into the pile"},
    "Tilila": {"descriptor": "Grey Tally-Mark Beni Ourain",
               "alt_hero": "Warm grey Moroccan rug with groups of black tally-mark stripes and black end-stripes"},
    "Touda":  {"descriptor": "Classic Ivory Beni Ourain",
               "alt_hero": "Classic ivory Beni Ourain rug with soft traditional diamond lattice and braided fringe"},
    "Yenna":  {"descriptor": "Square Sculpted Beni Ourain",
               "alt_hero": "Nearly square ivory Beni Ourain rug with carved diagonal channels radiating from a center ridge"},
}

VIEW_ALTS = ["full-length view on the studio floor", "angled view showing the pile and fringe",
             "front-facing full view", "detail of the carved pattern", "close view of the wool texture",
             "corner detail with fringe", "view of the flat-woven back", "additional angle"]

NAJAT_STRIPE = "https://buy.stripe.com/cNiaER5lX46yb4cglO2cg0b"
NAJAT_DIMS = "305 x 192 cm (10 ft 0 in &times; 6 ft 4 in)"

for name, m in META.items():
    r = rugs[name]
    slug, price = r["slug"], r["price"]
    dims_html = r["dimensions"].replace("×", "&times;")
    desc = r["description"]
    meta_desc = html.escape(desc.split("—")[0].strip().rstrip(".") + ". One of a kind, handwoven in Morocco.", quote=True)
    t = TPL

    # JSON-LD image array
    imgs = r["images"]
    arr = ",\n".join(f'        "{u}"' for u in imgs)
    t = re.sub(r'"image": \[.*?\]', '"image": [\n' + arr + "\n      ]", t, flags=re.S)

    # gallery: main image + thumbs
    main_local = imgs[0].replace("https://tizirirugs.com/", "../")
    t = re.sub(r'<img src="\.\./rug-photos/Newly%20taken%20photos/najat/[^"]+"\n\s+alt="[^"]*"',
               f'<img src="{main_local}"\n                         alt="{m["alt_hero"]}"', t, count=1)
    thumbs = []
    for i, u in enumerate(imgs):
        local = u.replace("https://tizirirugs.com/", "../")
        va = VIEW_ALTS[i] if i < len(VIEW_ALTS) else "additional angle"
        thumbs.append(
            f'''<button class="product__thumb"
                            data-src="{local}"
                            data-alt="{name} — {va}"
                            aria-label="View image {i+1}">
                        <img src="{local}" alt="{name} — Beni Ourain Moroccan Rug, detail view {i+1} of {len(imgs)}" loading="lazy">
                    </button>'''
        )
    t = re.sub(r'<button class="product__thumb".*</button>', "\n                    ".join(thumbs), t, flags=re.S)

    # text fields
    t = t.replace("Ivory Diamond-Lattice Boujaad", m["descriptor"])
    t = t.replace('An Boujaad with a full diamond lattice in a spectrum of color on ivory. Purple, blue, green, pink and orange — each lozenge different. One of a kind.', meta_desc)
    t = t.replace("An ivory ground crossed by a full diamond lattice in a spectrum of color — purple, blue, green, pink, orange. No two lozenges are the same. The structure is precise; the color is anything but restrained.", desc)
    t = t.replace(NAJAT_DIMS, dims_html)
    t = t.replace("Boujaad, Morocco", r["origin"])
    t = t.replace("<dd>Medium pile</dd>", f"<dd>{r['pile']}</dd>")
    t = t.replace("<dd>Vintage</dd>", f"<dd>{r['age']}</dd>")
    t = t.replace("Boujaad Moroccan Rug", "Beni Ourain Moroccan Rug")
    t = t.replace('<span class="product__label">Boujaad</span>', '<span class="product__label">Beni Ourain</span>')
    t = t.replace("the Najat rug (Boujaad)", f"the {name} rug (Beni Ourain)")
    t = t.replace(NAJAT_STRIPE, r["stripeLink"])
    t = t.replace('content="1300"', f'content="{price}"')
    t = t.replace('"price": "1300"', f'"price": "{price}"')
    t = t.replace("$1,300", f"${price:,}")
    t = t.replace("Najat", name).replace("najat", slug)

    open(f"rugs/{slug}.html", "w", encoding="utf-8").write(t)
    print(slug, "written", len(t), "bytes,", len(imgs), "images")
