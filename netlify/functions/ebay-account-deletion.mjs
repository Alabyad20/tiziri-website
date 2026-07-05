// eBay Marketplace Account Deletion notification endpoint.
// Required by eBay to activate a production API keyset.
//
// - eBay verifies the endpoint with GET ?challenge_code=... and expects
//   {"challengeResponse": sha256(challengeCode + verificationToken + endpointUrl)}
// - Actual deletion notices arrive as POSTs and only need a 200 ACK
//   (we store no eBay buyer data, so there is nothing to delete).
//
// EBAY_VERIFICATION_TOKEN (Netlify env var) must match the "verification
// token" entered in the eBay developer portal (Alerts & Notifications).
import { createHash } from "node:crypto";

const VERIFICATION_TOKEN = process.env.EBAY_VERIFICATION_TOKEN;
const ENDPOINT_URL = "https://tizirirugs.com/api/ebay-account-deletion";

export default async (req) => {
  const url = new URL(req.url);
  const challengeCode = url.searchParams.get("challenge_code");

  if (req.method === "GET" && challengeCode) {
    const challengeResponse = createHash("sha256")
      .update(challengeCode + VERIFICATION_TOKEN + ENDPOINT_URL)
      .digest("hex");
    return Response.json({ challengeResponse });
  }

  if (req.method === "POST") {
    return new Response(null, { status: 200 });
  }

  return new Response("Not found", { status: 404 });
};

export const config = { path: "/api/ebay-account-deletion" };
