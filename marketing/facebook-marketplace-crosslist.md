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

### Pipeline notes (2026-07-13 refinements)
- Photo upload: local server `scratchpad/fb_server.py` (port 8765) + fb_helper.html.
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
