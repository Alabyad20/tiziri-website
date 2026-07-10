import { brandSystemPrompt, generateJson, hasApiKey, AiError } from "@/lib/ai";
import { extractPalette, type Swatch } from "@/lib/palette";
import { loadImage } from "@/lib/utils";
import type { PileType } from "@/lib/rooms";

/**
 * Rug analysis = perception + recommendation.
 *
 * Perception (what is this rug?) comes from Claude vision when an API key is
 * set, from on-device palette heuristics otherwise, or from catalog facts
 * when the rug was picked from the live catalog. Recommendations (rooms,
 * furniture, exports, marketplace) are computed deterministically from the
 * perceived profile, so every suggestion carries a concrete, honest reason.
 */

export type Confidence = "high" | "medium" | "low";
export type MoroccanStyle =
  | "Beni Ourain"
  | "Boujaad"
  | "Mrirt"
  | "Azilal"
  | "Kilim"
  | "Contemporary"
  | "Unknown";

export interface RugProfile {
  style: MoroccanStyle;
  styleConfidence: Confidence;
  styleReason: string;
  pile: PileType;
  pileReason: string;
  fringe: boolean;
  fringeReason: string;
  widthCm: number; // across the room (long side)
  lengthCm: number; // into the room (short side)
  dimensionsReason: string;
}

export interface Recommendation<T = string> {
  id: T;
  label: string;
  reason: string;
}

export interface RugAnalysis {
  source: "ai" | "local" | "catalog";
  profile: RugProfile;
  palette: Swatch[];
  aspect: number; // long side / short side, ≥ 1
  orientation: "runner" | "area rug" | "square-ish";
  rooms: Recommendation[]; // 3, best first
  furniture: string;
  exports: Recommendation[]; // preset ids
  marketplace: Recommendation;
}

/* ------------------------------------------------------------------ */
/* Shared color math                                                   */
/* ------------------------------------------------------------------ */

interface PaletteStats {
  /** Fractions of image pixels (0..1). */
  ivoryShare: number;
  darkShare: number;
  warmShare: number;
  hueFamilies: number; // distinct chromatic hue buckets covering ≥3% of pixels
  meanChroma: number;
}

/**
 * Pixel-level color statistics. Classification runs on the pixels, not on
 * the display swatches — median-cut averages smear thin accent lines away.
 */
async function imageStats(src: string): Promise<PaletteStats> {
  const img = await loadImage(src);
  const size = 140;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, size, size);
  const data = g.getImageData(0, 0, size, size).data;

  const buckets = new Array(6).fill(0) as number[];
  let ivory = 0;
  let dark = 0;
  let warm = 0;
  let chromaSum = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const r = data[i] / 255;
    const gr = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const max = Math.max(r, gr, b);
    const min = Math.min(r, gr, b);
    const l = (max + min) / 2;
    const c = max - min;
    n++;
    chromaSum += c;
    if (l > 0.72 && c < 0.14) ivory++;
    if (l < 0.32) dark++;
    if (c > 0.15) {
      let h = 0;
      if (max === r) h = ((gr - b) / c) % 6;
      else if (max === gr) h = (b - r) / c + 2;
      else h = (r - gr) / c + 4;
      h = (h * 60 + 360) % 360;
      buckets[Math.floor(h / 60)]++;
      if (h < 60 || h > 330) warm++;
    }
  }
  n = Math.max(1, n);
  return {
    ivoryShare: ivory / n,
    darkShare: dark / n,
    warmShare: warm / n,
    hueFamilies: buckets.filter((count) => count / n >= 0.03).length,
    meanChroma: chromaSum / n,
  };
}

/* ------------------------------------------------------------------ */
/* Perception — on-device heuristics                                   */
/* ------------------------------------------------------------------ */

/** Typical short-side, cm, per weaving tradition. */
const TYPICAL_SHORT: Record<MoroccanStyle, number> = {
  "Beni Ourain": 200,
  Boujaad: 150,
  Mrirt: 200,
  Azilal: 150,
  Kilim: 160,
  Contemporary: 180,
  Unknown: 160,
};

