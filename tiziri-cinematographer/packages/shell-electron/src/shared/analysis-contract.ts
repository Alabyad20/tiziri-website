/** Shared analysis types crossing main/preload/renderer. Pure types — no Node,
 * so the renderer can import them safely. */

export interface AnalysisRequestLite {
  image_path: string;
  rug_width_cm: number;
  rug_height_cm: number;
  segmenter?: "auto" | "sam2" | "grabcut";
  with_depth?: boolean;
  /** Interactive prompts: each [x_px, y_px, label], label 1=positive / 0=negative. */
  points?: number[][];
  /** Segmentation-only fast path (live preview between clicks). */
  preview_only?: boolean;
}

export type AnalysisEvent =
  | { type: "progress"; stage: string; pct: number }
  | { type: "log"; level: string; message: string }
  | { type: "result"; [k: string]: unknown }
  | { type: "error"; code: string; message: string; recoverable: boolean };
