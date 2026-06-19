# TIZIRI — Project Status

*Last updated: 2026-06-18*

---

## Completed Work

### Homepage (`index.html`)
- Transparent nav with frost-on-scroll effect
- Mega menu (desktop) with image preview panel
- Full-screen mobile overlay menu
- Hero section with animated scroll indicator
- Manifesto text block with fade-up animation
- 3-column collection cards with hover CTA reveal
- Full-bleed editorial image break
- 50/50 story split layout
- 3-column trust signal row (Handwoven / One of a Kind / Free Returns)
- Autoplay video section (IntersectionObserver, muted/looped)
- 4-column recent arrivals product grid
- 6-image Instagram strip
- Newsletter email capture with client-side validation and success state
- Full footer with 3-column link layout

### Design System (`css/styles.css`)
- Complete colour palette (bone, stone, terracotta, sky, sand, indigo, sage)
- Typography stack: Cormorant Garamond (serif) + Jost (sans)
- Responsive layout with `clamp()` gutters, 1440px max-width
- All section styles and responsive breakpoints

### JavaScript (`js/main.js`)
- Nav scroll behaviour, mobile menu toggle
- Fade-up IntersectionObserver animations
- Video autoplay on scroll entry
- Newsletter form handling

### Collections page scaffold (`collections/index.html`)
- Initial structure in place

### Documentation (`docs/`)
- `brand-strategy.md` — positioning, voice, colour, typography
- `development-plan.md` — phased build roadmap
- `homepage-storyboard.md` — section-by-section layout notes
- `asset-map.md` — image inventory

---

## Pending Work

### Phase 2 — Pages to Build
- **Collection / listing page** — grid, filter bar (style / size / colour), sold state
- **Product detail page** — image viewer, full spec (origin, dimensions, materials, knot density), price, scarcity copy, related rugs
- **The Craft page** — editorial long-form: techniques, regions, possible video embed
- **Our Story page** — founder/sourcing story, location photography
- **Contact page** — enquiry form, trade enquiry option

### Phase 3 — Commerce & Backend
- Wire up commerce model (see Remaining Decisions)
- Connect newsletter form to Klaviyo or Mailchimp
- Resolve Instagram grid (static swap / API / third-party embed)

### Phase 4 — Pre-Launch
- Compress and convert all `rug-photos/` to WebP (target: under 300 KB each)
- Add `srcset` for hero and editorial images
- Add Open Graph and Twitter card meta tags to all pages
- Create `sitemap.xml` and `robots.txt`
- Add Product structured data (JSON-LD) to product pages
- Write Privacy Policy and Terms & Conditions pages
- Add cookie consent if using analytics or Meta Pixel
- Set up analytics (GA4 or Plausible)
- Acquire domain and configure HTTPS
- Deploy to static host (Netlify / Vercel / Cloudflare Pages)
- Cross-browser and cross-device QA
- Lighthouse accessibility audit

### Known Gaps on Current Homepage
- All `href="#"` links — no pages behind them yet
- Product card prices show placeholder `$0,000`
- Cart icon count stuck at 0, no cart functionality
- Newsletter form has no backend connection
- Instagram strip uses static images, not a live feed

---

## Approved Decisions

| Area | Decision |
|---|---|
| Brand name | **TIZIRI** (Tamazight: moonlight) — replaces retired MAISON ATLAS |
| Site architecture | Static HTML/CSS/JS — no framework, no build tool |
| Typefaces | Cormorant Garamond (serif) + Jost (sans), loaded via Google Fonts |
| Colour palette | Bone `#F5F0E8` base, stone `#2C2A25` text, terracotta `#B5593C` accent |
| Brand voice | Restrained, literary, short declarative sentences — no hard selling |
| Collections | Beni Ourain · Azilal & Vintage · Boucherouite · Mrirt · Contemporary |
| Size filters | Small (under 150 cm) · Medium (150–250 cm) · Large (250 cm+) |
| Trust signals | Handwoven in Morocco · One of a Kind · Free Returns (14 days) |
| Contact email | abdelkebirlabyad@gmail.com |
| Instagram handle | @tiziri |

---

## Remaining Decisions

| Decision | Options | Notes |
|---|---|---|
| Commerce model | Shopify vs static + enquiry flow | Enquiry flow recommended for early stage |
| Pricing | Per rug, TBD | Not set for any piece yet |
| Newsletter platform | Klaviyo vs Mailchimp | — |
| Domain | tiziri.com vs tiziri.co | Not yet acquired — verify availability |
| Hosting | Netlify / Vercel / Cloudflare Pages | All suitable for static; all free tier |
| Instagram feed | Static swap / Basic Display API / third-party embed | — |
| Additional photography | Studio shots or further location shoots? | June 7/8 batches are strong candidates for Story page |
| Analytics | Google Analytics 4 vs Plausible | Plausible is privacy-first, simpler GDPR story |
| Pinterest | Account setup | Listed in brand docs as TBD |