function perceiveLocally(st: PaletteStats, aspect: number): RugProfile {
  let style: MoroccanStyle = "Unknown";
  let styleConfidence: Confidence = "low";
  let styleReason = "";
  let pile: PileType = "low";
  let pileReason = "";
  let fringe = false;
  let fringeReason = "";

  if (st.ivoryShare > 0.45 && st.darkShare > 0.03 && st.hueFamilies <= 1) {
    style = "Beni Ourain";
    styleConfidence = "medium";
    styleReason = "Ivory ground with dark geometry — the classic Beni Ourain signature (judged from color alone).";
    pile = "high";
    pileReason = "Beni Ourain rugs are woven with a thick, high wool pile.";
    fringe = true;
    fringeReason = "Beni Ourain ends are traditionally finished with knotted warp fringe.";
  } else if (st.warmShare > 0.3 && st.hueFamilies <= 2) {
    style = "Boujaad";
    styleConfidence = "medium";
    styleReason = "A warm rose-terracotta field points to the Haouz plains — Boujaad territory (from color alone).";
    pile = "low";
    pileReason = "Boujaad pile is typically low, often with flat-woven passages.";
    fringe = true;
    fringeReason = "Boujaad ends usually carry fringe.";
  } else if (st.hueFamilies >= 3) {
    style = "Azilal";
    styleConfidence = "low";
    styleReason = "Many saturated hue families read as Azilal free-form work — low confidence from color alone.";
    pile = "low";
    pileReason = "Azilal rugs use a single-knot, lower pile.";
    fringe = true;
    fringeReason = "Azilal ends usually carry fringe.";
  } else if (st.meanChroma > 0.16) {
    style = "Kilim";
    styleConfidence = "low";
    styleReason = "Few flat, saturated colors suggest a flat-woven kilim — low confidence from color alone.";
    pile = "flat";
    pileReason = "Kilims are flat-woven; the pattern is the structure.";
    fringe = false;
    fringeReason = "Many Moroccan kilims are finished without fringe.";
  } else {
    style = "Contemporary";
    styleConfidence = "low";
    styleReason = "A restrained palette without a clear traditional signature — treating it as contemporary.";
    pile = "low";
    pileReason = "Defaulting to low pile; switch it if the wool is thicker.";
    fringe = false;
    fringeReason = "No strong signal for fringe; toggle it on if the ends are knotted.";
  }

  const shortSide = TYPICAL_SHORT[style];
  const longSide = Math.min(420, Math.round((shortSide * aspect) / 10) * 10);
  return {
    style,
    styleConfidence,
    styleReason,
    pile,
    pileReason,
    fringe,
    fringeReason,
    widthCm: longSide,
    lengthCm: shortSide,
    dimensionsReason: `Typical ${style} format scaled to the photo's ${aspect.toFixed(2)}:1 shape — enter the printed size if you have it.`,
  };
}

/* ------------------------------------------------------------------ */
/* Perception — Claude vision                                          */
/* ------------------------------------------------------------------ */

const perceptionSchema = {
  type: "object",
  properties: {
    style: {
      type: "string",
      enum: ["Beni Ourain", "Boujaad", "Mrirt", "Azilal", "Kilim", "Contemporary", "Unknown"],
      description: "Weaving tradition. Use Unknown unless the visual evidence is real.",
    },
    styleConfidence: { type: "string", enum: ["high", "medium", "low"] },
    styleReason: { type: "string", description: "One sentence naming the visible evidence, under 120 characters" },
    pile: { type: "string", enum: ["flat", "low", "high"], description: "Construction visible in the photo" },
    pileReason: { type: "string", description: "One sentence, under 100 characters" },
    fringePresent: { type: "boolean", description: "Whether knotted warp fringe is visible at the rug ends" },
    fringeReason: { type: "string", description: "One sentence, under 100 characters" },
    approxWidthCm: {
      type: "integer",
      description: "Approximate LONG side in cm, judged from motif scale, knot size, and typical formats",
    },
    approxLengthCm: { type: "integer", description: "Approximate SHORT side in cm" },
    dimensionsReason: { type: "string", description: "One sentence, under 110 characters" },
  },
  required: [
    "style",
    "styleConfidence",
    "styleReason",
    "pile",
    "pileReason",
    "fringePresent",
    "fringeReason",
    "approxWidthCm",
    "approxLengthCm",
    "dimensionsReason",
  ],
  additionalProperties: false,
} as const;

interface PerceptionJson {
  style: MoroccanStyle;
  styleConfidence: Confidence;
  styleReason: string;
  pile: PileType;
  pileReason: string;
  fringePresent: boolean;
  fringeReason: string;
  approxWidthCm: number;
  approxLengthCm: number;
  dimensionsReason: string;
}

