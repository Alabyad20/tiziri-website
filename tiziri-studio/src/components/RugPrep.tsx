import { useEffect, useRef, useState } from "react";
import { homographyToQuad, type Quad, type Pt } from "@/lib/homography";
import { loadImage } from "@/lib/utils";
import { toast } from "@/stores/toast";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Kbd";
import { IconCheck, IconX } from "@/components/icons";

/**
 * Rug isolation: the seller drags four handles onto the rug's corners and we
 * rectify that quad into a clean, flat, background-free rug image
 * (inverse-warp with bilinear sampling). Works on photos taken at any angle.
 */
export function RugPrep({
  src,
  onDone,
  onCancel,
}: {
  src: string;
  /** Receives the processed (or original) image as a data URL. */
  onDone: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [corners, setCorners] = useState<Pt[]>([]);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragIdx = useRef<number>(-1);

  useEffect(() => {
    let cancelled = false;
    void loadImage(src)
      .then((i) => {
        if (cancelled) return;
        setImg(i);
        // Start the handles at a modest inset so they're obviously grabbable.
        setCorners([
          { x: 0.08, y: 0.08 },
          { x: 0.92, y: 0.08 },
          { x: 0.92, y: 0.92 },
          { x: 0.08, y: 0.92 },
        ]);
      })
      .catch(() => {
        if (cancelled) return;
        toast("That file isn't a readable image — try a JPG, PNG, or WebP photo", "error");
        onCancel();
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  function pointerPos(e: React.PointerEvent): Pt {
    const rect = boxRef.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  }

  async function apply() {
    if (!img) return;
    setBusy(true);
    // Let the spinner paint before the pixel loop.
    await new Promise((r) => setTimeout(r, 30));
    const quadPx = corners.map((c) => ({ x: c.x * img.width, y: c.y * img.height })) as Quad;
    onDone(rectify(img, quadPx));
  }

  const handleLabels = ["top-left", "top-right", "bottom-right", "bottom-left"];

  return (
    <div className="animate-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-[2px]">
      <div className="animate-fade-up flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-lift">
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Isolate the rug</h2>
            <p className="mt-0.5 text-[13px] text-ink-2">
              Drag the four handles onto the rug's corners — we'll straighten it and remove the
              background. Skip if the photo is already a clean, flat shot.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="rounded-lg p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink"
            aria-label="Cancel"
          >
            <IconX size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-surface-2/60 p-4">
          <div
            ref={boxRef}
            className="relative mx-auto max-h-[60vh] w-fit touch-none select-none"
            onPointerMove={(e) => {
              const idx = dragIdx.current; // capture now — the updater runs later, after batching
              if (idx < 0) return;
              const p = pointerPos(e);
              setCorners((cs) => cs.map((c, i) => (i === idx ? p : c)));
            }}
            onPointerUp={() => (dragIdx.current = -1)}
            onPointerLeave={() => (dragIdx.current = -1)}
          >
            {img && (
              <>
                <img
                  src={src}
                  alt="Uploaded rug, awaiting corner marking"
                  className="block max-h-[60vh] max-w-full rounded-lg"
                  draggable={false}
                />
                {/* Dim everything outside the marked quad */}
                <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path
                    d={`M0 0H100V100H0Z M${corners.map((c) => `${c.x * 100} ${c.y * 100}`).join(" L")} Z`}
                    fill="rgba(20,14,8,0.45)"
                    fillRule="evenodd"
                  />
                  <path
                    d={`M${corners.map((c) => `${c.x * 100} ${c.y * 100}`).join(" L")} Z`}
                    fill="none"
                    stroke="#fdf8f3"
                    strokeWidth="0.5"
                    strokeDasharray="2 1.4"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
                {corners.map((c, i) => (
                  <button
                    key={i}
                    aria-label={`Move ${handleLabels[i]} corner`}
                    className="absolute z-10 h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-full border-2 border-white bg-accent shadow-lift active:cursor-grabbing"
                    style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%` }}
                    onPointerDown={(e) => {
                      (e.target as HTMLElement).setPointerCapture(e.pointerId);
                      dragIdx.current = i;
                    }}
                  />
                ))}
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-4">
          <span className="text-xs text-ink-3">
            Tip: get the handles right on the woven corners — leave fringe outside, we redraw it.
          </span>
          <span className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => onDone(src)}>
              Use full photo
            </Button>
            <Button variant="primary" loading={busy} icon={<IconCheck size={15} />} onClick={() => void apply()}>
              Straighten & crop
              <span className="ml-1 hidden opacity-70 sm:inline">
                <Kbd>↵</Kbd>
              </span>
            </Button>
          </span>
        </div>
      </div>
    </div>
  );
}

/** Inverse projective warp: marked quad → flat rectangle, bilinear sampled. */
function rectify(img: HTMLImageElement, quad: Quad): string {
  const len = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
  let outW = Math.round((len(quad[0], quad[1]) + len(quad[3], quad[2])) / 2);
  let outH = Math.round((len(quad[0], quad[3]) + len(quad[1], quad[2])) / 2);
  const cap = 1400 / Math.max(outW, outH);
  if (cap < 1) {
    outW = Math.round(outW * cap);
    outH = Math.round(outH * cap);
  }
  outW = Math.max(64, outW);
  outH = Math.max(64, outH);

  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = img.width;
  srcCanvas.height = img.height;
  const sg = srcCanvas.getContext("2d", { willReadFrequently: true })!;
  sg.drawImage(img, 0, 0);
  const srcData = sg.getImageData(0, 0, img.width, img.height).data;
  const sw = img.width;
  const sh = img.height;

  const H = homographyToQuad(quad);
  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;
  const og = out.getContext("2d")!;
  const outImg = og.createImageData(outW, outH);
  const od = outImg.data;

  for (let y = 0; y < outH; y++) {
    const v = y / (outH - 1);
    for (let x = 0; x < outW; x++) {
      const u = x / (outW - 1);
      const s = H.map(u, v);
      const sx = Math.min(sw - 1.001, Math.max(0, s.x));
      const sy = Math.min(sh - 1.001, Math.max(0, s.y));
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const fx = sx - x0;
      const fy = sy - y0;
      const i00 = (y0 * sw + x0) * 4;
      const i10 = i00 + 4;
      const i01 = i00 + sw * 4;
      const i11 = i01 + 4;
      const oi = (y * outW + x) * 4;
      for (let ch = 0; ch < 3; ch++) {
        const top = srcData[i00 + ch] * (1 - fx) + srcData[i10 + ch] * fx;
        const bot = srcData[i01 + ch] * (1 - fx) + srcData[i11 + ch] * fx;
        od[oi + ch] = top * (1 - fy) + bot * fy;
      }
      od[oi + 3] = 255;
    }
  }
  og.putImageData(outImg, 0, 0);
  return out.toDataURL("image/jpeg", 0.92);
}
