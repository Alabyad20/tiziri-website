# TIZIRI — Launch Checklist

*Last updated: 2026-06-18*

---

## Required before launch

**Content**
- [ ] Set real prices on all 10 available product pages (currently `$0,000`)
- [ ] Update prices on `collections/index.html` and homepage arrivals grid (same placeholders)
- [ ] Confirm image-to-rug assignments are correct (wrong rug in a sale = immediate return)
- [ ] Review all 10 product descriptions — dimensions, origin, age must be accurate

**Domain & deployment**
- [x] ~~Acquire domain~~ — **tizirirugs.com** purchased 2026-06-18
- [x] ~~Replace `https://tiziri.com` placeholder~~ — done across all 22 files
- [ ] Deploy to static host (Netlify / Vercel / Cloudflare Pages)
- [ ] Configure DNS and confirm HTTPS is active at tizirirugs.com

**Legal**
- [x] ~~Write Privacy Policy~~ — `privacy/index.html` complete, wired in all footers
- [x] ~~Write Terms & Conditions~~ — `terms/index.html` complete, wired in all footers
- [x] ~~Write Shipping & Returns~~ — `shipping/index.html` complete, wired in all footers

**Navigation & links**
- [ ] Wire Instagram footer social link (`href="#"` → `https://instagram.com/tiziri`) on all 20 pages
- [ ] Decide on Pinterest: create account and wire link, or remove it from all 20 footers

**QA**
- [ ] Test enquiry CTA on all 10 available product pages — this is your entire purchase flow
- [ ] Test contact form end-to-end on mobile and desktop
- [ ] Test mobile menu on iPhone Safari and Android Chrome — most buyers will be on mobile
- [ ] Confirm all images load and sold pages show greyscale/sold state correctly
- [ ] Cross-browser check: Chrome, Safari, Firefox, Edge

---

## Recommended within 30 days of launch

- [ ] **Install analytics** — Plausible (no cookie banner needed) or GA4 (needs consent for EU)
- [ ] **Connect newsletter form** to Klaviyo or Mailchimp
- [ ] **Submit sitemap** to Google Search Console (`https://tizirirugs.com/sitemap.xml`)
- [ ] **Validate OG tags** with Facebook Sharing Debugger on 2–3 key pages
- [ ] **Run Lighthouse audit** — target 90+ on Performance, Accessibility, SEO

---

## Future improvements

- [ ] **Care Guide page** — currently a dead footer link on all 20 pages; reduces buyer anxiety about owning a handwoven rug
- [ ] **FAQ page** — currently a dead footer link on all 20 pages; handles authenticity, sizing, returns questions
- [ ] **Product JSON-LD structured data** — enables Google rich results once the site has traction
- [ ] **WhatsApp enquiry option** — at this price point, many serious buyers prefer WhatsApp
- [ ] **`srcset` on hero and editorial images** — marginal gain after WebP; revisit if Lighthouse flags it
- [ ] **Instagram live feed** — replace static homepage strip with real posts
