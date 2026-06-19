# TIZIRI — Project Status

*Last updated: 2026-06-18 — Contact page complete. Phase 2 pages done.*

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

### Product detail pages (`rugs/`)
- 12 pages: Tislit, Aziza, Nour, Sama, Lalla, Imane, Fatima, Malika, Zara (available) + Siham, Tamurt (sold) + Amira (available)
- 56/44 two-column sticky-gallery layout (desktop), stacked on tablet/mobile
- Thumbnail image switcher with fade transition and keyboard navigation (`js/product.js`)
- Editorial description, spec table (origin / dimensions / materials / pile / age)
- "Enquire About This Piece →" CTA — mailto link pre-filled with rug name and dimensions
- Sold pages: greyscale gallery, "View Available Rugs →" CTA linking back to filtered collection
- 3-card related rugs section per page
- Homepage arrivals cards and all collections page cards wired to product pages

### JavaScript (`js/main.js`)
- Nav scroll behaviour, mobile menu toggle
- Fade-up IntersectionObserver animations
- Video autoplay on scroll entry
- Newsletter form handling

### Collection listing page (`collections/index.html`)
- 12-card catalogue grid with product data and real images
- Sticky filter bar: Style (All / Beni Ourain / Azilal / Boucherouite / Mrirt / Contemporary) + Size (All / Small / Medium / Large)
- URL hash routing — e.g. `/collections/#beni-ourain` activates the correct filter and updates the page title
- Sold state (Siham, Tamurt — greyscale + Sold badge)
- Empty state with "Clear filters" reset
- Breadcrumb nav with dynamic title/subtitle
- All homepage nav and footer Shop links wired to the collections page with correct hash anchors

### Contact page (`contact/index.html`)
- Page header: "Contact" / "We read everything."
- 2-column layout: info panel (40%) + form (60%), stacks on tablet
- Info panel: serif "Let's talk." lead, direct email, Instagram, trade &amp; wholesale note
- Form: Name + Email (side by side), Topic (select), Message (textarea)
- On submit: builds `mailto:` URL pre-filled with all fields, opens email client, shows success state
- `js/contact.js`: 30-line handler, no external dependencies
- Nav Contact link wired on all 16 pages (desktop nav, mobile menu, footer Help column, footer Trade Enquiries)

### Our Story page (`story/index.html`)
- Editorial long-form about the brand's origin and sourcing philosophy
- Page header: "Our Story" / "Where it begins."
- Opening editorial image break
- Story intro: centered serif lead + body
- Chapter 1 — "The beginning.": sourcing origin, personal connection to Morocco
- Chapter 2 — "Direct. Always.": no intermediaries, honest photography, no warehouse
- Three-image strip (3-col grid, collapses to 1 on mobile)
- Values section (dark stone bg): three italic serif statements on craft, curation, returns
- Closing CTA: "The rug was woven once…" quote + "See the Collection →"
- Footer Our Story link wired on all 16 pages

### The Craft page (`craft/index.html`)
- Editorial long-form page: three weaving traditions, four regions, video, closing CTA
- Technique 1 — Hand-Knotted (Beni Ourain · Mrirt): "The oldest method." — image left, text right
- Technique 2 — Hand-Woven (Azilal · Vintage): "Weft over warp. Colour from plants." — text left, image right
- Technique 3 — Boucherouite: "Nothing wasted." — image left, text right
- Regions section: High Atlas / Azilal / Middle Atlas / Marrakech on dark stone background
- Autoplay video section with editorial copy and "See the Collection →" CTA
- Nav wired: all 14 pages (homepage, collections, 12 rug pages) link to `craft/index.html`

### Documentation (`docs/`)
- `brand-strategy.md` — positioning, voice, colour, typography
- `development-plan.md` — phased build roadmap
- `homepage-storyboard.md` — section-by-section layout notes
- `asset-map.md` — image inventory

---

## Pending Work

### Phase 2 — Pages to Build
- ~~**Collection / listing page**~~ — **Done**
- ~~**Product detail page**~~ — **Done**
- ~~**The Craft page**~~ — **Done**
- ~~**Our Story page**~~ — **Done**
- ~~**Contact page**~~ — **Done**

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
