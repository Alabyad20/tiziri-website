"""Create eBay listings for Chama, Dassine, Lina, Tanirt, Yakout.

Preflight-gated on the images being live (eBay fetches from tizirirugs.com and
caches at ingestion). Drops zero-weight packageWeightAndSize (error 25709) and
re-asserts availability before publish (error 25604).

Usage: python create_missing5.py            (preflight only)
       python create_missing5.py --apply
"""
import os, sys, json, base64, time, urllib.parse
import httpx

HOME = os.path.expanduser("~")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://tizirirugs.com/rug-photos"
CATEGORY = "262983"
LOCATION = "revere-ma"
POLICIES = {"fulfillmentPolicyId": "275322292019",
            "paymentPolicyId":     "275322287019",
            "returnPolicyId":      "275322288019"}
APPLY = "--apply" in sys.argv
c = httpx.Client(verify=False, timeout=90)
rugs = {r["slug"]: r for r in json.load(open(os.path.join(ROOT, "data", "rugs.json"), encoding="utf-8"))}


def token():
    b = base64.b64encode((open(os.path.join(HOME, ".ebay-appid.txt")).read().strip() + ":" +
                          open(os.path.join(HOME, ".ebay-certid.txt")).read().strip()).encode()).decode()
    r = c.post("https://api.ebay.com/identity/v1/oauth2/token",
               headers={"Authorization": "Basic " + b,
                        "Content-Type": "application/x-www-form-urlencoded"},
               data={"grant_type": "refresh_token",
                     "refresh_token": open(os.path.join(HOME, ".ebay-refresh.txt")).read().strip()})
    r.raise_for_status()
    t = r.json()["access_token"]
    open(os.path.join(HOME, ".ebay-token.txt"), "w").write(t)
    return t


def desc(intro, style, colour, size, pile):
    return ("<h2>One-of-a-Kind Handwoven Moroccan Rug</h2>"
            f"<p>{intro}</p><ul>"
            f"<li><b>Style:</b> {style}</li><li><b>Colour:</b> {colour}</li>"
            f"<li><b>Size:</b> {size}</li>"
            "<li><b>Material:</b> 100% natural wool, hand-knotted</li>"
            f"<li><b>Pile:</b> {pile}</li><li><b>Condition:</b> New / unworn</li></ul>"
            "<p><b>Ready to ship</b> - in stock in Revere, MA (USA). Ships free within 1-2 business days.</p>"
            "<p><b>Care:</b> Vacuum on low suction. Spot clean with cold water. Do not machine wash.</p>"
            "<p>Hand-knotted by Berber artisans in the Atlas Mountains of Morocco. "
            "A single original piece - this exact rug will never be woven again.</p>")


def aspects(size_disp, length, width, style, colour, pattern, pile):
    return {"Shape": ["Rectangle"], "Size": [size_disp],
            "Item Length": [length], "Item Width": [width],
            "Regional Design": ["Moroccan"], "Style": [style], "Culture": ["Berber"],
            "Color": [colour], "Material": ["Wool"], "Pattern": [pattern], "Theme": [pattern],
            "Pile Type": ["Cut"], "Pile Height": [pile], "Weave": ["Hand-Knotted"],
            "Production Technique": ["Hand-Knotted"], "Handmade": ["Yes"],
            "Features": ["Handwoven", "One of a Kind"], "Type": ["Area Rug"],
            "Room": ["Living Room", "Bedroom", "Dining Room", "Home Office"],
            "Department": ["Adults"], "Brand": ["TIZIRI"],
            "Original/Reproduction": ["Original"], "Time Period Manufactured": ["2020-Now"],
            "Country/Region of Manufacture": ["Morocco"],
            "Care Instructions": ["Vacuum on low suction; spot clean with cold water"]}


