# TIZIRI — Project Status

*Last updated: 2026-06-18 — Deployed to Netlify. DNS connection to tizirirugs.com pending.*

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
- 50/50 story split layout wired to Our Story page
- 3-column trust signal row (Handwoven / One of a Kind / Free Returns)
- Autoplay video section (IntersectionObserver, muted/looped)
- 4-column recent arrivals product grid
- 6-image Instagram strip (static images; live feed pending)
- Newsletter email capture with client-side validation and success state
- Full footer with 3-column link layout

### Design System (`css/styles.css`)
- Complete colour palette (bone, stone, terracotta, sky, sand, indigo, sage)
- Typography stack: Cormorant Garamond (serif) + Jost (sans)
- Responsive layout with `clamp()` gutters, 1440px max-width
- All section styles and responsive breakpoints
- Policy page layout (`.policy-page`, `.policy-section`, `.policy-table`, `.policy-list`)

### Product detail pages (`rugs/`)
- 12 pages: Tislit, Aziza, Nour, Sama, Lalla, Imane, Fatima, Malika, Zara, Amira (available) + Siham, Tamurt (sold)
- 56/44 two-column sticky-gallery layout (desktop), stacked on tablet/mobile
- Thumbnail image switcher with fade transition and keyboard navigation (`js/product.js`)
- Editorial description, spec table (origin / dimensions / materials / pile / age)
- "Enquire About This Piece →" CTA — mailto link pre-filled with rug name and dimensions
- Sold pages: greyscale gallery, "View Available Rugs →" CTA linking back to filtered collection
- 3-card related rugs section per page
- **Prices: all pages still show `$0,000` placeholder — must be set before launch**

### JavaScript
- `js/main.js` — nav scroll behaviour, mobile menu toggle, fade-up animations, video autoplay, newsletter form
- `js/product.js` — thumbnail switcher with keyboard navigation
- `js/contact.js` — contact form mailto handler with success state

### Collection listing page (`collections/index.html`)
- 12-card catalogue grid with product data and real images
- Sticky filter bar: Style + Size filters
- URL hash routing (e.g. `/collections/#beni-ourain`)
- Sold state (Siham, Tamurt — greyscale + Sold badge)
- Empty state with "Clear filters" reset

### Editorial pages
- `craft/index.html` — three weaving traditions, four regions, video, closing CTA
- `story/index.html` — brand origin, direct-sourcing philosophy, values section

### Contact page (`contact/index.html`)
- 2-column layout: info panel + form
- Form builds mailto URL and opens email client on submit
- Instagram link wired to `https://instagram.com/tiziri` (contact page only)

### Policy pages
- `shipping/index.html` — delivery timeframes, returns (14-day, free collection)
- `privacy/index.html` — GDPR-compliant, plain English, 8 sections
- `terms/index.html` — 9 sections covering sale, statutory rights, governing law

### SEO & metadata
- Open Graph + Twitter Card tags on all 22 pages
- Canonical URLs on all 22 pages
- `sitemap.xml` — 20 URLs with priorities and changefreq
- `robots.txt` — allow all, Sitemap pointer
- Domain: **tizirirugs.com** — acquired, set across all files

### Images
- 119 rug photos converted from JPEG to WebP (quality 82, max 1600px longest side)
- Average compression: ~70% file size reduction

### Documentation (`docs/`)
- `brand-strategy.md` — positioning, voice, colour, typography
- `development-plan.md` — phased build roadmap
- `homepage-storyboard.md` — section-by-section layout notes
- `asset-map.md` — image inventory
- `LAUNCH_CHECKLIST.md` — prioritised pre/post-launch task list

---

## Deployment

| Item | Status | Detail |
|---|---|---|
| Host | Netlify | Team: Tiziri (abdelkebirlabyad@gmail.com) |
| Netlify URL | Live | `https://creative-snickerdoodle-11b3de.netlify.app` |
| Site ID | — | `177a362b-cd55-45d3-a01c-6d492c61b39c` |
| Custom domain | Pending | tizirirugs.com — DNS config required |
| HTTPS | Pending | Auto-provisioned once DNS propagates |

---

## Remaining Work

### Must complete before launch
- Configure DNS: add tizirirugs.com custom domain in Netlify dashboard and update GoDaddy records
- Confirm HTTPS is active at tizirirugs.com after DNS propagates
- Review all 10 product descriptions — dimensions, origin, age must be accurate

### QA (do on live domain after DNS)
- Test enquiry CTA on all 10 available product pages
- Test contact form end-to-end on mobile and desktop
- Test mobile menu on iPhone Safari and Android Chrome
- Confirm all images load; sold pages show greyscale + sold state
- Cross-browser check: Chrome, Safari, Firefox, Edge

### Within 30 days of launch
- Install analytics (Plausible recommended — no cookie banner required)
- Connect newsletter form to Klaviyo or Mailchimp
- Submit sitemap to Google Search Console
- Validate OG tags with Facebook Sharing Debugger
- Run Lighthouse audit (target 90+ Performance, Accessibility, SEO)

### Future improvements
- Care Guide page (currently dead footer link)
- FAQ page (currently dead footer link)
- Product JSON-LD structured data
- WhatsApp enquiry option
- `srcset` on hero and editorial images

---

## Known Dead Links (as of 2026-06-18)

| Link | Location | Status |
|---|---|---|
| Cart icon | Nav — all 20 pages | No cart system (expected) |
| Care Guide | Footer — all 20 pages | Page not built |
| FAQ | Footer — all 20 pages | Page not built |
| Instagram (footer social) | Footer — all 20 pages | Needs `https://instagram.com/tiziri` |
| Pinterest (footer social) | Footer — all 20 pages | No account set up |
| Instagram tiles + Follow link | Homepage only | No live feed |

---

## Approved Decisions

| Area | Decision |
|---|---|
| Brand name | **TIZIRI** (Tamazight: moonlight) — replaces retired MAISON ATLAS |
| Domain | **tizirirugs.com** — acquired 2026-06-18 |
| Site architecture | Static HTML/CSS/JS — no framework, no build tool |
| Typefaces | Cormorant Garamond (serif) + Jost (sans), loaded via Google Fonts |
| Colour palette | Bone `#F5F0E8` base, stone `#2C2A25` text, terracotta `#B5593C` accent |
| Brand voice | Restrained, literary, short declarative sentences — no hard selling |
| Collections | Beni Ourain · Azilal & Vintage · Boucherouite · Mrirt · Contemporary |
| Size filters | Small (under 150 cm) · Medium (150–250 cm) · Large (250 cm+) |
| Trust signals | Handwoven in Morocco · One of a Kind · Free Returns (14 days) |
| Contact email | abdelkebirlabyad@gmail.com |
| Instagram handle | @tiziri |
| Images | WebP at quality 82, max 1600px — originals kept as backup |
| Commerce model | Enquiry-based (mailto CTAs) — appropriate for early stage |

---

## Open Decisions

| Decision | Options | Notes |
|---|---|---|
| Pricing | Per rug, TBD | Must be set before launch |
| Newsletter platform | Klaviyo vs Mailchimp | — |
| Hosting | **Netlify** — deployed 2026-06-18 | Site ID: 177a362b-cd55-45d3-a01c-6d492c61b39c |
| Instagram feed | Static swap / API / third-party embed | Live feed is post-launch |
| Analytics | Google Analytics 4 vs Plausible | Plausible = no cookie banner |
| Pinterest | Account setup | Remove footer link until account exists |
