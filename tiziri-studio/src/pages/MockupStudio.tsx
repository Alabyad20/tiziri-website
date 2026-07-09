import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Dropzone } from "@/components/ui/Dropzone";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import { Input } from "@/components/ui/Field";
import { RugPicker } from "@/components/RugPicker";
import { rooms, renderMockup } from "@/lib/rooms";
import { useMockup } from "@/stores/mockup";
import { useUndoRedo } from "@/lib/useUndoRedo";
import { useActivity } from "@/stores/activity";
import { toast } from "@/stores/toast";
import { cn, downloadDataUrl, loadImage, uid } from "@/lib/utils";
import type { Rug } from "@/lib/rugs";
import { heroImage } from "@/lib/rugs";
import {
  IconDownload,
  IconRedo,
  IconRefresh,
  IconTrash,
  IconUndo,
} from "@/components/icons";

/** Downscale an uploaded photo so autosave stays within localStorage budget. */
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

/** Render every room once at thumbnail size for the scene picker. */
function useSceneThumbs(): Record<string, string> {
  return useMemo(() => {
    const out: Record<string, string> = {};
    for (const room of rooms) {
      const c = document.createElement("canvas");
      c.width = 300;
      c.height = 200;
      renderMockup(c, {
        sceneId: room.id,
        rug: null,
        placement: { widthM: 0, lengthM: 0, offsetX: 0, depth: 0, rotation: 0 },
      });
      out[room.id] = c.toDataURL("image/jpeg", 0.85);
    }
    return out;
  }, []);
}

const PREVIEW_W = 1440;
const PREVIEW_H = 960;
const EXPORT_W = 2400;
const EXPORT_H = 1600;

