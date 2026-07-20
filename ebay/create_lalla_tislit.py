"""Create eBay listings for Lalla and Tislit (the two July-19 rugs not yet on eBay).

⚠ RUN ONLY AFTER THE SITE IS DEPLOYED. eBay has no file upload — it fetches every
image from tizirirugs.com at ingestion and caches the result. If the galleries
aren't live, both listings publish with no photos and eBay will not re-fetch.
The script refuses to run unless every image URL returns 200 first.

Usage:  python create_lalla_tislit.py           (preflight only - checks images, no writes)
        python create_lalla_tislit.py --apply   (create inventory item + offer + publish)
"""
import os, sys, json, base64, time
import httpx

HOME = os.path.expanduser("~")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAL  = os.path.join(ROOT, "rug-photos", "Newly taken photos")
BASE = "https://tizirirugs.com/rug-photos/Newly%20taken%20photos"
V    = "6"

CATEGORY   = "262983"                 # Area Rugs
LOCATION   = "revere-ma"
POLICIES   = {"fulfillmentPolicyId": "275322292019",   # required or publish fails 25007
              "paymentPolicyId":     "275322287019",
              "returnPolicyId":      "275322288019"}

APPLY = "--apply" in sys.argv
c = httpx.Client(verify=False, timeout=90)


def token():
    appid = open(os.path.join(HOME, ".ebay-appid.txt")).read().strip()
    cert  = open(os.path.join(HOME, ".ebay-certid.txt")).read().strip()
    ref   = open(os.path.join(HOME, ".ebay-refresh.txt")).read().strip()
    b = base64.b64encode(f"{appid}:{cert}".encode()).decode()
    r = c.post("https://api.ebay.com/identity/v1/oauth2/token",
               headers={"Authorization": "Basic " + b,
                        "Content-Type": "application/x-www-form-urlencoded"},
               data={"grant_type": "refresh_token", "refresh_token": ref})  # no scope param
    r.raise_for_status()
    t = r.json()["access_token"]
    open(os.path.join(HOME, ".ebay-token.txt"), "w").write(t)
    return t


def desc(intro, size, style, colour, pile):
    return (
        "<h2>One-of-a-Kind Handwoven Moroccan Rug</h2>"
        f"<p>{intro}</p>"
        "<ul>"
        f"<li><b>Style:</b> {style}</li>"
        f"<li><b>Colour:</b> {colour}</li>"
        f"<li><b>Size:</b> {size}</li>"
        "<li><b>Material:</b> 100% natural wool, hand-knotted</li>"
        f"<li><b>Pile:</b> {pile}</li>"
        "<li><b>Condition:</b> New / unworn</li>"
        "</ul>"
        "<p><b>Ready to ship</b> — in stock in Revere, MA (USA). Ships free within 1–2 business days.</p>"
        "<p><b>Care:</b> Vacuum on low suction. Spot clean with cold water. Do not machine wash.</p>"
        "<p>Hand-knotted by Berber artisans in the Atlas Mountains of Morocco. "
        "A single original piece — this exact rug will never be woven again.</p>"
    )


ITEMS = [
    {
        "slug": "lalla", "sku": "LALLA", "price": "1350.00",
        "title": "Handmade Moroccan Beni Ourain Rug 9'10\" x 6'7\" Carved Ivory Wool Area Rug",
        "aspects": {
            "Shape": ["Rectangle"], "Size": ["9'10\" x 6'7\" (300 x 200 cm)"],
            "Item Length": ["9 ft 10 in"], "Item Width": ["6 ft 7 in"],
            "Regional Design": ["Moroccan"], "Style": ["Beni Ourain"],
            "Culture": ["Berber"], "Color": ["Ivory"], "Material": ["Wool"],
            "Pattern": ["Geometric"], "Theme": ["Geometric"],
            "Pile Type": ["Cut"], "Pile Height": ["High"], "Weave": ["Hand-Knotted"],
            "Production Technique": ["Hand-Knotted"], "Handmade": ["Yes"],
            "Features": ["Handwoven", "One of a Kind"], "Type": ["Area Rug"],
            "Room": ["Living Room", "Bedroom", "Dining Room", "Home Office"],
            "Department": ["Adults"], "Brand": ["TIZIRI"],
            "Original/Reproduction": ["Original"], "Time Period Manufactured": ["2020-Now"],
            "Country/Region of Manufacture": ["Morocco"],
            "Care Instructions": ["Vacuum on low suction; spot clean with cold water"],
        },
        "desc": desc(
            "All ivory, no colour — the pattern is pure carved depth. Sweeping chevrons and arcs are "
            "sculpted into the plush undyed pile, revealing themselves only as the light crosses the "
            "room. Finished with hand-braided fringe.",
            "300 × 200 cm (9 ft 10 in × 6 ft 7 in)", "Beni Ourain / Carved",
            "Natural undyed ivory", "High"),
    },
    {
        "slug": "tislit", "sku": "TISLIT", "price": "800.00",
        "title": "Handmade Moroccan Beni Mrirt Rug 6'4\" x 4'2\" Blush Pink Abstract Wool Rug",
        "aspects": {
            "Shape": ["Rectangle"], "Size": ["6'4\" x 4'2\" (194 x 127 cm)"],
            "Item Length": ["6 ft 4 in"], "Item Width": ["4 ft 2 in"],
            "Regional Design": ["Moroccan"], "Style": ["Mrirt"],
            "Culture": ["Berber"], "Color": ["Pink"], "Material": ["Wool"],
            "Pattern": ["Abstract"], "Theme": ["Abstract"],
            "Pile Type": ["Cut"], "Pile Height": ["High"], "Weave": ["Hand-Knotted"],
            "Production Technique": ["Hand-Knotted"], "Handmade": ["Yes"],
            "Features": ["Handwoven", "One of a Kind"], "Type": ["Area Rug"],
            "Room": ["Living Room", "Bedroom", "Home Office"],
            "Department": ["Adults"], "Brand": ["TIZIRI"],
            "Original/Reproduction": ["Original"], "Time Period Manufactured": ["2020-Now"],
            "Country/Region of Manufacture": ["Morocco"],
            "Care Instructions": ["Vacuum on low suction; spot clean with cold water"],
        },
        "desc": desc(
            "A blush-pink Beni Mrirt with a bold abstract colour block in chocolate and dusty rose, "
            "hand-knotted in thick Atlas wool. The high pile is deep and soft underfoot and the "
            "composition reads like a modern painting.",
            "194 × 127 cm (6 ft 4 in × 4 ft 2 in)", "Beni Mrirt / Contemporary",
            "Blush pink with chocolate and dusty rose", "High"),
    },
]


