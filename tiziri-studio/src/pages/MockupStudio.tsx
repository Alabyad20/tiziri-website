import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Dropzone } from "@/components/ui/Dropzone";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import { Input, Field, Select } from "@/components/ui/Field";
import { RugPicker } from "@/components/RugPicker";
import { RugPrep } from "@/components/RugPrep";
import { MockupAiPanel } from "@/components/MockupAiPanel";
import { analyzeRug, type KnownFacts, type MoroccanStyle } from "@/lib/rugAnalysis";
import { AiError } from "@/lib/ai";
import {
  renderMockup,
  listRooms,
  resolveScene,
  sceneMapper,
  sceneBounds,
  preloadScene,
  type PileType,
} from "@/lib/rooms";
import { useMockup } from "@/stores/mockup";
import { useTemplates } from "@/stores/templates";
import { useUndoRedo } from "@/lib/useUndoRedo";
import { useActivity } from "@/stores/activity";
import { toast } from "@/stores/toast";
import { cn, loadImage, uid } from "@/lib/utils";
import { downloadDataUrl } from "@/platform";
import type { Rug } from "@/lib/rugs";
import { heroImage } from "@/lib/rugs";
import {
  IconDownload,
  IconRedo,
  IconRefresh,
  IconTrash,
  IconUndo,
} from "@/components/icons";

/** Downscale the prepared photo so autosave stays within localStorage budget. */
async function normalizeRugImage(src: string): Promise<{ dataUrl: string; aspect: number }> {
  const img = await loadImage(src);
  const maxSide = 1400;
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { dataUrl: canvas.toDataURL("image/jpeg", 0.85), aspect: img.height / img.width };
}

/** "300 x 200 cm" / "180 × 290 cm" → meters, long side across the room. */
function parseDims(dimensions: string): { widthM: number; lengthM: number } | null {
  const m = /(\d{2,3}(?:\.\d+)?)\s*[x×]\s*(\d{2,3}(?:\.\d+)?)/.exec(dimensions);
  if (!m) return null;
  const a = Number(m[1]) / 100;
  const b = Number(m[2]) / 100;
  return { widthM: Math.max(a, b), lengthM: Math.min(a, b) };
}

function guessPile(pileText: string, style: string): PileType {
  if (/no pile|^flat/i.test(pileText.trim())) return "flat";
  if (/high|thick|dense|plush|velvet/i.test(pileText) || style === "Mrirt") return "high";
  return "low";
}

const FRINGED_STYLES = new Set(["Beni Ourain", "Boujaad", "Azilal", "Mrirt"]);

/** AI recommendations name illustrated rooms; prefer their photo equivalents. */
const PHOTO_FOR: Record<string, string> = {
  living: "lux-neutral",
  bedroom: "calm-bedroom",
  loft: "organic-modern",
  atelier: "warm-minimal",
  reading: "warm-minimal",
};
const ILLUSTRATED_FOR: Record<string, string> = {
  "lux-neutral": "living",
  "calm-bedroom": "bedroom",
  "organic-modern": "loft",
  "warm-minimal": "atelier",
};

const PREVIEW_W = 1440;
const PREVIEW_H = 960;
const MASTER_W = 3400;
const MASTER_H = 2267;

interface ExportPreset {
  id: string;
  label: string;
  sub: string;
  w: number;
  h: number;
  mime: string;
  ext: string;
  quality?: number;
}

const EXPORT_PRESETS: ExportPreset[] = [
  { id: "etsy", label: "Etsy", sub: "3000 × 2250", w: 3000, h: 2250, mime: "image/jpeg", ext: "jpg", quality: 0.92 },
  { id: "instagram", label: "Instagram", sub: "1080 × 1350", w: 1080, h: 1350, mime: "image/jpeg", ext: "jpg", quality: 0.92 },
  { id: "pinterest", label: "Pinterest", sub: "1000 × 1500", w: 1000, h: 1500, mime: "image/jpeg", ext: "jpg", quality: 0.92 },
  { id: "facebook", label: "Marketplace", sub: "1200 × 1200", w: 1200, h: 1200, mime: "image/jpeg", ext: "jpg", quality: 0.9 },
  { id: "scene", label: "Full scene", sub: "2400 × 1600 PNG", w: 2400, h: 1600, mime: "image/png", ext: "png" },
];

