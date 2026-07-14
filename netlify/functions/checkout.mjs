// Meta Shop off-site checkout endpoint.
//
// Meta sends buyers to /checkout?products=<slug>:<qty>,...&coupon=...
// This builds a Stripe Checkout Session containing EVERY rug in the cart
// (so a multi-rug order charges for all of them), then 302-redirects to it.
//
// Rugs are one-of-a-kind, so each unique rug is capped at quantity 1.
//
// Requires STRIPE_SECRET_KEY (Netlify env var). Until that is set, it falls
// back to the first rug's single Stripe Payment Link — so this is safe to
// deploy before the key is added (behaviour is unchanged until then).

const RUGS_URL = "https://tizirirugs.com/data/rugs.json";
const SITE = "https://tizirirugs.com";

function redirect(location) {
  return new Response(null, { status: 302, headers: { Location: location } });
}

export default async (req) => {
  const url = new URL(req.url);

  // Safe diagnostic (reveals NO secret): confirms whether the env var reached
  // the function and is the right type. Remove after setup is verified.
  if (url.searchParams.get("diag") === "1") {
    const k = process.env.STRIPE_SECRET_KEY || "";
    return Response.json({
      keyPresent: !!k,
      keyLength: k.length,
      isLiveSecret: k.trim().startsWith("sk_live_"),
      isTestSecret: k.trim().startsWith("sk_test_"),
      isPublishable: k.trim().startsWith("pk_"),
      hasStrayWhitespace: k !== k.trim(),
    });
  }

  const productsRaw = url.searchParams.get("products") || "";

  // Parse "slug:qty,slug:qty" -> unique slugs (quantity is ignored; one-of-a-kind).
  const slugs = [...new Set(
    productsRaw.split(",")
      .map((e) => (e.split(":")[0] || "").trim().toLowerCase())
      .filter(Boolean)
  )];

  if (!slugs.length) return redirect(SITE + "/collections/");

  let rugs;
  try {
    rugs = await fetch(RUGS_URL, { cache: "no-store" }).then((r) => r.json());
  } catch {
    return redirect(SITE + "/rugs/" + encodeURIComponent(slugs[0]) + ".html");
  }
  const bySlug = {};
  for (const r of rugs) if (r.slug) bySlug[r.slug.toLowerCase()] = r;

  const key = (process.env.STRIPE_SECRET_KEY || "").trim();

  // Fallback (no key yet): first rug's Payment Link — same as pre-function behaviour.
  if (!key) {
    const first = bySlug[slugs[0]];
    if (first && first.stripeLink) return redirect(first.stripeLink);
    if (first) return redirect(SITE + "/rugs/" + first.slug + ".html");
    return redirect(SITE + "/collections/");
  }

  // Build a Stripe Checkout Session with every rug in the cart.
  const form = new URLSearchParams();
  form.append("mode", "payment");
  form.append("success_url", SITE + "/?order=success");
  form.append("cancel_url", SITE + "/collections/");
  form.append("billing_address_collection", "required");
  form.append("phone_number_collection[enabled]", "true");
  form.append("shipping_address_collection[allowed_countries][0]", "US");

  let i = 0;
  for (const slug of slugs) {
    const rug = bySlug[slug];
    if (!rug || !rug.price) continue;
    const cur = (rug.currency || "USD").toLowerCase();
    form.append(`line_items[${i}][price_data][currency]`, cur);
    form.append(`line_items[${i}][price_data][unit_amount]`, String(Math.round(rug.price * 100)));
    form.append(
      `line_items[${i}][price_data][product_data][name]`,
      `${rug.name} — Handwoven Moroccan ${rug.style || "Berber"} Rug`
    );
    if (rug.images && rug.images[0]) {
      form.append(`line_items[${i}][price_data][product_data][images][0]`, rug.images[0]);
    }
    form.append(`line_items[${i}][quantity]`, "1");
    i++;
  }

  if (i === 0) return redirect(SITE + "/collections/");

  try {
    const resp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    const session = await resp.json();
    if (session && session.url) return redirect(session.url);
    // Stripe error -> fall back to the first rug's Payment Link so checkout still works.
    const first = bySlug[slugs[0]];
    return redirect((first && first.stripeLink) || SITE + "/collections/");
  } catch {
    const first = bySlug[slugs[0]];
    return redirect((first && first.stripeLink) || SITE + "/collections/");
  }
};

export const config = { path: ["/checkout", "/checkout/"] };
