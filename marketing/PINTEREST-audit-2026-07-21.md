# Pinterest audit — 21 July 2026

Done while waiting on Standard API access. **None of this needed that approval.**

Account: **Tizirirugs** (BUSINESS) · **222 monthly views** · 13 boards · 141 organic pins + 549 catalog pins.

For scale: 222 monthly views on Pinterest against ~962 total reach on Instagram over three weeks. **Pinterest is already your better-performing channel**, and it's the one getting the least attention.

---

## 🔴 The main finding: only 11% of your pins point at your shop

Destination link across all 141 organic pins:

| Destination | Pins | |
|---|---|---|
| **instagram.com** | **34** | Buffer cross-posts — link to a Reel, not a product |
| www.etsy.com | 23 | mixed; ownership unverified |
| **(no link at all)** | **23** | dead ends |
| **tizirirugs.com** | **15** | ← the only ones that can sell |
| other Moroccan rug sellers' Etsy shops | 8 | directly promoting competitors |
| blogs / 1stdibs / misc | ~38 | inspiration repins |

**Fifteen pins out of 141 send anyone to a page where they can buy from you.**

### Root cause: Buffer isn't setting the destination link

All 34 Instagram-linked pins came from Buffer cross-posting. They have **no title and no description** either — on a search engine, a pin with no title ranks for nothing. So they're doing double damage: invisible in search, and when someone does find one, it sends them to Instagram.

**Fix going forward (do this before the next scheduled post):** in Buffer, every Pinterest post must have the rug's URL in the **destination link** field — not just in the caption text. `BUFFER-posting-queue.md` already says this; it just hasn't been happening.

### The 34 existing ones

⚠ **Pin editing is blocked on Trial access** — `PATCH /pins/{id}` returns `401 code 3: "restricted feature: pin_edit"`. So I can't bulk-fix them, and neither can any script until Standard access lands.

They **can** be edited by hand in the web UI (title, description and link are all editable — only the image is immutable). Roughly 20 seconds each, so ~12 minutes for all 34. Worth doing: each one becomes a titled, keyword-bearing pin pointing at a product page.

Alternative: delete them and let the properly-linked Buffer posts replace them over time. Cheaper, but you lose the accumulated pin age.

---

## ✅ Fixed during this audit

**Boujaad Moroccan Rugs board** had an empty description — now written (madder red / saffron / cobalt, one-of-one, ships free from USA). Board editing *is* permitted on Trial access, unlike pins.

All other content boards already had good descriptions.

---

## Still to fix (needs you — API can't)

**1. Two junk demo boards are public.** Left over from API testing:
- `Tiziri Moroccan Rugs - API Demo` (1 pin)
- `Tiziri Rugs Demo Board` (1 pin)

Delete both. They're visible to anyone browsing the profile and look like an abandoned experiment.

**2. Eight pins promote competing Moroccan rug sellers** — `themoroccobazaar`, `rugsoratlas` (×2), `articmorocco`, `coopamarizarabi`, `rugofwool`, `coastalshellstudio`, plus a 1stDibs listing. These are on a *business* profile, sending your traffic to rivals selling the same thing.

To be clear about the distinction: repinning generic interior inspiration (blogs, room shots) is **normal and good** Pinterest practice — it feeds the algorithm and fills out mood boards. Keep those. It's specifically the competitor *product listings* worth removing.

**3. The `Products` board (549 pins) has no description** and I can't add one — `PATCH` returns 500 because it's catalog-managed, owned by Pinterest's feed integration. Likely not editable in the UI either. Nothing to do; noted so nobody burns time on it.

**4. `Quick Saves` (6 pins, no description)** — Pinterest's default catch-all. Either give it a purpose or move its pins onto real boards.

---

## What to actually do next, in order

1. **Set the Buffer destination link.** Highest value, prevents recurrence, takes one minute.
2. **Delete the 2 demo boards.**
3. **Unpin the 8 competitor listings.**
4. **Pin the three split-screen videos** (Hafsa, Wahiba, Rihab) manually with proper links — Pinterest weights video heavily and you now have three. Descriptions are ready in `PINTEREST-descriptions.md`.
5. **Hand-fix the 34 Instagram pins** if you want the ~12 minutes back in SEO value.

---

## When Standard access lands

