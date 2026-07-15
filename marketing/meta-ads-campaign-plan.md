# Meta (Facebook/Instagram) Ads — Campaign Plan
_Tiziri Rugs · drafted 2026-07-14 · objective: Sales on tizirirugs.com_

## 0. Where we are
- **Pixel:** installed in `js/main.js` (PageView + ViewContent + InitiateCheckout). Dormant until the real Pixel ID replaces `REPLACE_WITH_PIXEL_ID`.
- **Catalog:** 27 rugs in the Meta catalog (built from `google-merchant-feed.xml`, IDs = rug slug → match the pixel's `content_ids`).
- **Checkout:** multi-item Stripe Checkout Session live (`netlify/functions/checkout.mjs`) for Meta Shop; individual rug pages use per-rug Stripe Payment Links.
- **Creative on hand:** ~19 reels + feed photos (Instagram Ready folder), fresh no-yellow galleries.
- **Offer:** WELCOME50 ($50 off first order) + free US shipping + genuine one-of-one scarcity.

## 1. The honest funnel math (why budget matters)
- AOV ≈ **$1,000–$1,400** (listed rugs mostly $1,100–$1,800).
- Home-decor Meta CPC ≈ $0.70–$1.50; cold on-site CVR for a $1,000+ handmade piece ≈ **0.5–1%**.
- So **1 purchase ≈ 100–200 clicks ≈ $100–$250** of cold traffic.
- Meta needs **~50 optimization events / ad set / week** to exit "learning." You will **never** hit 50 *purchases*/week on a small budget at this AOV.
  → **Do not optimize for Purchase on day one.** Optimize for a cheaper, more frequent event (ViewContent / Landing Page Views) OR use Advantage+ which is more forgiving. Move to Purchase optimization only once volume (or CAPI, see §5) exists.

## 2. Budget recommendation
- **Recommended: $15/day (~$450/mo).** Enough conversion signal to actually learn within 3–4 weeks.
- **Practical floor: $10/day (~$300/mo).** Workable, but run it optimized for ViewContent/traffic first, not Purchase.
- **Below $10/day:** the algorithm starves on a $1,000+ product and you'll wrongly conclude "ads don't work." Avoid.
- Keep it separate from the $5/day Etsy Ads (different platform, different pool).

## 3. Campaign structure (phased)
**Phase 1 — Prospecting + data (weeks 1–3)**
- **One** Advantage+ Shopping campaign (ASC) *or* a broad-audience Advantage+ Catalog (dynamic) campaign.
- Location: United States. Let Meta's AI find the audience (broad beats hand-picked interests at this budget).
- Format: **dynamic catalog ads** — shows the actual rugs; best ROI for a catalog of visual one-of-ones.
- Creative to seed: 3–4 best-photographed / most-distinctive rugs (e.g. Fadwa cubist, Hafsa, Ikram, a bold kilim).
- Purpose: build the pixel retargeting pool + find winning creative angle. Don't judge on sales yet — judge on CTR, CPC, cost-per-ViewContent.

**Phase 2 — Add retargeting (week 3+)**
- Retarget site viewers: ViewContent 7–30 days, InitiateCheckout 1–7 days.
- Message = scarcity: "One-of-one. When it's gone, it's gone." + free US shipping. (Dynamic ads auto-show the rug they looked at.)
- Exclude past purchasers.

**Scaling:** raise budget on winners **20%/week max**; never make big jumps (resets learning).

## 4. Creative direction
- **Lead hook:** genuine scarcity — every rug is the only one that will ever exist. Rare and true in this category.
- Video: caption everything (85% watch muted); vertical for Reels/Stories, square for feed; first 3 sec = the rug filling the frame.
- Angles to test: (a) one-of-one scarcity, (b) "gallery art for your floor" (Fadwa/Picasso angle), (c) maker story / Berber artisans, (d) room transformation.
- WELCOME50: fine as a secondary line, but $50 off $1,400 is weak — lead with scarcity + free shipping, not the discount.

## 5. Purchase tracking (the one gap — follow-up)
Stripe Payment Links/Checkout redirect off-site, so the browser pixel can't see the purchase. Two options:
- **A (best): Meta CAPI via Stripe webhook** — a Netlify function catches `checkout.session.completed` / payment events and sends a server-side Purchase to Meta (dedup by event_id). Reliable, iOS-proof. Needs: Meta CAPI access token, Stripe webhook signing secret, Pixel ID. ~1 build session.
- **B (quick): Stripe post-payment redirect** — point each Payment Link's success URL to `tizirirugs.com/thank-you.html` and fire Purchase there. Simpler, less reliable (misses closed tabs, harder to pass value).
→ Recommend A once Phase 1 is running.

## 6. Immediate to-do
1. **Abdel:** get the Pixel ID (Events Manager → Data Sources → your dataset → it's the number under the name). If no pixel/dataset exists yet, create one there. Paste it to Claude.
2. **Claude:** drop the ID into `js/main.js`, bump the `?v=` cache-buster across pages, deploy, verify events fire (Meta Pixel Helper / Test Events).
3. **Abdel:** confirm IG Shopping approval status (was in review) — needed if we ever want in-app Shop checkout.
4. **Verify** the Meta catalog's item IDs equal the rug slugs (so dynamic retargeting matches the pixel).
5. Build Phase 1 campaign; revisit after ~2 weeks of data.
