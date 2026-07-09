# eBay → Facebook Marketplace cross-listing progress

Started 2026-07-08. Goal: post all 27 active fixed-price eBay listings (tizirirugs shop) to Facebook Marketplace on Abdo Kindyman's personal profile.

## STATUS 2026-07-08 (late evening): ✅ ALL 27 LISTINGS PUBLISHED BY ABDEL

Same-day pipeline: drafts built with photos+all fields (automated), Abdel reviewed and published every listing the same evening. Channel is LIVE.

### Ongoing (manual, Abdel)
1. **Renew weekly** (Marketplace → Your listings → Renew). Full price, no OBO.
2. **Videos (optional):** FB blocks all synthetic-event video uploads, so videos must be drag-dropped by hand onto a listing's edit form. 17 muted, FB-ready videos (audio stripped per the standing listings rule) are staged in `rug-videos\FB-Marketplace-muted\<sku>_fb.mp4`.
3. **Cross-post to groups** via "List in more places" / share — member of 9 rug & local buy-sell groups as of 07-08 (5 more pending approval); respect per-group daily caps. ⚠ Never post in VINTAGE ITEMS FOR SALE (vintage-only rules).
4. **One-of-one rule:** when a rug sells anywhere, delete its FB listing same day (and vice versa: FB sale → end eBay/Etsy/site).

### How the photo automation worked (for future sessions)
- FB file pickers never open on extension-automated tabs (chooser intercepted) and `file_upload` only accepts session-shared paths — both dead ends.
- Working pipeline: local HTTP server (`127.0.0.1:8765`) serving rug-photos + a helper page; helper tab fetches photos same-origin, builds File objects, `window.opener.postMessage` them into the FB tab (opener survives navigation, no popups needed after the first); injected listener sets `photoInput.files` via DataTransfer + `change` event. Photos accepted; **video input ignores untrusted events — do not retry synthetic video uploads.**
- Text fields set via native value setter + input/change events; Category chip / Condition option / Save draft clicked via JS `.click()` — all work.
- GOTCHA: `?title_search=` on /marketplace/you/selling also matches DESCRIPTIONS, and clicking blind can open the wrong rug's draft. ALWAYS verify the edit form's title input matches the intended rug before touching anything (this prevented 3 near-misses: rihab-for-rachida, warda-for-sirine, sabrine-for-sanaa).
- Photo source of truth: each rug page's `product__gallery` `data-src` list (NOT all page `<img>`s — the nav mega-menu mosque photo poisoned hafsa's first attempt; caught and removed).

## Full listing inventory (27) — all "Draft + photos ✅ (video pending)" unless noted

