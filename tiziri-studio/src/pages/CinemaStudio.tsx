import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Dropzone } from "@/components/ui/Dropzone";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import { Segmented } from "@/components/ui/Segmented";
import { Input } from "@/components/ui/Field";
import { RugPicker } from "@/components/RugPicker";
import { useCinema, type CineAspect } from "@/stores/cinema";
import {
  MOVES,
  PLATES,
  renderFrame,
  fitForScene,
  type Scene,
  type Fit,
} from "@/lib/cinema/engine";
import { cn, loadImage } from "@/lib/utils";
import { toast } from "@/stores/toast";
import { heroImage, type Rug } from "@/lib/rugs";
import { IconDownload, IconTrash } from "@/components/icons";

/** Downscale the source photo so autosave stays within the storage budget. */
async function normalizeRugImage(src: string): Promise<{ dataUrl: string; aspect: number }> {
  const img = await loadImage(src);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { dataUrl: canvas.toDataURL("image/jpeg", 0.9), aspect: img.height / img.width };
}

const ASPECTS: Array<{ value: CineAspect; label: string }> = [
  { value: "9:16", label: "Reel 9:16" },
  { value: "1:1", label: "Square 1:1" },
  { value: "16:9", label: "Wide 16:9" },
];

/** Preview / export pixel dimensions for each aspect. */
function dims(aspect: CineAspect, base: number): { w: number; h: number } {
  if (aspect === "9:16") return { w: Math.round((base * 9) / 16), h: base };
  if (aspect === "16:9") return { w: base, h: Math.round((base * 9) / 16) };
  return { w: base, h: base };
}

const EXPORT_BASE = 1920;
const PREVIEW_BASE = 900;

