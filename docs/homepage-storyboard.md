# TIZIRI — Homepage Storyboard

10 sections in sequence. Each section maps to a CSS class in `styles.css` and a block in `index.html`.

---

## Section 1 — Hero

**Class:** `.hero`  
**Type:** Full-viewport image with overlaid copy

**Layout:**
- Full `100vh` background image (min 640px)
- Gradient overlay: dark-to-transparent, bottom to top
- Headline bottom-left, large serif
- Single CTA link below headline
- Animated scroll indicator line at bottom centre

**Copy:**
- Headline: *"Woven in Morocco. Made for one home."*
- CTA: *"Explore the Collection →"*

**Image:** `rug-photos/IMG-20260530-WA0492.jpg`  
(Green handwoven rug on rooftop terrace, Atlas Mountains behind)

**Behaviour:** Nav starts transparent/white; turns frosted bone on scroll past 60px

---

## Section 2 — Manifesto

**Class:** `.manifesto`  
**Type:** Centred editorial text block

**Layout:**
- Bone background
- Max-width 580px, centred
- Serif headline + sans body copy + link
- Fade-up animation on scroll

**Copy:**
- Headline: *"Every rug is singular."*
- Body: *"Hand-knotted by Berber artisans across the Atlas region, each piece is woven once — in one place, at one moment in time. No two are the same. No design is repeated. When it finds its home, it is finished."*
- Link: *"Shop all rugs"*

---

## Section 3 — Featured Collections

**Class:** `.collections`  
**Type:** 3-column image-card grid

**Layout:**
- Label: "The Collections"
- 3:4 aspect ratio image cards
- Name + descriptor + hidden CTA (slides up on hover)
- "View all collections →" link below grid
- Staggered fade-up animation (0ms, 100ms, 200ms delay)

| Card | Collection | Image | Descriptor |
|---|---|---|---|
| 1 | Beni Ourain | `IMG-20260530-WA0277.jpg` | "The classic. Ivory wool, geometric form." |
| 2 | Azilal & Vintage | `IMG-20260530-WA0417.jpg` | "Bold colour. Tribal pattern. Alive in any room." |
| 3 | Contemporary | `IMG-20260530-WA0503.jpg` | "Moroccan craft. Modern sensibility." |

**Responsive:** collapses to 1 column on mobile

---

## Section 4 — Editorial Break

**Class:** `.editorial-break`  
**Type:** Full-bleed landscape image

**Layout:**
- 75vh height (55vh mobile)
- Single full-bleed image, no overlay
- Caption bottom-left: "Atlas Region, Morocco"

**Image:** `rug-photos/IMG-20260607-WA0146.jpg`  
(Handwoven rug laid flat in an olive grove, Atlas region)

**Purpose:** Pacing moment — slows the scroll, grounds the brand geographically

---

## Section 5 — The Story

**Class:** `.story`  
**Type:** 50/50 split layout (text + image)

**Layout:**
- Text column left, image column right (desktop)
- Image moves above text on mobile
- Serif headline, 3 body paragraphs, link
- Image: 3:4 portrait, hover zoom

**Copy:**
- Headline: *"Sourced directly. Chosen by hand."*
- Body 1: *"We travel to the Atlas Mountains, the souks of Marrakech, and the cooperatives of the Middle Atlas to find pieces that are genuinely worth owning. Not catalogued. Not manufactured to order. Found."*
- Body 2: *"Each rug in this collection has been selected in person — for the quality of its wool, the integrity of its weave, and something harder to name: the sense that it belongs somewhere specific, waiting for the right room."*
- Body 3: *"We bring fewer pieces than most. That is the point."*
- Link: *"Our story →"*

**Image:** `rug-photos/IMG-20260607-WA0056.jpg`  
(Rug displayed in front of a mosque with palm trees and blue sky)

---

## Section 6 — Trust Signals

**Class:** `.trust`  
**Type:** 3-column icon + text grid

**Layout:**
- White background (breaks from bone)
- Max-width 880px, centred
- SVG icon above each item (thin stroke, 0.5 opacity)
- Staggered fade-up (0ms, 100ms, 200ms delay)
- Collapses to 1 column on mobile

| Icon | Title | Copy |
|---|---|---|
| Shield/knot | Handwoven in Morocco | "Every rug is made by hand by Berber artisans. No machines. No shortcuts." |
| Star polygon | One of a Kind | "Each piece is singular. Once it sells, it is gone. No reorders, no reprints." |
| Circular arrow | Free Returns | "14 days to live with it. If it is not right for your space, we will collect it." |