| # | SKU | eBay item ID | Price | Title | FB status |
|---|-----|-----|-------|-------|-----------|
| 1 | TAFAT | 307044668413 | $1,100 | Moroccan Mrirt Rug 9'6" x 6'6" Handwoven Grey Geometric Berber Wool Carpet | Draft + 8 photos ✅ |
| 2 | FADWA | 307044729207 | $1,950 | Moroccan Contemporary Rug 9'5" x 6'9" Handmade Picasso Abstract Berber Wool | Draft + 9 photos ✅ (no video exists) |
| 3 | IKRAM | 307044729296 | $1,750 | Moroccan Contemporary Rug 9'10" x 6'11" Handmade Black White Checkered Wool | Draft + 8 photos ✅ (no video exists) |
| 4 | KARIMA2 | 307044729323 | $1,050 | Moroccan Contemporary Rug 8' x 5'2" Handmade Neutral Berber Wool Area Carpet | Draft + 9 photos ✅ (no video exists) |
| 5 | LATIFA | 307044729338 | $1,200 | Moroccan Contemporary Rug 8'11" x 6'7" Handmade Berber Wool Area Carpet | Draft + 9 photos ✅ (no video exists) |
| 6 | NAJAT | 307044729359 | $1,300 | Moroccan Boujaad Rug 10' x 6'4" Handmade Rainbow Diamond Berber Wool Carpet | Draft + 9 photos ✅ |
| 7 | NAJOUA | 307044729389 | $1,100 | Moroccan Beni Ourain Rug 8' x 5'3" Cobalt Blue Handmade Berber Wool Carpet | Draft + 9 photos ✅ (no video exists) |
| 8 | RACHIDA | 307044729410 | $1,350 | Moroccan Beni Ourain Rug 9'10" x 6'7" Ivory Diamond Handmade Berber Wool Rug | Draft + 9 photos ✅ (no video exists) |
| 9 | SAADIA | 307044729453 | $1,400 | Moroccan Beni Ourain Rug 10'4" x 6'3" Ivory Handmade Berber Wool Area Carpet | Draft + 9 photos ✅ (no video exists) |
| 10 | SIRINE | 307044729473 | $1,200 | Moroccan Rug 8'2" x 5'3" Bold Color Block Handmade Berber Wool Area Carpet | Draft + 8 photos ✅ (no video exists) |
| 11 | WAHIBA | 307044729492 | $1,800 | Moroccan Boujaad Rug 10'1" x 6'1" Handmade Multicolor Tribal Berber Wool Rug | Draft + 10 photos ✅ |
| 12 | ZINEB | 307044729564 | $1,300 | Moroccan Mrirt Rug 9'10" x 6'7" Stone Grey Textured Handmade Berber Wool Rug | Draft + 8 photos ✅ |
| 13 | SAMIA | 307044729596 | $1,050 | Moroccan Azilal Rug 7'11" x 5'3" Handmade Multicolor Folk Art Berber Wool Rug | Draft + 9 photos ✅ |
| 14 | MALAK | 307044729633 | $1,050 | Moroccan Beni Ourain Rug 8' x 5' Lime Green Orange Handmade Berber Wool Rug | Draft + 10 photos ✅ |
| 15 | SANAA | 307044729653 | $1,050 | Moroccan Beni Ourain Rug 8'4" x 4'10" Chartreuse Green Grid Handmade Wool | Draft + 10 photos ✅ |
| 16 | ASSIA | 307044729686 | $1,400 | Moroccan Beni Ourain Rug 9'4" x 6'11" Ivory Carved Medallion Handmade Wool Carpet | Draft + 10 photos ✅ (no video exists) |
| 17 | KAWTAR | 307044729717 | $1,450 | Moroccan Beni Ourain Rug 9'8" x 6'11" Ivory Black Grid Mondrian Handmade Wool | Draft + 10 photos ✅ |
| 18 | ZAHIA | 307044729750 | $1,450 | Moroccan Boujaad Rug 9'9" x 6'11" Burgundy Tribal Symbols Handmade Wool Rug | Draft + 10 photos ✅ |
| 19 | OUAFA | 307044729777 | $1,300 | Moroccan Mrirt Rug 9'10" x 6'3" Teal Ivory Carved Pile Handmade Wool Carpet | Draft + 10 photos ✅ (Condition/Material completed 07-08) |
| 20 | HAFSA | 307044729809 | $1,500 | Moroccan Beni Ourain Rug 9'10" x 7'3" Pink Grey Diamond Handmade Wool Carpet | Draft + 10 photos ✅ |
| 21 | SABRINE | 307044729833 | $1,400 | Moroccan Rug 10' x 6'6" Ivory Confetti Dot Handmade Berber Wool Area Carpet | Draft + 10 photos ✅ |
| 22 | BOUCHRA | 307045651405 | $1,050 | Moroccan Contemporary Rug 10' x 6'8" Burgundy Grid Ivory Handmade Wool Carpet | Draft + 10 photos ✅ |
| 23 | MAJDA | 307046040130 | $1,400 | Moroccan Abstract Rug 9'5" x 6'4" Handmade Contemporary Berber Wool Carpet | Draft + 8 photos ✅ |
| 24 | NABILA | 307046040161 | $1,850 | Moroccan Rug 10'4" x 6'11" Forest Green Abstract Handmade Berber Wool Carpet | Draft + 7 photos ✅ |
| 25 | RANIA | 307046040208 | $1,450 | Moroccan Contemporary Rug 9'11" x 6'9" Terracotta Olive Handmade Berber Wool | Draft + 1 photo ✅ (only photo that exists — needs reshoot; no video) |
| 26 | WARDA | 307046054599 | $1,100 | Moroccan Rug 7'11" x 5'4" Ivory Abstract Handmade Berber Wool Area Carpet | Draft + 10 photos ✅ |
| 27 | RIHAB | 307046054640 | $1,400 | Moroccan Azilal Rug 9'9" x 6'8" Ivory Diamond Multicolor Handmade Wool Rug | Draft + 5 photos ✅ |

Key facts from the first session (still true): FB Marketplace requires the personal profile (Abdo Kindyman), Pages can't list. Category=Household (closest fit), Condition=New (matches eBay "New with tags"), Material=Wool. Location auto-fills Revere, MA. Descriptions adapted from each rug page's meta description + size/material/condition lines.
