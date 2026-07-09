import { brandSystemPrompt, generateJson, hasApiKey } from "@/lib/ai";

export interface ListingInputs {
  name: string;
  style: string;
  dimensions: string;
  material: string;
  pile: string;
  age: string;
  price: number;
  color: string;
  notes: string;
}

export interface ListingCopy {
  etsyTitle: string;
  ebayTitle: string;
  description: string;
  tags: string[];
  materials: string[];
  altText: string;
}

const schema = {
  type: "object",
  properties: {
    etsyTitle: {
      type: "string",
      description: "Etsy listing title, under 140 characters, keyword-rich but readable, no ALL CAPS",
    },
    ebayTitle: { type: "string", description: "eBay title, under 80 characters" },
    description: {
      type: "string",
      description:
        "Full listing description: an evocative opening paragraph, a craft/provenance paragraph, a specifications block (one spec per line, 'Label: value'), and a short care + shipping note",
    },
    tags: {
      type: "array",
      items: { type: "string" },
      description: "Exactly 13 Etsy tags, each 20 characters or fewer, lowercase, buyer search terms",
    },
    materials: { type: "array", items: { type: "string" }, description: "Materials list for the Etsy materials field" },
    altText: { type: "string", description: "Photo alt text under 125 characters, descriptive and literal" },
  },
  required: ["etsyTitle", "ebayTitle", "description", "tags", "materials", "altText"],
  additionalProperties: false,
} as const;

export async function generateListing(inputs: ListingInputs): Promise<{ copy: ListingCopy; source: "ai" | "template" }> {
  if (!hasApiKey()) {
    return { copy: templateListing(inputs), source: "template" };
  }
  const copy = await generateJson<ListingCopy>({
    system: brandSystemPrompt(
      "Write complete marketplace listing copy for one rug. The description must be plain text (no markdown syntax). Respect every length limit in the schema descriptions exactly.",
    ),
    prompt: [
      `Rug: ${inputs.name}`,
      `Style: ${inputs.style}`,
      `Size: ${inputs.dimensions}`,
      `Material: ${inputs.material}`,
      `Pile: ${inputs.pile}`,
      `Age: ${inputs.age}`,
      `Dominant color: ${inputs.color}`,
      `Price: $${inputs.price} USD, free worldwide shipping, ships from Morocco in 2–4 business days via DHL Express`,
      inputs.notes ? `Seller notes on this piece: ${inputs.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    schema: schema as unknown as Record<string, unknown>,
  });
  // Enforce hard marketplace limits even if the model drifts.
  copy.etsyTitle = copy.etsyTitle.slice(0, 140);
  copy.ebayTitle = copy.ebayTitle.slice(0, 80);
  copy.tags = copy.tags.map((t) => t.toLowerCase().slice(0, 20)).slice(0, 13);
  return { copy, source: "ai" };
}

/* ------------------------------------------------------------------ */
/* Offline template — structured, honest copy built from the inputs.   */
/* ------------------------------------------------------------------ */

const styleLore: Record<string, string> = {
  "Beni Ourain":
    "Beni Ourain rugs are woven by Amazigh women in the Middle Atlas from the undyed wool of highland sheep — thick pile, ivory grounds, and free-hand charcoal geometry.",
  Boujaad:
    "Boujaad rugs come from the Haouz plains between the Middle Atlas and the Atlantic — warm rose and terracotta fields filled with singular, improvised motifs.",
  Mrirt: "Mrirt rugs are among the densest hand-knotted pile rugs made in Morocco today — a heavy, velvet-like wool surface with restrained geometry.",
  Azilal:
    "Azilal rugs are woven in the High Atlas — a single-knot wool pile on ivory ground, with abstract free-form designs in dyed and natural wool.",
  Kilim: "Moroccan kilims are flat-woven — no pile at all. The pattern is the structure itself, woven line by line in wool.",
  Contemporary:
    "Contemporary pieces are woven today by the same cooperatives using traditional techniques, in designs drawn for modern interiors.",
};

export function templateListing(i: ListingInputs): ListingCopy {
  const sizeShort = i.dimensions.split("(")[0].trim();
  const colorCap = i.color.charAt(0).toUpperCase() + i.color.slice(1);
  const lore = styleLore[i.style] ?? styleLore.Contemporary;
  // Only a true kilim counts as flat-woven — "low pile with flat-weave
  // sections" (common on Boujaad) is still a pile rug.
  const isFlat = /no pile/i.test(i.pile) || /^flat-woven/i.test(i.pile.trim());

  return {
    etsyTitle: `${i.name} — ${i.style} Moroccan Rug, ${sizeShort}, ${colorCap} ${
      isFlat ? "Flat-Woven Wool Kilim" : "Hand-Knotted Wool"
    }, ${i.age === "Contemporary" ? "Handmade in the Atlas Mountains" : i.age}`.slice(0, 140),
    ebayTitle: `${i.name} ${i.style} Moroccan Rug ${sizeShort} ${colorCap} Wool ${isFlat ? "Kilim" : "Hand-Knotted"}`.slice(0, 80),
    description: [
      `${i.name} is a ${i.age.toLowerCase().startsWith("vintage") ? i.age.toLowerCase() : "handmade"} ${i.style} rug in ${i.color}, woven from ${i.material.toLowerCase()}. ${i.notes || ""}`.trim(),
      lore,
      [
        `Name: ${i.name}`,
        `Style: ${i.style}`,
        `Size: ${i.dimensions}`,
        `Material: ${i.material}`,
        `Pile: ${i.pile}`,
        `Age: ${i.age}`,
        `Origin: Morocco`,
      ].join("\n"),
      "Each rug is a one-of-one — the piece photographed is the piece you receive. Ships from Morocco in 2–4 business days via DHL Express, tracked, with free worldwide shipping. Spot-clean with cold water and mild soap; full care guide included.",
    ].join("\n\n"),
    tags: dedupe([
      "moroccan rug",
      `${i.style.toLowerCase()} rug`.slice(0, 20),
      isFlat ? "kilim rug" : "wool area rug",
      `${i.color} rug`.slice(0, 20),
      "berber rug",
      "handmade rug",
      "atlas mountains",
      "bohemian decor",
      sizeToTag(i.dimensions),
      i.age.toLowerCase().startsWith("vintage") ? "vintage rug" : "artisan rug",
      "living room rug",
      "wool rug",
      "amazigh weaving",
    ]).slice(0, 13),
    materials: i.material.split(",").map((m) => m.trim()),
    altText: `${i.style} Moroccan rug ${i.name} in ${i.color}, ${sizeShort}, flat view showing full pattern`.slice(0, 125),
  };
}

function sizeToTag(dimensions: string): string {
  const m = /(\d+)\s*[x×]\s*(\d+)/.exec(dimensions);
  if (!m) return "area rug";
  const [a, b] = [Number(m[1]), Number(m[2])].sort((x, y) => y - x);
  if (a >= 280) return "large area rug";
  if (a >= 200) return "medium area rug";
  if (b <= 110) return "runner rug";
  return "small area rug";
}

function dedupe(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))];
}
