# TIZIRI — Development Plan

## Current State (as of June 2026)

The homepage is complete. It is a static HTML/CSS/JS site — no build tool, no framework, no dependencies beyond two Google Fonts. It runs directly in a browser from the file system or any static host.

### Files built
```
index.html          Homepage (10 sections)
css/styles.css      Full design system + all section styles + responsive
js/main.js          Nav scroll, mobile menu, fade-up animations, video autoplay, newsletter form
```

### What the homepage does
- Transparent nav that frosts on scroll
- Mega menu (desktop) with image preview
- Full-screen mobile overlay menu
- Hero with animated scroll line
- Manifesto text block with fade-up
- 3-column collection cards with hover CTA reveal
- Full-bleed editorial image break
- 50/50 story split layout
- 3-column trust signal row
- Autoplay video (IntersectionObserver, muted/looped)
- 4-column recent arrivals product grid
- 6-image Instagram strip
- Newsletter email capture (form validated, success state — no backend yet)
- Full footer with 3-column links

### What is not wired up yet
- All `href="#"` links — no pages behind them
- Prices on product cards (shown as `$0,000`)
- Cart icon (count stuck at 0, no cart functionality)
- Newsletter form backend (no Klaviyo/Mailchimp connection)
- Instagram grid (static images, not live feed)

---

## Phase 2 — Pages to Build

### 2a. Collection / Listing Page
- URL pattern: `/collections/beni-ourain`, `/collections/azilal`, etc.
- Grid of product cards (same card component as homepage)
- Filter bar: by style, by size, by colour (stretch goal)
- "1 Available" / "Sold" state per card
- Pagination or infinite scroll

### 2b. Product Detail Page
- URL pattern: `/rugs/tislit`, `/rugs/aziza`, etc.
- Full-size image viewer (multiple photos per rug)
- Name, origin, region, dimensions, materials, knot density
- Price + "Reserve / Buy" CTA (or "Enquire" if not using e-commerce)
- Scarcity copy: "1 available"
- Shipping + returns summary (trust signals)
- Related rugs (3-card row)

### 2c. The Craft Page
- Long-form editorial page: how rugs are made
- Regions (Atlas, Azilal, Middle Atlas, Marrakech souk)
- Techniques (hand-knotted, hand-woven, Boucherouite recycled)
- Possible video embed from available footage

### 2d. Our Story Page
- Founder/sourcing story
- Photography from location shoots (June 7/8 batches are strong candidates)

### 2e. Contact Page
- Simple form: name, email, subject, message
- Trade enquiry option
- Response time expectation

---

## Phase 3 — Commerce & Backend

### Option A: Shopify
- Migrate static HTML into a custom Shopify theme (Liquid templates)
- Product catalogue managed via Shopify admin
- Inventory, orders, payments, shipping handled natively
- Klaviyo or Shopify Email for newsletter
- **Recommended** if selling direct to consumer at scale

### Option B: Static + Enquiry Flow
- Keep static site
- "Buy" becomes "Enquire" → email or WhatsApp link
- Manual invoicing (Stripe payment link, bank transfer, PayPal)
- Google Sheets or Notion to track stock/orders
- **Recommended** for early stage / low volume before committing to Shopify

### Newsletter
- Connect newsletter form to Mailchimp or Klaviyo
- Welcome email sequence (1–2 emails): brand story + first arrivals

### Instagram Feed
- Option 1: Manual — swap in new static images periodically
- Option 2: Instagram Basic Display API (requires approved app)
- Option 3: Third-party embed (Elfsight, Behold, etc.)

---

## Phase 4 — Pre-Launch Checklist

### Performance
- [ ] Compress and resize all `rug-photos/` images (target: under 300KB each, use WebP)
- [ ] Add `srcset` for responsive images on hero and editorial break
- [ ] Self-host fonts or accept Google Fonts GDPR implications

### SEO
- [ ] Add `<meta og:*>` and Twitter card tags to all pages
- [ ] Create `sitemap.xml`
- [ ] Create `robots.txt`
- [ ] Add structured data (Product schema) to product pages
- [ ] Set canonical URLs

### Legal
- [ ] Privacy Policy page
- [ ] Terms & Conditions page
- [ ] Cookie consent if using analytics or Meta Pixel

### Analytics
- [ ] Google Analytics 4 or Plausible (privacy-first alternative)
- [ ] Meta Pixel (if running Instagram/Facebook ads)

### Domain & Hosting
- [ ] Acquire domain (tiziri.com or tiziri.co — verify availability)
- [ ] Deploy to Netlify, Vercel, or Cloudflare Pages (all free tier for static sites)
- [ ] Configure HTTPS

### QA
- [ ] Test on Chrome, Safari, Firefox, Edge
- [ ] Test on iPhone (Safari) and Android (Chrome)
- [ ] Check all images load correctly via HTTP server (not file://)
- [ ] Verify video autoplay on mobile (often restricted — poster must be good)
- [ ] Accessibility: run Lighthouse audit, fix critical issues

---

## Decisions Pending

| Decision | Options | Status |
|---|---|---|
| Commerce model | Shopify vs static + enquiry | Open |
| Pricing | Per rug, TBD | Not decided |
| Newsletter platform | Klaviyo vs Mailchimp | Not decided |
| Domain | tiziri.com / tiziri.co | Not acquired |
| Hosting | Netlify / Vercel / Cloudflare | Not decided |
| Instagram API | Static / Basic Display API / Third-party | Not decided |
| Product photography | Additional studio shots needed? | TBD |
