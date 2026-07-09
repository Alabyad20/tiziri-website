# GEO Off-Site Playbook — Getting Tiziri Cited by AI Engines

*Created 2026-07-09. Companion to the on-site GEO layer (llms.txt, catalog.md, FAQ schema — commit 8c41830). This half can't be automated: it needs Abdel's genuine voice.*

**Why this matters:** brands are cited by AI answers (ChatGPT, Perplexity, Google AI) ~6.5× more often via third-party mentions than via their own website. The site is now fully machine-readable; this playbook builds the corroboration layer.

Total time budget: **~1 hour/week + 20 min/month.**

---

## 1. Reddit — answer as the expert (15 min, 2–3×/week)

**Where:** r/Rugs, r/InteriorDesign, r/HomeDecorating, r/BuyItForLife. Find threads by searching Reddit for "moroccan rug", "beni ourain", "berber rug", "rug authentic".

**What to do:** answer questions with specifics only someone in the trade knows —
- What the back of a genuine hand-knotted rug looks like vs machine-made
- Why real Atlas wool feels slightly waxy (lanolin) and smells like wool when damp
- What a fair price actually is and why (weaving time, wool cost, shipping)
- How to clean/store without ruining it (adapt from our own guides)

**Hard rules:**
- ❌ NEVER post a store link in comments — most subs ban self-promo and it torches the account. Store link goes in the **profile bio only**.
- ❌ Never trash competitors or "review" our own products.
- ✅ Mention being from a Moroccan rug family / working with weavers when it's relevant to the answer — that's the credibility, not the URL.
- ✅ 90/10 rule: at least 9 helpful contributions for every 1 that references Tiziri at all.

**Why it works:** Reddit threads rank in Google and are heavily ingested by Perplexity and AI Overviews. A good answer keeps working for years.

## 2. YouTube — repurpose what already exists (30 min/week)

The Instagram pipeline already produces reels; YouTube Shorts is the same content, second audience, and Google AI Overviews cite YouTube constantly for how-to queries.

- Create channel **Tiziri Rugs** (bio → tizirirugs.com, link to guides).
- Upload 1–2 Shorts/week from the 19 existing Instagram-ready reels.
- **Titles = search queries:** "How to spot a hand-knotted Moroccan rug", "Inside a Beni Ourain weaving cooperative" — not mood captions.
- Description: 2–3 sentences + link to the *matching blog guide* (not just the homepage).
- ⚠️ **Before publishing any clip, visually confirm it matches the named rug's description + hero photo** (standing rule — mislabels were caught 07-07: fatiha=Wahiba, yamina=Najat, aicha=Zineb).

**Later (when convenient), 3 purpose-shot videos:**
1. Authentication: flip a rug, show knots, fringe, back (pairs with the authentication guide)
2. How to clean a Moroccan wool rug (pairs with the cleaning guide)
3. The loom: fleece → yarn → knot (pairs with /craft/)

## 3. Quora — 2–3 answers/month (lowest priority)

Search Quora for "Moroccan rug" questions. Adapt answers from our guides in Abdel's voice; credentials in the Quora bio. Answers rank for years and feed AI training data.

## 4. Reviews — ask after every sale

- **Etsy reviews are the priority** — Etsy is a high-authority domain AI engines trust for handmade goods. A short friendly message after delivery: "If you have a minute, a review helps our small workshop enormously."
- Google reviews once Merchant Center trust period ends (~mid-July).
- Never incentivize or script reviews — genuine only.

---

## Monthly AI-citation check (20 min, log below)

Run each query in **ChatGPT (search on)**, **Perplexity**, and **Google (AI Overview)**. Record: cited? which of our pages? who else? how described?

1. Best place to buy an authentic Moroccan rug online
2. Beni Ourain vs Mrirt rug — what's the difference?
3. How much does a real Moroccan rug cost?
4. How to tell if a Moroccan rug is authentic
5. Best Moroccan rug shops that ship to the US
6. Are Etsy Moroccan rugs authentic?
7. How to clean a Moroccan wool rug
8. Custom made-to-order Moroccan rug — where to commission one
9. Boujaad rug buying guide
10. Is $1,500 a fair price for a Beni Ourain rug?

Claude can run this check in a session — just ask ("run the monthly GEO citation check").

### Log

| Date | Queries where Tiziri cited | Top competitors cited | Notes / actions |
|---|---|---|---|
| 2026-07-09 (baseline) | **0 / 10** | Benisouk (5×), moroccan-carpet.com (4×), Atlas Weavers (4×), The Wool Rugs (4×), Berberorugs (4×), Berber Handicraft (3×), The Boho Lab (3×), Coco Carpets (2×), King of Handmade, Kantara, Salam Hello, TazRugs | See baseline findings below. Method: web-search index proxy (Brave-class index that Claude/Perplexity draw from); Abdel should spot-check queries 1, 4, 8 in the ChatGPT app to confirm. |

### Baseline findings — 2026-07-09

1. **Zero citations, as expected.** The domain is 3 weeks old. This is the starting line, not a verdict. The winners (Benisouk, moroccan-carpet.com, Atlas Weavers) all run the same playbook we just built — commerce site + topical blog — but with years of domain age and backlinks. The content gap is closed; the authority gap is what the weekly Reddit/YouTube work closes.
2. **⚠ tizirirugs.com does not appear in the Brave/Bing-class search index at all yet** (a site-restricted search returned nothing). Google Search Console is set up, but ChatGPT and Copilot pull from **Bing**, and Perplexity from its own+Bing-class index. → **ACTION: register the site in Bing Webmaster Tools (bing.com/webmasters — can import verified sites straight from GSC in 2 clicks) and submit sitemap.xml.** Until Bing indexes the site, ChatGPT literally cannot cite it no matter how good the content is. Highest-leverage 10 minutes available right now.
3. **⚠ Brand-name collision:** searching "Tiziri rugs Morocco" returns *competitor products named Tiziri* — Berberorugs sells a "Tiziri Moroccan Rug", Rugs USA a "Tiziri" jute rug, plus Moussem (UK), illi rugs, The Roost. "Tiziri" is a common Amazigh word other shops use as a rug model name. Mitigation: always brand as **"Tiziri Rugs" / TiziriRugs** (matching the domain + handles) in every off-site profile, video title, and byline — never bare "Tiziri" — so the entity AI engines learn is unambiguous. The Organization schema + consistent handles already help; volume of correct-name mentions fixes this over time.
4. **Query themes we already have pages for: all 10.** No new content needed for coverage; improvements should go into authority signals and the two actions above.