ITEMS = [
 {"slug":"dihya","sku":"DIHYA","price":"1350.00",
  "title":"Handmade Moroccan Rug 10'0\" x 7'1\" Rust Olive Colour Block Wool Area Rug",
  "aspects":aspects("10'0\" x 7'1\" (305 x 215 cm)","10 ft 0 in","7 ft 1 in","Mrirt","Orange","Abstract","High"),
  "desc":desc("Colour, blocked. Clean fields of rust-orange and olive-green float on a natural cream ground "
              "- a bold, modern colour-block composition with real hand-knotted depth and a deep, soft surface.",
              "Beni Mrirt / Contemporary","Rust orange, olive green and cream","305 x 215 cm (10 ft 0 in x 7 ft 1 in)","High")},
 {"slug":"chama","sku":"CHAMA","price":"1400.00",
  "title":"Handmade Moroccan Beni Mrirt Rug 9'11\" x 6'11\" Terracotta Carved Wool Area Rug",
  "aspects":aspects("9'11\" x 6'11\" (303 x 210 cm)","9 ft 11 in","6 ft 11 in","Mrirt","Orange","Abstract","High"),
  "desc":desc("Warmth you can sink into. A deep terracotta shag in high-pile wool, carved into soft "
              "brick-like panels that catch the light and shift tone through the day.",
              "Beni Mrirt / Carved shag","Deep terracotta rust","303 x 210 cm (9 ft 11 in x 6 ft 11 in)","High")},
 {"slug":"dassine","sku":"DASSINE","price":"1050.00",
  "title":"Handmade Moroccan Beni Ourain Rug 9'0\" x 5'1\" Textured Cream Undyed Wool Rug",
  "aspects":aspects("9'0\" x 5'1\" (274 x 156 cm)","9 ft 0 in","5 ft 1 in","Beni Ourain","Ivory","Solid","High"),
  "desc":desc("Quiet texture. Undyed wool woven into a soft basketweave relief you notice with your feet "
              "before your eyes - no dye, no pattern, just the character of the fleece.",
              "Beni Ourain / Textured","Natural undyed cream","274 x 156 cm (9 ft 0 in x 5 ft 1 in)","High")},
 {"slug":"lina","sku":"LINA","price":"1250.00",
  "title":"Handmade Moroccan Beni Ourain Rug 9'10\" x 6'7\" Ivory Diamond Lattice Wool Rug",
  "aspects":aspects("9'10\" x 6'7\" (300 x 200 cm)","9 ft 10 in","6 ft 7 in","Beni Ourain","Ivory","Geometric","Medium"),
  "desc":desc("An ivory ground with a repeating diamond lattice in a soft tone-on-tone weave. The pile "
              "texture and diamond structure carry the whole design, with no colour needed.",
              "Beni Ourain / Classic","Ivory, tone-on-tone","300 x 200 cm (9 ft 10 in x 6 ft 7 in)","Medium-high")},
 {"slug":"tanirt","sku":"TANIRT","price":"1250.00",
  "title":"Handmade Moroccan Beni Ourain Rug 10'2\" x 6'7\" Serene Ivory Diamond Wool Rug",
  "aspects":aspects("10'2\" x 6'7\" (309 x 200 cm)","10 ft 2 in","6 ft 7 in","Beni Ourain","Ivory","Geometric","High"),
  "desc":desc("Tanirt means &quot;angel&quot; in Tamazight. A serene ivory Beni Ourain with a whisper-soft "
              "tone-on-tone diamond lattice and a deep, cloud-like pile.",
              "Beni Ourain / Classic","Serene ivory","309 x 200 cm (10 ft 2 in x 6 ft 7 in)","High")},
 {"slug":"yakout","sku":"YAKOUT","price":"950.00",
  "title":"Handmade Moroccan Beni Ourain Rug 7'10\" x 4'9\" Cream Carved Wool Area Rug",
  "aspects":aspects("7'10\" x 4'9\" (240 x 144 cm)","7 ft 10 in","4 ft 9 in","Beni Ourain","Ivory","Geometric","High"),
  "desc":desc("A soft cream Beni Ourain with a gently carved tone-on-tone field, hand-knotted in undyed "
              "Atlas wool. Compact, plush and quietly classic.",
              "Beni Ourain / Carved","Soft cream","240 x 144 cm (7 ft 10 in x 4 ft 9 in)","High")},
]


