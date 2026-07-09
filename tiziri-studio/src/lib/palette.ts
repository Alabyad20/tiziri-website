import { loadImage } from "./utils";

export interface Swatch {
  hex: string;
  /** Wool-and-dye vocabulary name, e.g. "unbleached ivory". */
  name: string;
}

type RGB = [number, number, number];

/**
 * Extract a small palette from an image with median-cut quantization.
 * Deterministic — the same photo always yields the same swatches.
 */
export async function extractPalette(src: string, count = 5): Promise<Swatch[]> {
  const img = await loadImage(src);
  const size = 48;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  const pixels: RGB[] = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 128) pixels.push([data[i], data[i + 1], data[i + 2]]);
  }

  // Ask for a couple of extra boxes, then dedupe — a large uniform field
  // otherwise splits into identical swatches.
  const boxes = medianCut(pixels, count + 2);
  const seen = new Set<string>();
  return boxes
    .map((box) => average(box))
    .sort((a, b) => luminance(b) - luminance(a))
    .map((rgb) => ({ hex: toHex(rgb), name: describeColor(rgb) }))
    .filter((s) => {
      if (seen.has(s.hex)) return false;
      seen.add(s.hex);
      return true;
    })
    .slice(0, count);
}

function medianCut(pixels: RGB[], target: number): RGB[][] {
  let boxes: RGB[][] = [pixels];
  while (boxes.length < target) {
    // Split the box with the widest channel range.
    let widest = -1;
    let widestIdx = 0;
    let widestChannel = 0;
    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      for (let c = 0; c < 3; c++) {
        let min = 255;
        let max = 0;
        for (const p of box) {
          if (p[c] < min) min = p[c];
          if (p[c] > max) max = p[c];
        }
        if (max - min > widest) {
          widest = max - min;
          widestIdx = i;
          widestChannel = c;
        }
      }
    });
    if (widest < 0) break;
    const box = boxes[widestIdx];
    box.sort((a, b) => a[widestChannel] - b[widestChannel]);
    const mid = Math.floor(box.length / 2);
    boxes = [
      ...boxes.slice(0, widestIdx),
      box.slice(0, mid),
      box.slice(mid),
      ...boxes.slice(widestIdx + 1),
    ];
  }
  return boxes.filter((b) => b.length > 0);
}

function average(box: RGB[]): RGB {
  const sum = box.reduce<[number, number, number]>(
    (acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]],
    [0, 0, 0],
  );
  return [
    Math.round(sum[0] / box.length),
    Math.round(sum[1] / box.length),
    Math.round(sum[2] / box.length),
  ];
}

function luminance([r, g, b]: RGB): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function toHex([r, g, b]: RGB): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

/** Name a color in the vocabulary of Moroccan wool and dye. */
function describeColor(rgb: RGB): string {
  const [r, g, b] = rgb.map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }

  if (s < 0.12) {
    if (l > 0.85) return "unbleached ivory";
    if (l > 0.65) return "undyed fleece";
    if (l > 0.45) return "stone grey";
    if (l > 0.25) return "charcoal wool";
    return "black-brown wool";
  }
  if (h < 15 || h >= 345) return l > 0.6 ? "madder rose" : "madder red";
  if (h < 40) return l > 0.6 ? "warm sand" : "terracotta";
  if (h < 65) return l > 0.6 ? "saffron" : "ochre";
  if (h < 90) return "olive dye";
  if (h < 165) return l > 0.5 ? "sage green" : "henna green";
  if (h < 200) return "faded teal";
  if (h < 260) return l > 0.5 ? "washed indigo" : "deep indigo";
  if (h < 300) return "mulberry violet";
  return "cochineal pink";
}