async function perceiveWithClaude(imageDataUrl: string, palette: Swatch[], aspect: number): Promise<RugProfile> {
  const p = await generateJson<PerceptionJson>({
    system: brandSystemPrompt(
      "You identify Moroccan rugs from photos for staging and listing. Judge only from visible evidence. Be honest about confidence — a wrong style claim is worse than Unknown.",
    ),
    prompt: [
      "Analyze this rug photo (already cropped flat and background-free).",
      `Extracted palette: ${palette.map((s) => `${s.name} ${s.hex}`).join(", ")}`,
      `The photo's long:short ratio is ${aspect.toFixed(2)}:1 — your size estimate must match it.`,
    ].join("\n"),
    imageDataUrl,
    schema: perceptionSchema as unknown as Record<string, unknown>,
    maxTokens: 1200,
  });
  const long = Math.max(p.approxWidthCm, p.approxLengthCm);
  const short = Math.min(p.approxWidthCm, p.approxLengthCm);
  return {
    style: p.style,
    styleConfidence: p.styleConfidence,
    styleReason: p.styleReason,
    pile: p.pile,
    pileReason: p.pileReason,
    fringe: p.fringePresent,
    fringeReason: p.fringeReason,
    widthCm: Math.min(500, Math.max(60, long)),
    lengthCm: Math.min(400, Math.max(50, short)),
    dimensionsReason: p.dimensionsReason,
  };
}

/* ------------------------------------------------------------------ */
/* Recommendations — deterministic, explained                          */
/* ------------------------------------------------------------------ */

const ROOM_LABELS: Record<string, string> = {
  living: "Living Room",
  bedroom: "Bedroom",
  reading: "Reading Corner",
  hallway: "Entry Hall",
  loft: "Minimal Loft",
  atelier: "Atelier",
};

const FURNITURE: Record<string, string> = {
  living: "low oak pieces and undyed linen upholstery — let the rug carry the color",
  bedroom: "a low platform bed and unbleached linens; keep walls bare",
  reading: "aged leather and dark wood; the rug warms the corner",
  hallway: "a slim console and one ceramic piece — nothing competing at floor level",
  loft: "spare black-framed furniture and one large plant; negative space is the point",
  atelier: "walnut and raw clay tones; moodier light flatters deep color",
};

function recommendRooms(profile: RugProfile, aspect: number, st: PaletteStats): Recommendation[] {
  let ids: string[];
  let reasons: string[];

  if (aspect >= 2.3) {
    ids = ["hallway", "loft", "living"];
    reasons = [
      `A ${aspect.toFixed(1)}:1 runner is built for a hallway's long sightline.`,
      "The loft's open floor shows a runner's full length without crowding.",
      "Works beside a sofa as a long accent piece.",
    ];
  } else {
    switch (profile.style) {
      case "Beni Ourain":
        ids = ["living", "bedroom", "loft"];
        reasons = [
          "Ivory wool against oak and linen is the classic Beni Ourain setting buyers search for.",
          "High pile underfoot sells best in bedroom scenes.",
          "Minimal rooms let the freehand geometry breathe.",
        ];
        break;
      case "Boujaad":
        ids = ["atelier", "living", "reading"];
        reasons = [
          "Clay walls echo the rose-terracotta field — the palette locks together.",
          "Warm pinks lift a neutral living room without clashing.",
          "Boujaad color glows in low amber light.",
        ];
        break;
      case "Azilal":
        ids = ["loft", "living", "bedroom"];
        reasons = [
          "A spare room gives busy free-form color the quiet backdrop it needs.",
          "Reads as the single statement piece in a neutral living room.",
          "Softens to a warm accent in a pale bedroom.",
        ];
        break;
      case "Mrirt":
        ids = ["living", "reading", "bedroom"];
        reasons = [
          "Dense velvet-like pile reads as luxury in a formal living room.",
          "Deep pile suits a slow corner with leather and books.",
          "Underfoot softness is the selling point in a bedroom.",
        ];
        break;
      case "Kilim":
        ids = ["loft", "hallway", "living"];
        reasons = [
          "Graphic flat-weave pattern works like wall art on a pale minimal floor.",
          "Thin profile handles doorways and hall traffic.",
          "Anchors a seating area without adding bulk.",
        ];
        break;
      default:
        ids = st.warmShare > 0.25 ? ["living", "atelier", "reading"] : ["loft", "bedroom", "living"];
        reasons =
          st.warmShare > 0.25
            ? [
                "Warm tones sit naturally with oak and linen.",
                "Clay walls deepen an already-warm palette.",
                "Amber light flatters warm wool.",
              ]
            : [
                "A cool, restrained palette suits the loft's pale minimalism.",
                "Quiet colors read serene in a bedroom.",
                "Neutral enough to ground a living room.",
              ];
    }
  }
  return ids.map((id, i) => ({ id, label: ROOM_LABELS[id], reason: reasons[i] }));
}

