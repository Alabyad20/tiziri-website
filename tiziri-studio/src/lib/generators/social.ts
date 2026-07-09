import { brandSystemPrompt, generateJson, hasApiKey } from "@/lib/ai";
import type { Rug } from "@/lib/rugs";
import { useSettings } from "@/stores/settings";

export interface SocialCopy {
  igCaption: string;
  igHashtags: string[];
  pinTitle: string;
  pinDescription: string;
  fbPost: string;
  emailSubject: string;
  emailPreheader: string;
  emailBody: string;
}

const schema = {
  type: "object",
  properties: {
    igCaption: {
      type: "string",
      description:
        "Instagram caption: a strong first line (it gets truncated in feed), 2 short paragraphs, then size + price + 'Link in bio'. No hashtags here, no emoji.",
    },
    igHashtags: {
      type: "array",
      items: { type: "string" },
      description: "18-24 Instagram hashtags without the # symbol, mixing broad (moroccanrug) and niche (beniourain) terms",
    },
    pinTitle: { type: "string", description: "Pinterest pin title, under 100 characters, search-driven" },
    pinDescription: {
      type: "string",
      description: "Pinterest description, under 500 characters, keyword-rich sentences (Pinterest is a search engine), ends with the rug's size and price",
    },
    fbPost: {
      type: "string",
      description: "Facebook page post: conversational but in brand voice, 3-5 sentences, ends with the product URL on its own line",
    },
    emailSubject: { type: "string", description: "Email subject line, under 60 characters, no clickbait" },
    emailPreheader: { type: "string", description: "Email preheader, under 90 characters, continues the subject" },
    emailBody: {
      type: "string",
      description:
        "Short newsletter feature: greeting-free, 2 paragraphs introducing the rug, a specs line, then a single call to action line with the product URL. Plain text.",
    },
  },
  required: [
    "igCaption",
    "igHashtags",
    "pinTitle",
    "pinDescription",
    "fbPost",
    "emailSubject",
    "emailPreheader",
    "emailBody",
  ],
  additionalProperties: false,
} as const;

export function productUrl(rug: Rug): string {
  const site = useSettings.getState().websiteUrl.replace(/\/$/, "");
  return `${site}/rugs/${rug.slug}/`;
}

export async function generateSocial(
  rug: Rug,
  notes: string,
): Promise<{ copy: SocialCopy; source: "ai" | "template" }> {
  if (!hasApiKey()) {
    return { copy: templateSocial(rug, notes), source: "template" };
  }
  const copy = await generateJson<SocialCopy>({
    system: brandSystemPrompt(
      "Write social and email copy for one rug across Instagram, Pinterest, Facebook and the newsletter. Each channel has its own register but one voice. Respect every length limit in the schema exactly.",
    ),
    prompt: [
      `Rug: ${rug.name} — ${rug.style} Moroccan rug`,
      `Size: ${rug.dimensions}`,
      `Material: ${rug.material} · ${rug.pile}`,
      `Age: ${rug.age}`,
      `Price: $${rug.price} USD, free worldwide shipping`,
      `Product page: ${productUrl(rug)}`,
      `Catalog description: ${rug.description}`,
      notes ? `Extra notes: ${notes}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    schema: schema as unknown as Record<string, unknown>,
  });
  copy.pinTitle = copy.pinTitle.slice(0, 100);
  copy.pinDescription = copy.pinDescription.slice(0, 500);
  copy.igHashtags = copy.igHashtags.map((h) => h.replace(/^#/, "").replace(/\s+/g, ""));
  return { copy, source: "ai" };
}

/* ------------------------------------------------------------------ */
/* Offline templates                                                    */
/* ------------------------------------------------------------------ */

const styleTags: Record<string, string[]> = {
  "Beni Ourain": ["beniourain", "beniourainrug", "ivoryrug", "woolrug"],
  Boujaad: ["boujaad", "boujaadrug", "pinkrug", "vintagerug"],
  Mrirt: ["mrirt", "mrirtrug", "luxuryrug", "woolrug"],
  Azilal: ["azilal", "azilalrug", "bohorug", "colorfulrug"],
  Kilim: ["kilim", "moroccankilim", "flatweave", "kilimrug"],
  Contemporary: ["modernrug", "contemporaryrug", "customrug", "woolrug"],
};

export function templateSocial(rug: Rug, notes: string): SocialCopy {
  const sizeShort = rug.dimensions.split("(")[0].trim();
  const url = productUrl(rug);
  const firstSentence = rug.description.split(/(?<=\.)\s/)[0] ?? rug.description;
  const vintage = rug.age.toLowerCase().startsWith("vintage");

  return {
    igCaption: [
      `${rug.name}. ${firstSentence}`,
      notes || `${vintage ? rug.age + "." : "Woven this year in the Atlas Mountains."} ${rug.material}. One of one — the piece photographed is the piece that ships.`,
      `${sizeShort} · $${rug.price} · free worldwide shipping\nLink in bio.`,
    ].join("\n\n"),
    igHashtags: [
      "moroccanrug",
      "moroccanrugs",
      "berberrug",
      "handmaderug",
      "atlasmountains",
      "amazigh",
      "handwoven",
      "rugsofinstagram",
      "interiorstyling",
      "livingroomdecor",
      "textileart",
      "slowdecor",
      "artisanmade",
      "onefone".replace("f", "of"),
      "vintagedecor",
      "neutraldecor",
      ...(styleTags[rug.style] ?? styleTags.Contemporary),
    ].slice(0, 22),
    pinTitle: `${rug.name} — ${rug.style} Moroccan Rug, ${sizeShort}`.slice(0, 100),
    pinDescription:
      `${firstSentence} A ${vintage ? "vintage" : "handmade"} ${rug.style} rug woven from ${rug.material.toLowerCase()} by Amazigh artisans in Morocco. One-of-one — no reproductions. ${sizeShort}, $${rug.price} with free worldwide shipping.`.slice(
        0,
        500,
      ),
    fbPost: [
      `Meet ${rug.name}, a ${vintage ? rug.age.toLowerCase() : "newly woven"} ${rug.style} rug from our collection.`,
      firstSentence,
      `${sizeShort}, ${rug.material.toLowerCase()}. $${rug.price} with free worldwide shipping — and like everything we sell, it's one of one.`,
      url,
    ].join("\n\n"),
    emailSubject: `${rug.name}: a ${rug.style} worth a closer look`.slice(0, 60),
    emailPreheader: `${firstSentence}`.slice(0, 90),
    emailBody: [
      `${rug.name} came ${vintage ? "to us from a private home in Morocco" : "off the loom this season"} and it photographs almost too well. ${firstSentence}`,
      `${rug.style} · ${sizeShort} · ${rug.material} · $${rug.price}, free worldwide shipping.`,
      `See ${rug.name} up close: ${url}`,
    ].join("\n\n"),
  };
}