def urls(slug):
    out = []
    for u_ in rugs[slug]["images"][:24]:
        out.append(u_ + ("&" if "?" in u_ else "?") + "v=6")
    return out


def preflight(slug):
    ok = True
    for u_ in urls(slug):
        try:
            r = c.head(u_, follow_redirects=True)
        except Exception as e:
            print("    %s UNREACHABLE %s" % (u_.split("/")[-1], e.__class__.__name__)); ok = False; continue
        if r.status_code != 200:
            print("    %s HTTP %s" % (u_.split("/")[-1], r.status_code)); ok = False
    return ok


def main():
    tok = token()
    h = {"Authorization": "Bearer " + tok, "Content-Type": "application/json",
         "Accept": "application/json", "Content-Language": "en-US"}
    ledger_path = os.path.join(ROOT, "ebay", "listings.json")
    ledger = json.load(open(ledger_path, encoding="utf-8"))

    for it in ITEMS:
        slug = it["slug"]
        print("\n=== %s  $%s  %d photos ===" % (it["sku"], it["price"], len(urls(slug))))
        if slug in ledger and ledger[slug].get("state") == "live":
            print("   already on eBay (%s) - SKIPPED" % ledger[slug].get("listingId")); continue
        if not preflight(slug):
            print("   BLOCKED - images not live"); continue
        print("   OK - images live")
        if not APPLY:
            continue

        body = {"sku": it["sku"], "locale": "en_US", "condition": "NEW",
                "availability": {"shipToLocationAvailability":
                                 {"quantity": 1, "allocationByFormat": {"auction": 0, "fixedPrice": 1}}},
                "product": {"title": it["title"][:80], "aspects": it["aspects"],
                            "description": it["desc"], "imageUrls": urls(slug)}}
        r = c.put(f"https://api.ebay.com/sell/inventory/v1/inventory_item/{it['sku']}", headers=h, json=body)
        print("   inventory_item:", r.status_code, "" if r.status_code in (200, 204) else r.text[:250])
        if r.status_code not in (200, 204):
            continue
        time.sleep(3)

        offer = {"sku": it["sku"], "marketplaceId": "EBAY_US", "format": "FIXED_PRICE",
                 "availableQuantity": 1, "categoryId": CATEGORY,
                 "listingDescription": it["desc"], "listingPolicies": POLICIES,
                 "pricingSummary": {"price": {"value": it["price"], "currency": "USD"}},
                 "merchantLocationKey": LOCATION}
        ro = c.post("https://api.ebay.com/sell/inventory/v1/offer", headers=h, json=offer)
        if ro.status_code not in (200, 201):
            print("   offer FAILED:", ro.status_code, ro.text[:300]); continue
        oid = ro.json()["offerId"]
        print("   offer:", oid)

        rp = c.post(f"https://api.ebay.com/sell/inventory/v1/offer/{oid}/publish", headers=h, json={})
        if rp.status_code not in (200, 201):        # 25604 availability lag - re-assert and retry
            time.sleep(5)
            c.put(f"https://api.ebay.com/sell/inventory/v1/inventory_item/{it['sku']}", headers=h, json=body)
            time.sleep(5)
            rp = c.post(f"https://api.ebay.com/sell/inventory/v1/offer/{oid}/publish", headers=h, json={})
        if rp.status_code in (200, 201):
            lid = rp.json().get("listingId")
            print("   PUBLISHED %s  https://www.ebay.com/itm/%s" % (lid, lid))
            ledger[slug] = {"sku": it["sku"], "offerId": oid, "listingId": lid,
                            "price": float(it["price"]), "video": False, "state": "live"}
            json.dump(ledger, open(ledger_path, "w", encoding="utf-8"), indent=2)
        else:
            print("   publish FAILED:", rp.status_code, rp.text[:300])
        time.sleep(2)


if __name__ == "__main__":
    main()