function recommendExports(profile: RugProfile, st: PaletteStats, aspect: number): Recommendation[] {
  const recs: Recommendation[] = [
    { id: "etsy", label: "Etsy", reason: "Primary marketplace for handmade rugs — always export the 4:3 listing shot." },
  ];
  const areaM2 = (profile.widthCm * profile.lengthCm) / 10_000;
  if (st.ivoryShare > 0.35 || profile.style === "Beni Ourain" || profile.style === "Mrirt") {
    recs.push({
      id: "pinterest",
      label: "Pinterest",
      reason: "Neutral interiors dominate Pinterest décor searches — tall pins earn saves for months.",
    });
  }
  if (st.meanChroma > 0.12 || profile.style === "Boujaad" || profile.style === "Azilal") {
    recs.push({
      id: "instagram",
      label: "Instagram",
      reason: "Saturated color stops the scroll — the 4:5 crop fills the feed.",
    });
  }
  if (areaM2 >= 4.5) {
    recs.push({
      id: "facebook",
      label: "Marketplace",
      reason: `At ~${areaM2.toFixed(1)} m² this rug is heavy to ship — local Marketplace buyers matter.`,
    });
  }
  if (recs.length === 1) {
    recs.push({
      id: aspect >= 2.3 ? "pinterest" : "instagram",
      label: aspect >= 2.3 ? "Pinterest" : "Instagram",
      reason: aspect >= 2.3 ? "Tall pin format suits a runner's proportions." : "A second social-ready crop costs nothing.",
    });
  }
  return recs.slice(0, 4);
}

function recommendMarketplace(profile: RugProfile, st: PaletteStats): Recommendation {
  if (profile.style === "Beni Ourain" || profile.style === "Mrirt") {
    return {
      id: "Etsy",
      label: "Etsy",
      reason: `"${profile.style}" is a high-volume Etsy search — buyers arrive already knowing the name.`,
    };
  }
  if (st.meanChroma > 0.14 || profile.style === "Boujaad" || profile.style === "Azilal") {
    return {
      id: "Instagram",
      label: "Instagram",
      reason: "Bold color performs discovery-first — lead here, then convert to the listing.",
    };
  }
  if ((profile.widthCm * profile.lengthCm) / 10_000 >= 4.5) {
    return {
      id: "Facebook",
      label: "Facebook Marketplace",
      reason: "Oversized rugs move best locally, where shipping cost isn't the objection.",
    };
  }
  return {
    id: "Pinterest",
    label: "Pinterest",
    reason: "Quiet, neutral pieces compound on Pinterest — décor searches keep resurfacing them.",
  };
}

/* ------------------------------------------------------------------ */
/* Entry point                                                          */
/* ------------------------------------------------------------------ */

export interface KnownFacts {
  style?: MoroccanStyle;
  pile?: PileType;
  fringe?: boolean;
  widthCm?: number;
  lengthCm?: number;
}

export async function analyzeRug(
  imageDataUrl: string,
  imageAspectHoverW: number, // prepared image height / width
  known?: KnownFacts,
  forceLocal = false,
): Promise<RugAnalysis> {
  const [palette, st] = await Promise.all([extractPalette(imageDataUrl, 5), imageStats(imageDataUrl)]);
  const aspect = Math.max(imageAspectHoverW, 1 / imageAspectHoverW);

  let profile: RugProfile;
  let source: RugAnalysis["source"];

  if (forceLocal && !known?.style) {
    source = "local";
    profile = perceiveLocally(st, aspect);
  } else if (known?.style) {
    // Catalog rugs: the facts are printed on the listing — no guessing.
    source = "catalog";
    const local = perceiveLocally(st, aspect);
    profile = {
      style: known.style,
      styleConfidence: "high",
      styleReason: "From the catalog listing — not a guess.",
      pile: known.pile ?? local.pile,
      pileReason: "From the catalog listing.",
      fringe: known.fringe ?? local.fringe,
      fringeReason: "Preset by weaving tradition.",
      widthCm: known.widthCm ?? local.widthCm,
      lengthCm: known.lengthCm ?? local.lengthCm,
      dimensionsReason: "The size printed on the listing.",
    };
  } else if (hasApiKey()) {
    source = "ai";
    try {
      profile = await perceiveWithClaude(imageDataUrl, palette, aspect);
    } catch (e) {
      if (e instanceof AiError && (e.kind === "auth" || e.kind === "no-key")) throw e;
      // Degraded network / rate limits: fall back rather than block the flow.
      source = "local";
      profile = perceiveLocally(st, aspect);
    }
  } else {
    source = "local";
    profile = perceiveLocally(st, aspect);
  }

  const rooms = recommendRooms(profile, aspect, st);
  return {
    source,
    profile,
    palette,
    aspect,
    orientation: aspect >= 2.3 ? "runner" : aspect <= 1.25 ? "square-ish" : "area rug",
    rooms,
    furniture: FURNITURE[rooms[0].id],
    exports: recommendExports(profile, st, aspect),
    marketplace: recommendMarketplace(profile, st),
  };
}
