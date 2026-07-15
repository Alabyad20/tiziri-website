// Stripe -> Meta Conversions API (CAPI) bridge.
//
// Stripe payments happen off-site (hosted Checkout / Payment Links), so the
// browser pixel can never see them. This webhook receives the server-side
// `checkout.session.completed` event (fired for BOTH the multi-item
// /checkout function AND every per-rug Payment Link) and forwards a
// server-side "Purchase" to Meta so ad ROAS is measurable.
//
// Env vars (set in Netlify — safe to deploy before they exist; no-ops until then):
//   STRIPE_WEBHOOK_SECRET  - from Stripe Dashboard when you add this endpoint
//   META_CAPI_TOKEN        - Events Manager -> dataset -> Settings -> Conversions API -> Generate access token
//   META_PIXEL_ID          - optional; defaults to the Tiziri dataset id below
//
// Register the endpoint in Stripe (Developers -> Webhooks -> Add endpoint):
//   URL:    https://tizirirugs.com/api/stripe-webhook
//   Event:  checkout.session.completed

import crypto from "node:crypto";

const DEFAULT_PIXEL_ID = "1677465513542864"; // Tiziri dataset
const GRAPH_VERSION = "v21.0";

const ok = (msg) => new Response(msg || "ok", { status: 200 });
const bad = (msg) => new Response(msg || "bad request", { status: 400 });

const sha256 = (s) =>
  crypto.createHash("sha256").update(String(s).trim().toLowerCase()).digest("hex");

// Verify Stripe's `Stripe-Signature` header against the raw body (t=..,v1=..).
function verifyStripe(rawBody, sigHeader, secret) {
  if (!sigHeader) return false;
  const parts = Object.fromEntries(
    sigHeader.split(",").map((kv) => kv.split("=").map((x) => x && x.trim()))
  );
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${t}.${rawBody}`)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  } catch {
    return false;
  }
}

export default async (req) => {
  if (req.method !== "POST") return bad("POST only");

  const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || "").trim();
  const capiToken = (process.env.META_CAPI_TOKEN || "").trim();
  const pixelId = (process.env.META_PIXEL_ID || DEFAULT_PIXEL_ID).trim();

  // Read the raw body FIRST (needed byte-exact for signature verification).
  const raw = await req.text();

  // Not configured yet -> acknowledge so Stripe doesn't retry-storm, but do nothing.
  if (!webhookSecret || !capiToken) return ok("not configured");

  const sig = req.headers.get("stripe-signature");
  if (!verifyStripe(raw, sig, webhookSecret)) return bad("invalid signature");

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return bad("invalid json");
  }

  // Only act on a completed, paid checkout session.
  if (event.type !== "checkout.session.completed") return ok("ignored");
  const s = event.data && event.data.object;
  if (!s || s.payment_status !== "paid") return ok("not paid");

  const value = typeof s.amount_total === "number" ? s.amount_total / 100 : 0;
  const currency = (s.currency || "usd").toUpperCase();
  const email =
    (s.customer_details && s.customer_details.email) || s.customer_email || "";

  const userData = {};
  if (email) userData.em = [sha256(email)];
  if (s.customer_details && s.customer_details.phone) {
    userData.ph = [sha256(String(s.customer_details.phone).replace(/[^0-9]/g, ""))];
  }

  const payload = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor((s.created ? s.created * 1000 : Date.now()) / 1000),
        action_source: "website",
        event_id: s.id, // dedup key (matches a browser Purchase if one is ever added)
        event_source_url: "https://tizirirugs.com/",
        user_data: userData,
        custom_data: { currency, value, content_type: "product" },
      },
    ],
  };

  try {
    const resp = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, access_token: capiToken }),
      }
    );
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      console.error("Meta CAPI error", resp.status, body);
    }
  } catch (err) {
    // Never fail the webhook over a CAPI hiccup — Stripe would keep retrying.
    console.error("Meta CAPI request failed:", err);
  }

  return ok();
};

export const config = { path: "/api/stripe-webhook" };