export function MockupStudio() {
  const s = useMockup();
  const logProject = useActivity((a) => a.logProject);
  const logExport = useActivity((a) => a.logExport);
  const { undo, redo, canUndo, canRedo } = useUndoRedo(useMockup);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rugEl, setRugEl] = useState<HTMLImageElement | null>(null);
  const [exporting, setExporting] = useState(false);
  const [catalogRug, setCatalogRug] = useState<Rug | null>(null);
  const sceneThumbs = useSceneThumbs();

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
      lengthM: s.widthM * s.rugAspect,
      offsetX: s.offsetX,
      depth: s.depth,
      rotation: s.rotation,
    }),
    [s.widthM, s.rugAspect, s.offsetX, s.depth, s.rotation],
  );

  // Live preview render.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderMockup(canvas, {
      sceneId: s.sceneId,
      rug: rugEl ? { img: rugEl, w: rugEl.width, h: rugEl.height } : null,
      placement,
    });
  }, [s.sceneId, rugEl, placement]);

  const handleUpload = useCallback(
    async (dataUrl: string, file?: File) => {
      const { dataUrl: normalized, aspect } = await normalizeRugImage(dataUrl);
      const label = file
        ? file.name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ")
        : s.rugLabel;
      useMockup.getState().setRug(normalized, aspect, label);
      logProject({
        id: "mockup-current",
        studio: "mockup",
        title: label || "Untitled mockup",
        subtitle: rooms.find((r) => r.id === useMockup.getState().sceneId)?.name,
      });
    },
    [logProject, s.rugLabel],
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
      useMockup.getState().setRug(normalized, aspect, rug.name);
      logProject({ id: "mockup-current", studio: "mockup", title: rug.name, subtitle: "Catalog" });
    } catch {
      toast("Catalog photos aren't cross-origin enabled yet — drop the photo file instead", "error");
    }
  }

  async function handleExport() {
    if (!rugEl) return;
    setExporting(true);
    try {
      // Give React a frame to show the loading state before the heavy render.
      await new Promise((r) => setTimeout(r, 30));
      const canvas = document.createElement("canvas");
      canvas.width = EXPORT_W;
      canvas.height = EXPORT_H;
      renderMockup(canvas, {
        sceneId: s.sceneId,
        rug: { img: rugEl, w: rugEl.width, h: rugEl.height },
        placement,
      });
      const sceneName = rooms.find((r) => r.id === s.sceneId)?.name ?? "Room";
      const slug = (s.rugLabel || "rug").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      downloadDataUrl(canvas.toDataURL("image/png"), `tiziri-mockup-${slug}-${s.sceneId}.png`);

      // History thumbnail
      const thumbCanvas = document.createElement("canvas");
      thumbCanvas.width = 480;
      thumbCanvas.height = 320;
      thumbCanvas.getContext("2d")!.drawImage(canvas, 0, 0, 480, 320);
      s.addHistory({
        id: uid(),
        at: new Date().toISOString(),
        sceneName,
        rugLabel: s.rugLabel || "Untitled",
        thumb: thumbCanvas.toDataURL("image/jpeg", 0.72),
      });
      logExport({
        studio: "mockup",
        title: `${s.rugLabel || "Rug"} · ${sceneName}`,
        kind: "PNG",
      });
      toast("Mockup exported — 2400 × 1600 PNG");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Mockup Studio"
        description="Stage any rug photo in a styled interior — perspective-correct, export-ready."
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

      <div className="grid gap-4 xl:grid-cols-[1fr_312px]">
        {/* Preview + placement controls */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={PREVIEW_W}
                height={PREVIEW_H}
                className="block aspect-3/2 w-full"
              />
              {!s.rugImage && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full max-w-sm px-6">
                    <Dropzone onImage={(d, f) => void handleUpload(d, f)} compact className="bg-surface/85 backdrop-blur-sm" />
                  </div>
                </div>
              )}
            </div>
          </Card>

          {s.rugImage && (
            <Card>
              <div className="grid gap-x-8 gap-y-4 px-6 py-5 sm:grid-cols-2">
                <Slider
                  label="Rug width"
                  value={s.widthM}
                  min={0.8}
                  max={4}
                  step={0.05}
                  format={(v) => `${v.toFixed(2)} m`}
                  onChange={(widthM) => s.setPlacement({ widthM })}
                />
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
                  label="Position · across"
                  value={s.offsetX}
                  min={-2}
                  max={2}
                  step={0.05}
                  format={(v) => `${v > 0 ? "+" : ""}${v.toFixed(2)} m`}
                  onChange={(offsetX) => s.setPlacement({ offsetX })}
                />
                <Slider
                  label="Position · depth"
                  value={s.depth}
                  min={1}
                  max={4.2}
                  step={0.05}
                  format={(v) => `${v.toFixed(2)} m`}
                  onChange={(depth) => s.setPlacement({ depth })}
                />
              </div>
              <div className="flex items-center justify-between border-t border-line px-6 py-3.5">
                <Button size="sm" variant="ghost" icon={<IconRefresh size={14} />} onClick={s.resetPlacement}>
                  Reset placement
                </Button>
                <Button
                  variant="primary"
                  icon={<IconDownload size={15} />}
                  loading={exporting}
                  onClick={() => void handleExport()}
                >
                  Export PNG
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Right rail: rug source, room, history */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Rug" />
            <div className="space-y-3 px-5 pb-5">
              {s.rugImage ? (
                <div className="flex items-center gap-3">
                  <img
                    src={s.rugImage}
                    alt="Uploaded rug"
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
                      onClick={s.clearRug}
                      className="mt-1.5 text-xs text-ink-3 underline-offset-2 hover:text-danger hover:underline"
                    >
                      Remove photo
                    </button>
                  </div>
                </div>
              ) : (
                <Dropzone onImage={(d, f) => void handleUpload(d, f)} compact />
              )}
              <div>
                <p className="mb-1.5 text-xs font-medium text-ink-3">Or from the catalog</p>
                <RugPicker value={catalogRug} onChange={(r) => void handleCatalogPick(r)} />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Room" description="Six scenes, one true floor plane." />
            <div className="grid grid-cols-2 gap-2 px-5 pb-5">
              {rooms.map((room) => (
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
                  <img src={sceneThumbs[room.id]} alt={room.name} className="aspect-3/2 w-full object-cover" />
                  <span className="block px-2.5 py-1.5 text-[11.5px] font-medium text-ink-2 group-hover:text-ink">
                    {room.name}
                  </span>
                </button>
              ))}
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
    </div>
  );
}
