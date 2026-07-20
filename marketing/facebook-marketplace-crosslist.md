# eBay → Facebook Marketplace cross-listing progress

Started 2026-07-08. All 27 published by Abdel same day.

## STATUS 2026-07-13: PHOTO REFRESH DONE + 5 NEW DRAFTS AWAITING ABDEL'S PUBLISH

### Photo swaps (LIVE, updated by Claude via Chrome pipeline 07-13)
fadwa, hafsa, majda, nabila, najat, sanaa, sirine, warda, zahia — all now carry the
final camera-WB galleries (same photos as site/Etsy/eBay).

### Drafts awaiting Abdel's PUBLISH click (Marketplace → Create new listing → Drafts)
1. malak — was already a draft (its published copy vanished?); photos swapped to new set
2. wahiba — old listing GONE from FB (deleted/expired, not in seller list); recreated
   fresh with 10 new photos, $1,800
3. itto — NEW, 10 photos, $1,350
4. tilila — NEW, 10 photos, $1,450
5. touda — NEW, 10 photos, $1,400
6. yenna — NEW, 10 photos, $1,400
All have title/price/category Household/condition New/description + photos.

### Skipped
samia — photo swap deferred; its gallery is being rebuilt from Abdel's raws
(embedded-camera-preview method). Swap FB photos after that lands.

### ✅ DONE 07-13 night: no-yellow photo refresh executed via the rebuilt pipeline
Updated live: **yenna** (was the WRONG RUG — now 10 real-yenna photos + new title
"Carved Stepped Channels" + new description; wrong-rug VIDEO removed — Abdel drags the
correct one by hand), **warda** (card-patched set), **nabila**, **hafsa**, **samia/rihab**
(listing 2114132449485259, was deferred), **majda**. Draft updated: **wahiba** (10 new
photos, still a draft for Abdel to publish). Already current, untouched: touda/itto
drafts, tilila active. No FB listings exist for zahia/sirine/fadwa/najat.
Listing ids: yenna 1503744301079185, warda 1382276323999339, nabila 2330159944405658,
hafsa 27245594408417074, samia/rihab 2114132449485259, majda 2145641316011245,
wahiba draft 827747943624986, touda draft 1054887010231639, itto draft 963346200054630.

### (superseded) queued 07-13 night: photo refresh for the no-yellow rebuilds
Site + Etsy + eBay all updated 07-13; FB still shows previous-generation photos for:
**warda, zahia, sirine, samia, nabila (live listings) + the malak/wahiba/itto/tilila/touda/yenna
drafts** — and the yenna draft has the WRONG RUG's photos (touda dupes), fix before Abdel publishes.
najat/fadwa/hafsa: check whether FB listings exist; refresh if so.
Pipeline files now PERMANENT in `marketing/fb-pipeline/` (fb_server.py + fb_helper.html,
smoke-tested 07-13: helper 200, photos 200). FB-tab listener to arm before navigating the
helper tab (run in FB tab console/JS):
```js
window.addEventListener('message', e => {
  if (!e.data || !e.data.fbPipeline) return;
  const inp = document.querySelector('input[type="file"][accept*="image"]');
  const dt = new DataTransfer();
  e.data.files.forEach(f => dt.items.add(f));
  inp.files = dt.files;
  inp.dispatchEvent(new Event('change', {bubbles: true}));
}, {once: true});
```

### Pipeline notes (2026-07-13 refinements)
- Photo upload: local server `marketing/fb-pipeline/fb_server.py` (port 8765) + fb_helper.html.
  A helper tab opened ONCE from the FB tab (injected button + trusted click) keeps its
  window.opener across BOTH tabs' navigations — so for each subsequent rug: arm a
  message listener in the FB tab, then just NAVIGATE the helper tab to
  helper.html?rug=X&n=N. No new popups needed.
- Helper tabs freeze after 1-2 uses (renderer hang) — rotate among several helper tabs,
  or open a fresh one via the injected-button trick.
- All form interaction via JS: native value setter for inputs/textarea, label.click()
  for Category/Condition, then click option by exact text ('Household', 'New');
  buttons clicked by exact text ('Next', 'Update', 'Save draft').
- Verify the edit form title BEFORE touching anything (title_search matches
  descriptions too).
- Active-listing edit flow: remove old photos → send new → Next → Update (saves live).

### Ongoing (manual, Abdel) — unchanged
1. Renew weekly. 2. Videos drag-drop by hand (FB blocks synthetic video uploads).
3. Cross-post to groups (never VINTAGE ITEMS FOR SALE). 4. One-of-one rule: sold
   anywhere = delete on FB same day. 5. Never list Nawal; Rania awaits reshoot.

## STATUS 2026-07-15: ALL DRAFTS PUBLISHED ✅
Confirmed live via Chrome (Abdo Kindyman, 20+ active listings). The 6 rugs that were
awaiting publish are all Active now: wahiba, itto, tilila, yenna, touda were already
published earlier; **malak was the last remaining draft — published 2026-07-15**
(lime-green orange diamond, $1,050, listing_id 1283539893856735, Active + posted to a
rug group). No FB rug drafts remain. Older 7/8 catalog also confirmed live.
