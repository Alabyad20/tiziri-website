"""Point the July-19 reshot eBay listings at the new galleries.

⚠ RUN ONLY AFTER THE SITE IS DEPLOYED. eBay fetches images from tizirirugs.com by
URL and caches them at ingest. Bumping ?v= before the new files are live would make
eBay re-fetch and permanently cache the OLD photos.

Usage:  python refresh_july19_photos.py            (dry run - prints what it would do)
        python refresh_july19_photos.py --apply    (writes to eBay)
"""
import os, sys, json, glob, base64, time
import httpx

HOME = os.path.expanduser("~")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAL  = os.path.join(ROOT, "rug-photos", "Newly taken photos")
V    = "6"                      # must match the ?v= used on the website
BASE = "https://tizirirugs.com/rug-photos/Newly%20taken%20photos"

SKUS = {           # slug: sku   (lalla + tislit are not on eBay yet)
    "bouchra": "BOUCHRA",
    "kawtar":  "KAWTAR",
    "zineb":   "ZINEB",
    "sabrine": "SABRINE",
    "ouafa":   "OUAFA",
    "najoua":  "NAJOUA",
    "samia":   "SAMIA",
}

APPLY = "--apply" in sys.argv
c = httpx.Client(verify=False, timeout=60)


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


def main():
    tok = token()
    h = {"Authorization": "Bearer " + tok, "Content-Type": "application/json",
         "Accept": "application/json", "Content-Language": "en-US"}

    for slug, sku in SKUS.items():
        n = len(glob.glob(os.path.join(GAL, slug, "%s-*.webp" % slug)))
        urls = ["%s/%s/%s-%02d.webp?v=%s" % (BASE, slug, slug, i, V) for i in range(1, n + 1)]

        r = c.get(f"https://api.ebay.com/sell/inventory/v1/inventory_item/{sku}", headers=h)
        if r.status_code != 200:
            print(f"{slug}: GET {r.status_code} {r.text[:120]}"); continue
        item = r.json()
        before = len(item.get("product", {}).get("imageUrls", []))
        item.setdefault("product", {})["imageUrls"] = urls

        if not APPLY:
            print(f"{slug:8s} {before:2d} -> {n:2d} images (dry run)")
            continue

        p = c.put(f"https://api.ebay.com/sell/inventory/v1/inventory_item/{sku}",
                  headers=h, json=item)
        print(f"{slug:8s} {before:2d} -> {n:2d} images  PUT {p.status_code}"
              f"{'' if p.status_code in (200, 204) else ' ' + p.text[:160]}")
        time.sleep(1)

    if not APPLY:
        print("\nDRY RUN - nothing written. Re-run with --apply once the site is deployed.")


if __name__ == "__main__":
    main()
