# TIZIRI — Launch Checklist

---

## Required before launch

**Content**
- [ ] Set real prices on all 10 available product pages (currently `$0,000`)
- [ ] Confirm image-to-rug assignments are correct (wrong rug in a sale = immediate return)
- [ ] Review all 10 product descriptions — dimensions, origin, age must be accurate

**Domain & deployment**
- [ ] Acquire domain (`tiziri.com` or `tiziri.co`)
- [ ] Find-and-replace `https://tiziri.com` placeholder across all 17 HTML files, `sitemap.xml`, and `robots.txt`
- [ ] Deploy to static host (Netlify / Vercel / Cloudflare Pages)
- [ ] Configure DNS and confirm HTTPS is active (browsers warn on HTTP — kills trust instantly)

**Legal**
- [ ] Write Privacy Policy (required — newsletter form collects email)
- [ ] Write Terms & Conditions (required — you have a stated returns policy; customers will look for this before buying)
- [ ] Wire both into the footer (currently `href="#"`)

**QA**
- [ ] Test enquiry CTA on all 10 available product pages — this is your entire purchase flow
- [ ] Test contact form end-to-end on mobile and desktop
- [ ] Test mobile menu on iPhone Safari and Android Chrome — most buyers will be on mobile
- [ ] Confirm all images load and sold pages show greyscale/sold state correctly
- [ ] Wire Instagram footer links (`href="#"` → `https://instagram.com/tiziri`) — dead social links undermine credibility

---

## Recommended within 30 days of launch

- [ ] **Install analytics** — you cannot improve what you cannot measure. Plausible is simpler and needs no cookie banner; GA4 is free but needs consent if you're targeting EU customers
- [ ] **Connect newsletter form to Klaviyo or Mailchimp** — your email list is the highest-ROI sales channel for a small luxury brand; every visitor who doesn't buy today is a future buyer if you can reach them again
- [ ] **Submit sitemap to Google Search Console** — tells Google the site exists and surfaces indexing errors early
- [ ] **Validate OG tags** on 2–3 pages using Facebook's Sharing Debugger — TIZIRI is a visual brand and Instagram/WhatsApp shares are likely to drive traffic; broken previews waste every share
- [ ] **Run a Lighthouse audit** — page speed directly affects mobile conversion; flag anything scoring below 80 on Performance

---

## Future improvements

These will improve the business but have low urgency at launch.

- [ ] **Shipping & Returns stub page** — currently `href="#"` in the footer; customers check this before buying. A simple one-pager covering delivery time, cost, and the 14-day return policy is a trust signal worth adding in the first month
- [ ] **Product JSON-LD structured data** — enables Google rich results (price, availability) in search. Worth adding once the site has traction and is being indexed regularly
- [ ] **Care Guide page** — reduces buyer anxiety about owning a handwoven rug; supports upsell and repeat contact
- [ ] **`srcset` on hero and editorial images** — marginal performance gain after WebP compression; revisit if Lighthouse flags it
- [ ] **WhatsApp enquiry option** — for a direct-sourcing brand at this price point, WhatsApp is often how serious buyers want to communicate. A single link alongside the contact form could meaningfully increase enquiry rate
- [ ] **FAQ page** — handle the three questions you will hear repeatedly: authenticity, sizing advice, returns. Reduces friction at the decision stage