export function CinemaStudio() {
  const s = useCinema();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rugEl, setRugEl] = useState<HTMLImageElement | null>(null);
  const [catalogRug, setCatalogRug] = useState<Rug | null>(null);
  const [playing, setPlaying] = useState(true);
  const [t, setT] = useState(0);
  const [exporting, setExporting] = useState(false);
  const tRef = useRef(0);
  const rafRef = useRef<number>(0);

  const move = useMemo(() => MOVES.find((m) => m.id === s.moveId) ?? MOVES[0], [s.moveId]);
  const plate = useMemo(() => PLATES.find((p) => p.id === s.plateId) ?? PLATES[0], [s.plateId]);
  const preview = useMemo(() => dims(s.aspect, PREVIEW_BASE), [s.aspect]);

  // Decode the persisted photo into a drawable element.
  useEffect(() => {
    let cancelled = false;
    if (!s.rugImage) {
      setRugEl(null);
      return;
    }
    void loadImage(s.rugImage).then((img) => {
      if (!cancelled) setRugEl(img);
    });
    return () => {
      cancelled = true;
    };
  }, [s.rugImage]);

  const scene: Scene | null = useMemo(
    () =>
      rugEl
        ? {
            img: rugEl,
            aspect: s.rugAspect,
            move,
            plate,
            elevationDeg: s.elevationDeg,
            shadow: s.shadow,
          }
        : null,
    [rugEl, s.rugAspect, move, plate, s.elevationDeg, s.shadow],
  );

  // Render loop. The framing fit is computed here (after mount, when the canvas
  // ref is real) and held stable across the whole move.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    if (!scene) {
      plate.paint(ctx, canvas.width, canvas.height);
      return;
    }

    const fit: Fit = fitForScene(ctx, scene);
    let last = performance.now();
    let lastLabel = 0;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (playing) tRef.current = (tRef.current + dt / s.durationSec) % 1;
      renderFrame(ctx, scene, tRef.current, fit);
      // Throttle the React state update (scrub position + label) to ~12fps.
      if (now - lastLabel > 80) {
        lastLabel = now;
        setT(tRef.current);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [scene, playing, s.durationSec, plate]);

  /* ------------------------------- intake ------------------------------- */

  async function handleDrop(dataUrl: string, label: string) {
    const { dataUrl: normalized, aspect } = await normalizeRugImage(dataUrl);
    s.setRug(normalized, aspect, label);
    tRef.current = 0;
    setPlaying(true);
  }

  async function handleCatalogPick(rug: Rug) {
    setCatalogRug(rug);
    const src = heroImage(rug);
    if (!src) return;
    try {
      const img = await loadImage(src);
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      c.getContext("2d")!.drawImage(img, 0, 0);
      const dataUrl = c.toDataURL("image/jpeg", 0.92); // throws if CORS-tainted
      await handleDrop(dataUrl, rug.name);
    } catch {
      toast("Catalog photos aren't cross-origin enabled yet — drop the photo file instead", "error");
    }
  }

  /* ------------------------------- export ------------------------------- */

  async function handleExport() {
    if (!scene) return;
    setExporting(true);
    setPlaying(false);
    try {
      const { w, h } = dims(s.aspect, EXPORT_BASE);
      const out = document.createElement("canvas");
      out.width = w;
      out.height = h;
      const ctx = out.getContext("2d")!;
      const exFit = fitForScene(ctx, scene);

      const stream = out.captureStream(30);
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const done = new Promise<Blob>((res) => {
        recorder.onstop = () => res(new Blob(chunks, { type: "video/webm" }));
      });

      recorder.start();
      const start = performance.now();
      await new Promise<void>((resolve) => {
        const step = (now: number) => {
          const tt = Math.min((now - start) / 1000 / s.durationSec, 1);
          renderFrame(ctx, scene, tt, exFit);
          if (tt >= 1) resolve();
          else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
      recorder.stop();
      const blob = await done;

      const slug = (s.rugLabel || "rug").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tiziri-${slug}-${move.id}-${s.aspect.replace(":", "x")}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Film exported");
    } catch (e) {
      toast(`Export failed — ${(e as Error).message}`, "error");
    } finally {
      setExporting(false);
      setPlaying(true);
    }
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Cinematographer"
        description="Turn one photo into a cinematic film. Only the camera moves — every rug pixel stays the original."
      />

      <div className="grid items-start gap-4 xl:grid-cols-[1fr_320px]">
        {/* Preview */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="relative flex justify-center bg-surface-2 p-4">
              <canvas
                ref={canvasRef}
                width={preview.w}
                height={preview.h}
                className="block max-h-[70vh] w-auto rounded-lg shadow-soft"
                style={{ aspectRatio: `${preview.w} / ${preview.h}` }}
              />
              {!s.rugImage && (
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <div className="w-full max-w-sm">
                    <Dropzone
                      onImage={(d, f) =>
                        void handleDrop(
                          d,
                          f ? f.name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ") : "",
                        )
                      }
                      className="bg-surface/85 backdrop-blur-sm"
                    />
                  </div>
                </div>
              )}
            </div>
            {s.rugImage && (
              <div className="flex items-center gap-3 border-t border-line px-5 py-3">
                <Button size="sm" variant="ghost" onClick={() => setPlaying((p) => !p)}>
                  {playing ? "Pause" : "Play"}
                </Button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.001}
                  value={t}
                  onChange={(e) => {
                    setPlaying(false);
                    const v = Number(e.target.value);
                    tRef.current = v;
                    setT(v);
                  }}
                  className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-surface-3 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent"
                />
                <span className="font-mono text-[11px] tabular-nums text-ink-3">
                  {(t * s.durationSec).toFixed(1)}s
                </span>
              </div>
            )}
          </Card>

          <p className="px-1 text-[11.5px] leading-relaxed text-ink-3">
            Fidelity by construction — the rug is the original photo projected onto a moving camera,
            never regenerated. Pause any frame and it matches the source. Orbits and corner reveals
            need a 20–30s phone sweep (Tier 2), and land in a later build.
          </p>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <Card className="p-5">
            <p className="mb-2 text-[13px] font-semibold text-ink">Source rug</p>
            {s.rugImage ? (
              <div className="flex items-center gap-3">
                <img
                  src={s.rugImage}
                  alt="Source rug"
                  className="h-14 w-14 rounded-xl border border-line object-cover"
                />
                <div className="min-w-0 flex-1">
                  <Input
                    value={s.rugLabel}
                    onChange={(e) => s.setRugLabel(e.target.value)}
                    placeholder="Rug name"
                    className="h-8.5 text-[13px]"
                  />
                  <button
                    onClick={() => s.clearRug()}
                    className="mt-1.5 flex items-center gap-1 text-xs text-ink-3 hover:text-danger"
                  >
                    <IconTrash size={12} /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Dropzone
                  compact
                  onImage={(d, f) =>
                    void handleDrop(
                      d,
                      f ? f.name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ") : "",
                    )
                  }
                />
                <RugPicker
                  value={catalogRug}
                  onChange={(r) => void handleCatalogPick(r)}
                  placeholder="Or pick from the catalog"
                />
              </div>
            )}
          </Card>

          <Card className="p-5">
            <p className="mb-3 text-[13px] font-semibold text-ink">Camera move</p>
            <div className="grid grid-cols-2 gap-2">
              {MOVES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    s.set({ moveId: m.id });
                    tRef.current = 0;
                    setPlaying(true);
                  }}
                  title={m.blurb}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left transition-all",
                    s.moveId === m.id
                      ? "border-accent bg-accent-soft/60 shadow-soft"
                      : "border-line hover:border-line-strong",
                  )}
                  aria-pressed={s.moveId === m.id}
                >
                  <span
                    className={cn(
                      "block text-[12.5px] font-semibold",
                      s.moveId === m.id ? "text-accent-strong" : "text-ink",
                    )}
                  >
                    {m.name}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <p className="text-[13px] font-semibold text-ink">Look</p>
            <div>
              <p className="mb-1.5 text-[12.5px] font-medium text-ink-2">Background plate</p>
              <div className="grid grid-cols-3 gap-2">
                {PLATES.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => s.set({ plateId: p.id })}
                    className={cn(
                      "rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-all",
                      s.plateId === p.id
                        ? "border-accent text-accent-strong shadow-soft"
                        : "border-line text-ink-2 hover:border-line-strong",
                    )}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
            <Slider
              label="Camera height"
              value={s.elevationDeg}
              min={35}
              max={85}
              step={1}
              format={(v) => `${v}°`}
              onChange={(elevationDeg) => s.set({ elevationDeg })}
            />
            <Slider
              label="Duration"
              value={s.durationSec}
              min={4}
              max={16}
              step={1}
              format={(v) => `${v}s`}
              onChange={(durationSec) => s.set({ durationSec })}
            />
            <button
              onClick={() => s.set({ shadow: !s.shadow })}
              className="flex w-full items-center justify-between text-[12.5px] font-medium text-ink-2"
              role="switch"
              aria-checked={s.shadow}
            >
              Contact shadow
              <span
                className={cn(
                  "relative h-4.5 w-8 rounded-full transition-colors",
                  s.shadow ? "bg-accent" : "bg-surface-3",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-soft transition-all",
                    s.shadow ? "left-4" : "left-0.5",
                  )}
                />
              </span>
            </button>
          </Card>

          <Card className="space-y-3 p-5">
            <p className="text-[13px] font-semibold text-ink">Export</p>
            <Segmented
              options={ASPECTS}
              value={s.aspect}
              onChange={(aspect) => s.set({ aspect })}
              className="w-full"
            />
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              icon={<IconDownload size={16} />}
              loading={exporting}
              disabled={!scene}
              onClick={() => void handleExport()}
            >
              {exporting ? "Recording…" : "Export film (WebM)"}
            </Button>
            <p className="text-[11px] text-ink-3">
              Records the live move at {EXPORT_BASE}px. WebM now; H.264/4K master via Blender is the
              next-tier upgrade.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
