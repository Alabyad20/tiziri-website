# Meta Ads — Phase 1 Launch Steps (do-it-yourself, ~5 min)
_Tiziri · 2026-07-14 · $10/day · objective: Sales on tizirirugs.com_

## Your setup (already done — just select these when asked)
- **Ad account:** 2016598115342392
- **Pixel / dataset:** "Tiziri" — `1677465513542864` (live, firing)
- **Catalog:** "TIZIRI Rugs" — `1535325678271049` (30 items)
- **Facebook Page / IG:** Tiziri Rugs / @tizirirugs (both active)

## ⚠️ FIRST: check the "New Sales Campaign" that's toggled ON
In Ads Manager there's an existing campaign named **"New Sales Campaign"** switched **ON**. I couldn't inspect it (Meta pages froze the automation). Before anything: click into it and confirm it's not silently spending / not a leftover. If it's an empty or unwanted draft, toggle it **OFF** or delete it. (Your violin campaigns are all off — leave them.)

## Build the campaign
1. Ads Manager → green **+ Create**.
2. Objective: **Sales** → Continue.
3. Campaign setup:
   - Campaign name: `TIZIRI_Sales_ASC_2026-07`
   - Choose **Advantage+ Sales campaign** (simplest, Meta-recommended for small e-commerce). *(If it asks manual vs Advantage+, pick Advantage+.)*
   - **Advantage campaign budget: $10.00 / day.**
4. At the ad-set / account level, set:
   - **Conversion location: Website**
   - **Pixel/dataset: Tiziri (1677465513542864)**
   - **Conversion event:** it will default to **Purchase**. Because your pixel has zero purchase history yet, change it if allowed to **View Content** (or "Add to cart") for the first ~2 weeks so the algorithm can actually learn on cheap, frequent events — then switch to Purchase once there's volume. *(If Advantage+ won't let you change it off Purchase, that's fine — just know the first 2 weeks are data-gathering, judge on cost-per-ViewContent/CTR, not sales.)*
   - **Location: United States** (your shipping market). Remove other countries.
   - **Age:** 30–65+ (rug buyers skew older/homeowners).
5. Creative — two good options:
   - **Easiest & best for you: use the Catalog.** Choose **"Use a catalog" → TIZIRI Rugs.** Meta shows the actual rugs dynamically and matches the right rug to the right person. Add a primary text like: *"One-of-a-kind handwoven Moroccan rugs. Each is the only one that will ever exist — free US shipping, ships in 1–2 days."*
   - **Or manual:** pick 3–4 of your strongest, most distinctive rugs (Fadwa cubist, Hafsa, Ikram, a bold kilim), square + vertical images, captions on any video.
6. **Destination URL:** your site — e.g. `https://tizirirugs.com/` (or a specific rug page). The pixel is already there.
7. **Review → Publish.** Publish is the button that starts spending. That's your call.

## What to expect (set expectations honestly)
- $10/day at a $1,000+ AOV = a **learning budget**, not a sales machine on day one.
- Week 1–3 = gather data + build a retargeting pool. Judge on **CTR, CPC, cost-per-ViewContent** — NOT sales yet.
- **Don't edit the campaign for the first ~week** (resets Meta's learning).
- Around week 3, layer retargeting of site viewers with a scarcity message.

## Lead creative angle (works for rugs)
**Genuine one-of-one scarcity** — "When it's gone, it's gone." True + rare in this category. Lead with that + free US shipping. WELCOME50 is a weak lead on a $1,400 item — keep it secondary.

## Still-open Meta follow-up (nice-to-have, not blocking launch)
- Connect the Tiziri pixel to the "TIZIRI Rugs" catalog as its event source (Commerce Manager → catalog → Settings) for sharper dynamic retargeting. Meta often auto-links these since they're in the same business.
- CAPI Purchase tracking via a Stripe webhook (for true ROAS) — Claude can build this; dataset is already CAPI-enabled.
