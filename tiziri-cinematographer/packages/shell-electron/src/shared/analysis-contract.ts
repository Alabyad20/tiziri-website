/** Shared analysis types crossing main/preload/renderer. Pure types — no Node,
 * so the renderer can import them safely. */

export interface AnalysisRequestLite {
  image_path: string;
  rug_width_cm: number;
  rug_height_cm: number;
  segmenter?: "auto" | "sam2" | "grabcut";
  with_depth?: boolean;
}

export type AnalysisEvent =
  | { type: "progress"; stage: string; pct: number }
  | { type: "log"; level: string; message: string }
  | { type: "result"; [k: string]: unknown }
  | { type: "error"; code: string; message: string; recoverable: boolean };
