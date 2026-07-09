import { brandSystemPrompt, generateJson, hasApiKey } from "@/lib/ai";
import { catalog } from "@/lib/rugs";
import type { Swatch } from "@/lib/palette";

export interface NamingResult {
  name: string;
  meaning: string;
  collection: string;
  story: string;
}

const schema = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description:
        "A single women's first name, Amazigh (Tamazight) or Moroccan Arabic, NOT in the provided taken-names list. One word.",
    },
    meaning: {
      type: "string",
      description: "What the name means, one short phrase, e.g. 'Tamazight for full moon'",
    },
    collection: {
      type: "string",
      description:
        "Which weaving tradition this rug belongs to, one of: Beni Ourain, Boujaad, Mrirt, Azilal, Kilim, Contemporary",
    },
    story: {
      type: "string",
      description:
        "A 2–3 sentence product story in the brand voice: what the eye actually sees in this rug (colors, motifs, texture), grounded and concrete, no invented provenance",
    },
  },
  required: ["name", "meaning", "collection", "story"],
  additionalProperties: false,
} as const;

export async function generateNaming(opts: {
  imageDataUrl: string;
  palette: Swatch[];
  styleHint: string;
  notes: string;
}): Promise<{ result: NamingResult; source: "ai" | "template" }> {
  const taken = catalog.map((r) => r.name);
  if (!hasApiKey()) {
    return { result: templateNaming(opts.styleHint, opts.notes, opts.palette, taken), source: "template" };
  }
  const result = await generateJson<NamingResult>({
    system: brandSystemPrompt(
      "You name new rug arrivals. Every rug in the collection carries a woman's name, honoring the weavers. Look at the photo carefully and describe only what is visible.",
    ),
    prompt: [
      `Names already taken (do not reuse): ${taken.join(", ")}, Tiziri`,
      `Extracted palette: ${opts.palette.map((p) => `${p.name} (${p.hex})`).join(", ")}`,
      opts.styleHint && opts.styleHint !== "Let the photo decide"
        ? `The seller believes this is a ${opts.styleHint} rug.`
        : "Identify the weaving tradition from the photo.",
      opts.notes ? `Seller notes: ${opts.notes}` : "",
      "Name this rug and write its story.",
    ]
      .filter(Boolean)
      .join("\n"),
    imageDataUrl: opts.imageDataUrl,
    schema: schema as unknown as Record<string, unknown>,
  });
  return { result, source: "ai" };
}

/* ------------------------------------------------------------------ */
/* Offline fallback — curated Amazigh names + grounded story template. */
/* ------------------------------------------------------------------ */

const namePool: Array<{ name: string; meaning: string }> = [
  { name: "Tilelli", meaning: "Tamazight for freedom" },
  { name: "Tafsut", meaning: "Tamazight for spring" },
  { name: "Tanirt", meaning: "Tamazight for angel" },
  { name: "Tamayurt", meaning: "Tamazight for full moon" },
  { name: "Tayri", meaning: "Tamazight for love" },
  { name: "Tudert", meaning: "Tamazight for life" },
  { name: "Itto", meaning: "a traditional Amazigh woman's name" },
  { name: "Izza", meaning: "a traditional Amazigh woman's name" },
  { name: "Massa", meaning: "an ancient Amazigh name" },
  { name: "Damya", meaning: "the given name of the Kahina, the Amazigh warrior queen" },
  { name: "Kella", meaning: "a Tuareg royal name" },
  { name: "Taghbalut", meaning: "Tamazight for mountain spring" },
  { name: "Tasekkurt", meaning: "Tamazight for partridge" },
  { name: "Yelli", meaning: "Tamazight for my daughter" },
];

export function templateNaming(
  styleHint: string,
  notes: string,
  palette: Swatch[],
  taken: string[],
): NamingResult {
  const takenLower = new Set(taken.map((t) => t.toLowerCase()));
  const pick =
    namePool.find((n) => !takenLower.has(n.name.toLowerCase())) ?? namePool[0];
  const style = styleHint && styleHint !== "Let the photo decide" ? styleHint : "Contemporary";
  const colors = [...new Set(palette.map((p) => p.name))].slice(0, 3);
  const colorPhrase =
    colors.length >= 2 ? `${colors.slice(0, -1).join(", ")} and ${colors.at(-1)}` : (colors[0] ?? "undyed wool");

  return {
    name: pick.name,
    meaning: pick.meaning,
    collection: style,
    story: [
      `${pick.name} — ${pick.meaning}. The field moves between ${colorPhrase}.`,
      notes ? notes : `Woven in the ${style} tradition; the texture does as much work as the pattern.`,
      "One of one. The piece photographed is the piece you receive.",
    ].join(" "),
  };
}