---

## Section 7 — Video

**Class:** `.video-section`  
**Type:** Full-bleed autoplay video with overlay

**Layout:**
- 85vh height (65vh mobile)
- Muted, looped, plays-inline video
- Autoplay triggered by IntersectionObserver (fires at 25% visibility)
- Gradient overlay bottom-to-top
- Text and CTA bottom-left
- Poster image shown while video loads or if autoplay blocked

**Copy:**
- Text: *"The pile. The knot. The fringe. Things that matter."*
- CTA: *"See all rugs →"*

**Poster:** `rug-photos/IMG-20260530-WA0433.jpg`

**Video sources (in order):**
1. `rug-videos/VID-20260616-WA0008.mp4`
2. `rug-videos/VID-20260616-WA0007.mp4`
3. `rug-videos/VID-20260613-WA0079.mp4`

---

## Section 8 — Recent Arrivals

**Class:** `.arrivals`  
**Type:** 4-column product card grid

**Layout:**
- Label: "Recently Added"
- Italic serif subheadline + "View all →" link (header row)
- 3:4 portrait image cards
- "1 Available" badge top-left on each card
- Staggered fade-up (0ms, 80ms, 160ms, 240ms delay)
- 4 columns → 2 columns at ≤1024px → 2 columns at ≤768px → 1 column at ≤480px

**Headline:** *"One of a kind — when they find a home, they are gone."*

| Product | Name | Origin | Size | Image |
|---|---|---|---|---|
| 1 | Tislit | Middle Atlas | 200 × 310 cm | `IMG-20260608-WA0039.jpg` |
| 2 | Aziza | Azilal Region | 180 × 290 cm | `IMG-20260530-WA0420.jpg` |
| 3 | Nour | Middle Atlas | 250 × 380 cm | `IMG-20260607-WA0123.jpg` |
| 4 | Sama | Atlas Region | 160 × 250 cm | `IMG-20260530-WA0264.jpg` |

**Note:** Prices shown as `$0,000` placeholders — to be replaced when pricing is decided.

---

## Section 9 — Instagram Strip

**Class:** `.instagram`  
**Type:** Social proof / brand moment

**Layout:**
- Warm grey background
- Serif handle `@tiziri` large, centred
- Subline: *"Follow the collection from Morocco."*
- 6-image square grid (6 cols desktop → 3 cols mobile → 2 cols small mobile)
- 4px gap between tiles, hover zoom
- "Follow on Instagram →" link below

**Images (left to right):**
1. `IMG-20260530-WA0433.jpg`
2. `IMG-20260530-WA0417.jpg`
3. `IMG-20260607-WA0056.jpg`
4. `IMG-20260608-WA0039.jpg`
5. `IMG-20260530-WA0503.jpg`
6. `IMG-20260607-WA0146.jpg`

**Note:** Currently static images. Future: connect to Instagram Basic Display API or a static fetch.

---

## Section 10 — Newsletter + Footer

**Class:** `.newsletter` + `.footer`

### Newsletter
- Bone background, centred, max-width 500px
- Headline: *"Become an Insider"*
- Body: *"New arrivals, craft stories, and occasional dispatches from Morocco. No noise. Unsubscribe any time."*
- Form: inline email input + "Subscribe" button
- Success state: button turns sage, text becomes "Subscribed ✓"
- Backend: placeholder — connect to Klaviyo or Mailchimp

### Footer
- Dark stone background, bone text
- Logo top-left: TIZIRI (serif)
- 3-column link grid:

| Shop | Learn | Help |
|---|---|---|
| All Rugs | The Craft | Shipping & Delivery |
| Beni Ourain | How They Are Made | Returns |
| Azilal | The Regions | Care Guide |
| Boucherouite | Our Story | FAQ |
| Contemporary | | Contact |
| Large Format | | Trade Enquiries |

- Bottom bar: Instagram · Pinterest (social) / © 2026 Tiziri · Privacy Policy · Terms & Conditions

---

## Navigation (persistent)

**Class:** `.nav`  
**Behaviour:** Fixed, transparent over hero; transitions to frosted bone on scroll

**Desktop links:** Collections (mega menu) · The Craft · Contact  
**Mega menu columns:** By Style · By Size · Featured + editorial image  
**Actions:** Cart icon (with count badge) · Hamburger (mobile only)

**Mobile:** Full-screen overlay menu with large serif links