Two things must happen or nothing publishes:
- Review `scripts/pinterest/calendar.json` first — pins go out unattended.
- **There is no scheduled task** for the Pinterest publisher. Nothing auto-resumes; someone has to run `publish_due.py` or create the task.

And a note for that day: `pin_edit` unlocking would make the 34-pin cleanup a two-minute script instead of manual work. If you'd rather not hand-edit them now, waiting is defensible.


---

# CORRECTION + DEEP DIVE — the 34 Instagram-linked pins

My first pass called all 34 "Buffer cross-posts with no title or description." **That was wrong on both counts.** The real split, verified against the live Instagram account:

| | Count | What it actually is |
|---|---|---|
| **Our own Buffer cross-posts** | **17** | @tizirirugs reels, pushed by Buffer |
| **Other accounts' content, repinned** | **17** | bulk-saved on 20 June — competing rug sellers |

They also **do** have descriptions — the full Instagram caption, hashtags and all. What they lack is a **title**, which is a different and more specific problem.

---

## Problem A — Buffer sends Pinterest traffic to Instagram (17 pins)

### What Buffer is doing

When Buffer publishes one post to Instagram + Pinterest together, it creates the Pin using the media and the caption, and sets the Pin's **destination link** to the Instagram post it just created — because no other URL was supplied. Buffer has a dedicated field for this and it is being left empty.

Result, for every rug post:

```
Pinterest user sees the rug  ->  clicks  ->  lands on instagram.com
                                            -> which has no buy button
                                            -> and asks them to log in
```

### Why this is expensive

Pinterest is the one channel where the audience is *actively searching to buy* — 222 monthly views against Instagram's ~962 total reach in three weeks, with none of the audience-building work. A Pin is the closest thing you have to a free shelf in a shop.

Every click that lands on Instagram is a person who wanted the rug, was one tap from the product page, and got sent to a social feed instead. They will not go looking for tizirirugs.com afterwards.

**2 of the 17 are now dead links** — they point at Instagram posts that have since been deleted (the Hafsa duplicate removed on 21 July is one). A click gets an Instagram error page. Dead links also hurt the Pin's quality score, so Pinterest shows it less.

### The fix — in Buffer, before the next scheduled post

1. Open the queued post in Buffer.
2. With the **Pinterest** channel selected, find the Pinterest-specific fields — Buffer shows a **destination link** (sometimes labelled "Link") and a **Pin title** field, separate from the shared caption.
3. Put the rug's product URL in the destination link: `https://tizirirugs.com/rugs/<slug>.html`
4. Fill the **Pin title** (see below).
5. Repeat for every queued Pinterest post — Buffer does not backfill.

⚠ The caption already contains the URL as *text* (`tizirirugs.com/rugs/malak`). **That is not the same thing.** Text in a description is not clickable on Pinterest — only the destination-link field controls where the Pin goes.

---

## Problem B — no Pin titles (all 17)

Pinterest is a **search engine**. The Pin title is the single strongest ranking field. Every one of these Pins has `title: ""`.

So a Pin whose description opens `Malak — Handwoven Moroccan Wool Rug | One-of-One | Tiziri Rugs` still ranks for almost nothing, because that text is in the description, not the title.

Titles are ready in `PINTEREST-descriptions.md` — e.g. `Malak — Green Beni Ourain Rug 8'0" x 5'0"`. Front-load style, colour and size: that's what people type.

---

## Problem C — 17 competitor repins (NEW, worse than the Etsy ones)

All bulk-saved on **20 June**, all linking to *other* accounts' Instagram posts, and **all now dead links**. They are promoting named rivals from your business profile:

- **ATLAS LUX RUG** — "Visit ATLAS LUX RUG For A Wide Selection of Washable Rugs"
- **Anthology Textiles** — "Welcome to Anthology Textiles!"
- Several French/Moroccan sellers posting dimensions, condition and delivery terms — i.e. active listings, not inspiration

This is the same category as the 8 Etsy listings already removed, but twice the size, and I missed it on the first pass by assuming every instagram.com link was ours.

**Recommend deleting all 17.** The decisive argument isn't even that they're competitors — it's that **every one is a dead link**, which is bad for users and for Pinterest's quality signals. `DELETE /pins/{id}` works on Trial access, so this is a one-command job whenever you say.

Ids saved at `~/pin_other_ids.json`.

*(Note: generic interior inspiration repins are good practice and worth keeping — this is specifically about rival product posts with broken links.)*