function SectionTitle({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-2.5 px-5 pt-4 pb-2">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent-strong">
        {n}
      </span>
      <span className="text-[13px] font-semibold text-ink">{title}</span>
    </div>
  );
}

const clamp = (v: number, [lo, hi]: [number, number]) => Math.min(hi, Math.max(lo, v));

export function MockupStudio() {
  const s = useMockup();
  const customs = useTemplates((t) => t.custom);
  const logProject = useActivity((a) => a.logProject);
  const logExport = useActivity((a) => a.logExport);
  const { undo, redo, canUndo, canRedo } = useUndoRedo(useMockup);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rugEl, setRugEl] = useState<HTMLImageElement | null>(null);
  const [exporting, setExporting] = useState(false);
  const [catalogRug, setCatalogRug] = useState<Rug | null>(null);
  const [rawImage, setRawImage] = useState<string | null>(null); // session-only, for re-cropping
  const [prepOpen, setPrepOpen] = useState(false);
  const [prepLabel, setPrepLabel] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const selectedPresets = s.exportPresets;
  const dragRef = useRef<{ grabX: number; grabD: number; preX: number; preD: number } | null>(null);
  const [hovering, setHovering] = useState(false);

  const roomOptions = useMemo(() => listRooms(customs), [customs]);
  const bounds = useMemo(() => sceneBounds(s.sceneId, customs), [s.sceneId, customs]);
  const mapper = useMemo(
    () => sceneMapper(s.sceneId, customs, PREVIEW_W, PREVIEW_H),
    [s.sceneId, customs],
  );

  // Illustrated demo thumbnails render once (photo rooms use the photo itself).
  const [illusThumbs, setIllusThumbs] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const out: Record<string, string> = {};
      for (const room of listRooms().filter((r) => r.kind === "illustrated")) {
        const c = document.createElement("canvas");
        c.width = 300;
        c.height = 200;
        await renderMockup(c, {
          sceneId: room.id,
          rug: null,
          placement: { widthM: 0, lengthM: 0, offsetX: 0, depth: 0, rotation: 0 },
          style: { pile: "low", fringe: false },
        });
        out[room.id] = c.toDataURL("image/jpeg", 0.85);
      }
      if (!cancelled) setIllusThumbs(out);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Decode the persisted rug image into a drawable element.
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

  const placement = useMemo(
    () => ({
      widthM: s.widthM,
      lengthM: s.lengthM,
      offsetX: s.offsetX,
      depth: s.depth,
      rotation: s.rotation,
    }),
    [s.widthM, s.lengthM, s.offsetX, s.depth, s.rotation],
  );
  const style = useMemo(() => ({ pile: s.pile, fringe: s.fringe }), [s.pile, s.fringe]);

  // Live preview render (async: photo scenes decode their assets once).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    void (async () => {
      await preloadScene(s.sceneId, customs);
      if (cancelled) return;
      await renderMockup(canvas, {
        sceneId: s.sceneId,
        rug: rugEl ? { img: rugEl, w: rugEl.width, h: rugEl.height } : null,
        placement,
        style,
        customTemplates: customs,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [s.sceneId, rugEl, placement, style, customs]);

  // Entering a scene: keep the rug inside its placement bounds and size range.
  useEffect(() => {
    const st = useMockup.getState();
    const t = useMockup.temporal.getState();
    const b = sceneBounds(st.sceneId, customs);
    t.pause();
    st.setPlacement({ offsetX: clamp(st.offsetX, b.x), depth: clamp(st.depth, b.d) });
    const ref = resolveScene(st.sceneId, customs);
    if (ref.kind === "photo") {
      const rs = ref.template.rugSize;
      st.setPlacement({
        widthM: clamp(st.widthM, [rs.minW, rs.maxW]),
        lengthM: clamp(st.lengthM, [rs.minL, rs.maxL]),
      });
    }
    t.resume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.sceneId, customs]);

  /* ---------------- AI analysis ---------------- */

  async function runAnalysis(imageDataUrl: string, aspect: number, known?: KnownFacts, forceLocal = false) {
    setAnalyzing(true);
    try {
      let analysis;
      try {
        analysis = await analyzeRug(imageDataUrl, aspect, known, forceLocal);
      } catch (e) {
        if (e instanceof AiError) {
          toast(`${e.message} — analyzed on-device instead`, "error");
          analysis = await analyzeRug(imageDataUrl, aspect, known, true);
        } else {
          throw e;
        }
      }
      const st = useMockup.getState();
      const t = useMockup.temporal.getState();
      t.pause();
      st.setAnalysis(analysis);
      st.setPlacement({
        widthM: analysis.profile.widthCm / 100,
        lengthM: analysis.profile.lengthCm / 100,
      });
      st.setPile(analysis.profile.pile);
      st.setFringe(analysis.profile.fringe);
      st.setScene(PHOTO_FOR[analysis.rooms[0].id] ?? analysis.rooms[0].id);
      st.setExportPresets(analysis.exports.map((e) => e.id));
      t.resume();
      const styleName = analysis.profile.style === "Unknown" ? "your rug" : `the ${analysis.profile.style}`;
      toast(`Set up for ${styleName} — room, size and exports are ready`);
    } catch {
      toast("Couldn't analyze the photo — the manual controls are all yours", "error");
    } finally {
      setAnalyzing(false);
    }
  }

  /* ---------------- rug intake ---------------- */

  function openPrep(raw: string, label: string) {
    setRawImage(raw);
    setPrepLabel(label);
    setPrepOpen(true);
  }

  const handlePrepDone = useCallback(
    async (processed: string) => {
      setPrepOpen(false);
      const { dataUrl, aspect } = await normalizeRugImage(processed);
      useMockup.getState().setRug(dataUrl, aspect, prepLabel || useMockup.getState().rugLabel);
      logProject({
        id: "mockup-current",
        studio: "mockup",
        title: prepLabel || "Untitled mockup",
        subtitle: roomOptions.find((r) => r.id === useMockup.getState().sceneId)?.name,
      });
      void runAnalysis(dataUrl, aspect);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [logProject, prepLabel],
  );

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
      const dataUrl = c.toDataURL("image/jpeg", 0.9); // throws if CORS-tainted
      const { dataUrl: normalized, aspect } = await normalizeRugImage(dataUrl);
      const st = useMockup.getState();
      st.setRug(normalized, aspect, rug.name);
      // Catalog rugs carry their true size, pile, and style — apply them.
      const dims = parseDims(rug.dimensions);
      if (dims) st.setPlacement(dims);
      st.setPile(guessPile(rug.pile, rug.style));
      st.setFringe(FRINGED_STYLES.has(rug.style));
      setRawImage(dataUrl);
      setPrepLabel(rug.name);
      logProject({ id: "mockup-current", studio: "mockup", title: rug.name, subtitle: "Catalog" });
      void runAnalysis(normalized, aspect, {
        style: rug.style as MoroccanStyle,
        pile: guessPile(rug.pile, rug.style),
        fringe: FRINGED_STYLES.has(rug.style),
        widthCm: dims ? Math.round(dims.widthM * 100) : undefined,
        lengthCm: dims ? Math.round(dims.lengthM * 100) : undefined,
      });
    } catch {
      toast("Catalog photos aren't cross-origin enabled yet — drop the photo file instead", "error");
    }
  }

  /* ---------------- drag to place ---------------- */

  function canvasPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * PREVIEW_W,
      y: ((e.clientY - rect.top) / rect.height) * PREVIEW_H,
    };
  }

  function rugHit(px: number, py: number): boolean {
    const pt = mapper.toPlane(px, py);
    const rad = (-s.rotation * Math.PI) / 180;
    const dx = pt.x - s.offsetX;
    const dd = pt.depth - s.depth;
    const lx = dx * Math.cos(rad) - dd * Math.sin(rad);
    const ld = dx * Math.sin(rad) + dd * Math.cos(rad);
    return Math.abs(lx) <= s.widthM / 2 + 0.12 && Math.abs(ld) <= s.lengthM / 2 + 0.12;
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!rugEl) return;
    const { x, y } = canvasPoint(e);
    if (!rugHit(x, y)) return;
    const st = useMockup.getState();
    const pt = mapper.toPlane(x, y);
    dragRef.current = {
      grabX: pt.x - st.offsetX,
      grabD: pt.depth - st.depth,
      preX: st.offsetX,
      preD: st.depth,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    // Untracked while dragging — the whole gesture becomes one undo step.
    useMockup.temporal.getState().pause();
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const { x, y } = canvasPoint(e);
    const drag = dragRef.current;
    if (!drag) {
      if (rugEl) setHovering(rugHit(x, y));
      return;
    }
    const pt = mapper.toPlane(x, y);
    useMockup.getState().setPlacement({
      offsetX: clamp(pt.x - drag.grabX, bounds.x),
      depth: clamp(pt.depth - drag.grabD, bounds.d),
    });
  }

  function onPointerUp() {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    const st = useMockup.getState();
    const finalX = st.offsetX;
    const finalD = st.depth;
    // zundo records the pre-change state on the next tracked set — so restore
    // the pre-drag position while still paused, then re-apply the final one
    // tracked. Undo now returns exactly to where the drag started.
    st.setPlacement({ offsetX: drag.preX, depth: drag.preD });
    useMockup.temporal.getState().resume();
    st.setPlacement({ offsetX: finalX, depth: finalD });
  }

  /* ---------------- export ---------------- */

  async function handleExport() {
    if (!rugEl || selectedPresets.length === 0) return;
    setExporting(true);
    try {
      await new Promise((r) => setTimeout(r, 30));
      const master = document.createElement("canvas");
      master.width = MASTER_W;
      master.height = MASTER_H;
      await renderMockup(master, {
        sceneId: s.sceneId,
        rug: { img: rugEl, w: rugEl.width, h: rugEl.height },
        placement,
        style,
        customTemplates: customs,
      });

      const slug = (s.rugLabel || "rug").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const sceneName = roomOptions.find((r) => r.id === s.sceneId)?.name ?? "Room";

      for (const preset of EXPORT_PRESETS.filter((pr) => selectedPresets.includes(pr.id))) {
        const c = document.createElement("canvas");
        c.width = preset.w;
        c.height = preset.h;
        const g = c.getContext("2d")!;
        // Cover-crop from the master so every preset shows the same scene.
        const scale = Math.max(preset.w / MASTER_W, preset.h / MASTER_H);
        const dw = MASTER_W * scale;
        const dh = MASTER_H * scale;
        g.drawImage(master, (preset.w - dw) / 2, (preset.h - dh) / 2, dw, dh);
        downloadDataUrl(
          c.toDataURL(preset.mime, preset.quality),
          `tiziri-${slug}-${s.sceneId}-${preset.id}.${preset.ext}`,
        );
        logExport({ studio: "mockup", title: `${s.rugLabel || "Rug"} · ${preset.label}`, kind: preset.ext.toUpperCase() });
        // Give the browser room between programmatic downloads.
        await new Promise((r) => setTimeout(r, 350));
      }

      const thumbCanvas = document.createElement("canvas");
      thumbCanvas.width = 480;
      thumbCanvas.height = 320;
      thumbCanvas.getContext("2d")!.drawImage(master, 0, 0, 480, 320);
      s.addHistory({
        id: uid(),
        at: new Date().toISOString(),
        sceneName,
        rugLabel: s.rugLabel || "Untitled",
        thumb: thumbCanvas.toDataURL("image/jpeg", 0.72),
      });
      toast(
        selectedPresets.length === 1
          ? "Image exported"
          : `${selectedPresets.length} images exported`,
      );
    } finally {
      setExporting(false);
    }
  }

  const cmInput = (value: number, key: "widthM" | "lengthM") => (
    <Input
      type="number"
      min={40}
      max={600}
      value={Math.round(value * 100)}
      onChange={(e) => {
        const cm = Number(e.target.value);
        if (cm >= 30 && cm <= 700) s.setPlacement({ [key]: cm / 100 });
      }}
      className="h-8.5 text-[13px]"
    />
  );

  const photoRooms = roomOptions.filter((r) => r.kind === "photo");
  const illustratedRooms = roomOptions.filter((r) => r.kind === "illustrated");

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Mockup Studio"
        description="Isolate the rug, drop it in a room, drag it into place, export for every marketplace."
        actions={
          <>
            <Button size="sm" variant="ghost" icon={<IconUndo size={14} />} onClick={undo} disabled={!canUndo}>
              Undo
            </Button>
            <Button size="sm" variant="ghost" icon={<IconRedo size={14} />} onClick={redo} disabled={!canRedo}>
              Redo
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-4 xl:grid-cols-[1fr_320px]">
        {/* Preview + placement */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={PREVIEW_W}
                height={PREVIEW_H}
                className={cn(
                  "block aspect-3/2 w-full touch-none",
                  rugEl && (dragRef.current ? "cursor-grabbing" : hovering ? "cursor-grab" : "cursor-default"),
                )}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              />
              {!s.rugImage && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full max-w-sm px-6">
                    <Dropzone
                      onImage={(d, f) =>
                        openPrep(d, f ? f.name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ") : "")
                      }
                      compact
                      className="bg-surface/85 backdrop-blur-sm"
                    />
                  </div>
                </div>
              )}
              {s.rugImage && (
                <p className="pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 rounded-full bg-surface/85 px-3 py-1 text-[11.5px] text-ink-2 shadow-soft backdrop-blur-sm">
                  Drag the rug to move it
                </p>
              )}
            </div>
          </Card>

          {s.rugImage && (
            <Card>
              <div className="grid gap-x-8 gap-y-4 px-6 py-5 sm:grid-cols-2">
                <Slider
                  label="Rotation"
                  value={s.rotation}
                  min={-90}
                  max={90}
                  step={1}
                  format={(v) => `${v}°`}
                  onChange={(rotation) => s.setPlacement({ rotation })}
                />
                <Slider
                  label="Distance into the room"
                  value={s.depth}
                  min={bounds.d[0]}
                  max={bounds.d[1]}
                  step={0.05}
                  format={(v) => `${v.toFixed(2)} m`}
                  onChange={(depth) => s.setPlacement({ depth })}
                />
              </div>
              <div className="flex items-center justify-between border-t border-line px-6 py-3">
                <span className="text-xs text-ink-3">Position also drags directly on the preview.</span>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<IconRefresh size={14} />}
                  onClick={() =>
                    s.setPlacement({
                      offsetX: (bounds.x[0] + bounds.x[1]) / 2,
                      depth: (bounds.d[0] + bounds.d[1]) / 2,
                      rotation: 0,
                    })
                  }
                >
                  Reset placement
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Workflow rail */}
        <div className="space-y-4">
          <MockupAiPanel
            analysis={s.analysis}
            analyzing={analyzing}
            activeSceneId={ILLUSTRATED_FOR[s.sceneId] ?? s.sceneId}
            activePresets={selectedPresets}
            onPickRoom={(id) => s.setScene(PHOTO_FOR[id] ?? id)}
            onTogglePreset={(id) =>
              s.setExportPresets(
                selectedPresets.includes(id)
                  ? selectedPresets.filter((p) => p !== id)
                  : [...selectedPresets, id],
              )
            }
            onReanalyze={() => {
              if (s.rugImage) void runAnalysis(s.rugImage, s.rugAspect);
            }}
          />

          <Card className="pb-5">
            <SectionTitle n={1} title="Your rug" />
            <div className="space-y-3 px-5">
              {s.rugImage ? (
                <div className="flex items-center gap-3">
                  <img
                    src={s.rugImage}
                    alt="Prepared rug"
                    className="h-14 w-14 rounded-xl border border-line object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <Input
                      value={s.rugLabel}
                      onChange={(e) => s.setRugLabel(e.target.value)}
                      placeholder="Rug name"
                      className="h-8.5 text-[13px]"
                    />
                    <div className="mt-1.5 flex gap-3 text-xs">
                      {rawImage && (
                        <button
                          onClick={() => setPrepOpen(true)}
                          className="text-accent underline-offset-2 hover:underline"
                        >
                          Adjust crop
                        </button>
                      )}
                      <button
                        onClick={() => {
                          s.clearRug();
                          setRawImage(null);
                        }}
                        className="text-ink-3 underline-offset-2 hover:text-danger hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <Dropzone
                  onImage={(d, f) =>
                    openPrep(d, f ? f.name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ") : "")
                  }
                  compact
                />
              )}
              <RugPicker
                value={catalogRug}
                onChange={(r) => void handleCatalogPick(r)}
                placeholder="Or pick from the catalog"
              />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Width (cm)" hint="across">
                  {cmInput(s.widthM, "widthM")}
                </Field>
                <Field label="Length (cm)" hint="into room">
                  {cmInput(s.lengthM, "lengthM")}
                </Field>
              </div>
              <div className="grid grid-cols-2 items-end gap-3">
                <Field label="Pile">
                  <Select
                    value={s.pile}
                    onChange={(e) => s.setPile(e.target.value as PileType)}
                    className="h-8.5 text-[13px]"
                  >
                    <option value="flat">Flatweave / kilim</option>
                    <option value="low">Low pile</option>
                    <option value="high">High pile</option>
                  </Select>
                </Field>
                <button
                  onClick={() => s.setFringe(!s.fringe)}
                  className="flex h-8.5 items-center justify-between rounded-xl border border-line px-3 text-[13px] transition-colors hover:border-line-strong"
                  role="switch"
                  aria-checked={s.fringe}
                >
                  <span className="font-medium text-ink">Fringe</span>
                  <span
                    className={cn(
                      "relative h-4.5 w-8 rounded-full transition-colors",
                      s.fringe ? "bg-accent" : "bg-surface-3",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-soft transition-all",
                        s.fringe ? "left-4" : "left-0.5",
                      )}
                    />
                  </span>
                </button>
              </div>
            </div>
          </Card>

          <Card className="pb-5">
            <SectionTitle n={2} title="Room" />
            <p className="px-5 pb-2 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
              Photo rooms
            </p>
            <div className="grid grid-cols-2 gap-2 px-5">
              {photoRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => s.setScene(room.id)}
                  className={cn(
                    "group overflow-hidden rounded-xl border text-left transition-all",
                    s.sceneId === room.id
                      ? "border-accent shadow-soft ring-2 ring-accent/25"
                      : "border-line hover:border-line-strong",
                  )}
                  title={room.blurb}
                >
                  <img src={room.photo} alt={room.name} loading="lazy" className="aspect-3/2 w-full object-cover" />
                  <span className="block px-2.5 py-1.5 text-[11.5px] font-medium text-ink-2 group-hover:text-ink">
                    {room.name}
                  </span>
                </button>
              ))}
            </div>
            <p className="px-5 pt-3 pb-2 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
              Illustrated demos
            </p>
            <div className="grid grid-cols-3 gap-2 px-5">
              {illustratedRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => s.setScene(room.id)}
                  className={cn(
                    "group overflow-hidden rounded-xl border text-left transition-all",
                    s.sceneId === room.id
                      ? "border-accent shadow-soft ring-2 ring-accent/25"
                      : "border-line hover:border-line-strong",
                  )}
                  title={room.blurb}
                >
                  {illusThumbs[room.id] ? (
                    <img src={illusThumbs[room.id]} alt={room.name} className="aspect-3/2 w-full object-cover" />
                  ) : (
                    <span className="block aspect-3/2 w-full bg-surface-2" />
                  )}
                  <span className="block truncate px-2 py-1 text-[10.5px] font-medium text-ink-3 group-hover:text-ink">
                    {room.name}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          <Card className="pb-5">
            <SectionTitle n={3} title="Export" />
            <div className="space-y-3 px-5">
              <div className="grid grid-cols-2 gap-2">
                {EXPORT_PRESETS.map((preset) => {
                  const active = selectedPresets.includes(preset.id);
                  return (
                    <button
                      key={preset.id}
                      onClick={() =>
                        s.setExportPresets(
                          active
                            ? selectedPresets.filter((id) => id !== preset.id)
                            : [...selectedPresets, preset.id],
                        )
                      }
                      className={cn(
                        "rounded-xl border px-3 py-2 text-left transition-all",
                        active
                          ? "border-accent bg-accent-soft/60 shadow-soft"
                          : "border-line hover:border-line-strong",
                      )}
                      aria-pressed={active}
                    >
                      <span className={cn("block text-[12.5px] font-semibold", active ? "text-accent-strong" : "text-ink")}>
                        {preset.label}
                      </span>
                      <span className="block text-[11px] text-ink-3">{preset.sub}</span>
                    </button>
                  );
                })}
              </div>
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                icon={<IconDownload size={16} />}
                loading={exporting}
                disabled={!rugEl || selectedPresets.length === 0}
                onClick={() => void handleExport()}
              >
                Export {selectedPresets.length > 1 ? `${selectedPresets.length} images` : "image"}
              </Button>
            </div>
          </Card>

          {s.history.length > 0 && (
            <Card>
              <CardHeader title="History" description="Recent exports from this studio." />
              <ul className="space-y-2 px-5 pb-5">
                {s.history.map((h) => (
                  <li key={h.id} className="group relative overflow-hidden rounded-xl border border-line">
                    <img src={h.thumb} alt={`${h.rugLabel} in ${h.sceneName}`} className="aspect-3/2 w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-surface/90 px-3 py-1.5 backdrop-blur-sm">
                      <span className="truncate text-[11.5px] font-medium text-ink-2">
                        {h.rugLabel} · {h.sceneName}
                      </span>
                      <span className="flex shrink-0 items-center">
                        <button
                          onClick={() => downloadDataUrl(h.thumb, `tiziri-mockup-${h.id.slice(0, 6)}.jpg`)}
                          className="rounded-md p-1 text-ink-3 hover:text-ink"
                          aria-label="Download thumbnail"
                        >
                          <IconDownload size={13} />
                        </button>
                        <button
                          onClick={() => s.removeHistory(h.id)}
                          className="rounded-md p-1 text-ink-3 hover:text-danger"
                          aria-label="Remove from history"
                        >
                          <IconTrash size={13} />
                        </button>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {prepOpen && rawImage && (
        <RugPrep src={rawImage} onDone={(d) => void handlePrepDone(d)} onCancel={() => setPrepOpen(false)} />
      )}
    </div>
  );
}