def urls(slug):
    n = len([f for f in os.listdir(os.path.join(GAL, slug))
             if f.startswith(slug + "-") and f.endswith(".webp")])
    return ["%s/%s/%s-%02d.webp?v=%s" % (BASE, slug, slug, i, V) for i in range(1, n + 1)]


def preflight(item):
    """Every image must be live AND the right size, or eBay caches a broken listing."""
    ok = True
    for u in urls(item["slug"]):
        local = os.path.join(GAL, item["slug"],
                             u.split("/")[-1].split("?")[0])
        try:
            r = c.head(u, follow_redirects=True)
            size = int(r.headers.get("Content-Length", 0))
        except Exception as e:
            print(f"    {u.split('/')[-1]}: UNREACHABLE ({e.__class__.__name__})"); ok = False; continue
        want = os.path.getsize(local)
        if r.status_code != 200:
            print(f"    {u.split('/')[-1]}: HTTP {r.status_code}"); ok = False
        elif size and abs(size - want) > 64:
            print(f"    {u.split('/')[-1]}: STALE (live {size}B vs local {want}B)"); ok = False
    return ok


def main():
    tok = token()
    h = {"Authorization": "Bearer " + tok, "Content-Type": "application/json",
         "Accept": "application/json", "Content-Language": "en-US"}

    for item in ITEMS:
        print(f"\n=== {item['sku']}  ${item['price']}  {len(urls(item['slug']))} photos ===")
        print("  preflight (images live + current)...")
        if not preflight(item):
            print("  BLOCKED - deploy the site first, then re-run.")
            continue
        print("  OK - all images live")
        if not APPLY:
            print("  (preflight only - re-run with --apply to create)")
            continue

        body = {"sku": item["sku"], "locale": "en_US", "condition": "NEW",
                "availability": {"shipToLocationAvailability": {"quantity": 1}},
                "product": {"title": item["title"][:80], "aspects": item["aspects"],
                            "description": item["desc"], "imageUrls": urls(item["slug"])}}
        r = c.put(f"https://api.ebay.com/sell/inventory/v1/inventory_item/{item['sku']}",
                  headers=h, json=body)
        print("  inventory_item:", r.status_code, "" if r.status_code in (200, 204) else r.text[:300])
        if r.status_code not in (200, 204):
            continue

        offer = {"sku": item["sku"], "marketplaceId": "EBAY_US", "format": "FIXED_PRICE",
                 "availableQuantity": 1, "categoryId": CATEGORY,
                 "listingDescription": item["desc"],
                 "listingPolicies": POLICIES,
                 "pricingSummary": {"price": {"value": item["price"], "currency": "USD"}},
                 "merchantLocationKey": LOCATION}
        ro = c.post("https://api.ebay.com/sell/inventory/v1/offer", headers=h, json=offer)
        if ro.status_code not in (200, 201):
            print("  offer FAILED:", ro.status_code, ro.text[:400]); continue
        oid = ro.json()["offerId"]
        print("  offer:", oid)

        rp = c.post(f"https://api.ebay.com/sell/inventory/v1/offer/{oid}/publish", headers=h, json={})
        if rp.status_code in (200, 201):
            lid = rp.json().get("listingId")
            print(f"  PUBLISHED listingId={lid}  https://www.ebay.com/itm/{lid}")
            ledger = os.path.join(ROOT, "ebay", "listings.json")
            d = json.load(open(ledger, encoding="utf-8"))
            d[item["slug"]] = {"sku": item["sku"], "offerId": oid, "listingId": lid,
                               "price": float(item["price"]), "video": False, "state": "live"}
            json.dump(d, open(ledger, "w", encoding="utf-8"), indent=2)
            print("  ledger updated")
        else:
            print("  publish FAILED:", rp.status_code, rp.text[:400])
        time.sleep(1)


if __name__ == "__main__":
    main()
