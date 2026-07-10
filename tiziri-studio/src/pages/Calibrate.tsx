import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Dropzone } from "@/components/ui/Dropzone";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { Slider } from "@/components/ui/Slider";
import { Segmented } from "@/components/ui/Segmented";
import { renderMockup } from "@/lib/rooms";
import {
  DEFAULT_MASK_PROCESSING,
  processMask,
  templateMapper,
  type MaskProcessing,
  type RoomTemplate,
} from "@/lib/roomTemplates";
import { useTemplates } from "@/stores/templates";
import { toast } from "@/stores/toast";
import { loadImage, cn, uid } from "@/lib/utils";
import { downloadDataUrl } from "@/platform";
import { IconCheck, IconDownload, IconTrash } from "@/components/icons";

const W = 1440;
const H = 960;

type Mode = "floor" | "mask" | "feet" | "preview";

/** Cover placement for the display canvas (mirrors roomTemplates logic). */
function cover(aspect: number, focusY: number) {
  const iw = 1000;
  const ih = 1000 * aspect;
  const scale = Math.max(W / iw, H / ih);
  const dx = (W - iw * scale) / 2;
  const dy = (H - ih * scale) * focusY;
  return { iw, ih, scale, dx, dy };
}

/** A small procedural Beni-style test rug for the live preview. */
let testRug: { dataUrl: string; aspect: number } | null = null;
function getTestRug() {
  if (testRug) return testRug;
  const c = document.createElement("canvas");
  c.width = 900;
  c.height = 600;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ece4d3";
  g.fillRect(0, 0, 900, 600);
  g.strokeStyle = "#33302a";
  g.lineWidth = 8;
  for (let y = 30; y < 600; y += 140)
    for (let x = 30; x < 900; x += 140) {
      g.beginPath();
      g.moveTo(x + 55, y);
      g.lineTo(x + 110, y + 65);
      g.lineTo(x + 55, y + 130);
      g.lineTo(x, y + 65);
      g.closePath();
      g.stroke();
    }
  testRug = { dataUrl: c.toDataURL("image/jpeg", 0.85), aspect: 600 / 900 };
  return testRug;
}

const COOL: [number, number, number] = [206, 214, 232];
const WARM: [number, number, number] = [255, 190, 140];
const lerpTint = (t: number): [number, number, number] => [
  Math.round(COOL[0] + (WARM[0] - COOL[0]) * t),
  Math.round(COOL[1] + (WARM[1] - COOL[1]) * t),
  Math.round(COOL[2] + (WARM[2] - COOL[2]) * t),
];

export function Calibrate() {
  const addTemplate = useTemplates((s) => s.addTemplate);

  // Photo
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoEl, setPhotoEl] = useState<HTMLImageElement | null>(null);
  const aspect = photoEl ? photoEl.height / photoEl.width : 2 / 3;
  const [focusY, setFocusY] = useState(0.5);

  // Calibration state
  const [mode, setMode] = useState<Mode>("floor");
  const [quad, setQuad] = useState<[number, number][]>([
    [0.1, 0.6],
    [0.9, 0.6],
    [1.05, 1.0],
    [-0.05, 1.0],
  ]);
  const [planeW, setPlaneW] = useState(4.5);
  const [planeD, setPlaneD] = useState(2.5);
  const [feet, setFeet] = useState<[number, number][]>([]);
  const [bounds, setBounds] = useState({ xMin: -1, xMax: 1, dMin: 1, dMax: 2 });
  const [dirX, setDirX] = useState(0);
  const [warmth, setWarmth] = useState(0.7);
  const [strength, setStrength] = useState(0.05);
  const [brush, setBrush] = useState(40);
  const [erase, setErase] = useState(false);
  const [maskVersion, setMaskVersion] = useState(0);
  const [mp, setMp] = useState<Required<MaskProcessing>>({ ...DEFAULT_MASK_PROCESSING });
  // Diagnostic overlays — every layer of the occlusion system, toggleable.
  const [view, setView] = useState({
    rawMask: true,
    processedMask: false,
    maskEdge: false,
    feet: true,
    compression: false,
    contactShadows: false,
  });

  // Preview placement
  const [pv, setPv] = useState({ x: 0, d: 1.5, w: 2.2, l: 1.5 });

  // Meta
  const [name, setName] = useState("");
  const [styleTag, setStyleTag] = useState("living room");
  const [orientation, setOrientation] = useState<RoomTemplate["orientation"]>("landscape");
  const [rugSize, setRugSize] = useState({ minW: 1.4, maxW: 3.0, minL: 1.0, maxL: 2.0 });
  const [author, setAuthor] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [license, setLicense] = useState("Owned / licensed for commercial use");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskRef = useRef<HTMLCanvasElement | null>(null);
  const dragIdx = useRef(-1);
  const painting = useRef(false);

  const cp = useMemo(() => cover(aspect, focusY), [aspect, focusY]);

  async function handlePhoto(dataUrl: string) {
    const img = await loadImage(dataUrl);
    // Keep a working copy ≤1600px so saved templates stay storable.
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    const working = c.toDataURL("image/jpeg", 0.88);
    const el = await loadImage(working);
    setPhoto(working);
    setPhotoEl(el);
    const m = document.createElement("canvas");
    m.width = el.width;
    m.height = el.height;
    maskRef.current = m;
    setMaskVersion(0);
    setMode("floor");
  }

  /** Draft template built from current state — preview and save both use it. */
  const draft = useMemo((): RoomTemplate | null => {
    if (!photo) return null;
    return {
      // Processing values join the id so the template asset cache re-runs the
      // mask pipeline whenever a slider moves.
      id: `draft-${maskVersion}-${mp.threshold}-${mp.expandPx}-${mp.featherPx}`,
      kind: "photo",
      name: name || "Calibrated room",
      style: styleTag,
      photo,
      photoAspect: aspect,
      focusY,
      attribution: { author, source: "user", url: sourceUrl, license },
      floorQuad: quad.map(([a, b]) => [a, b]) as RoomTemplate["floorQuad"],
      planeSize: { w: planeW, d: planeD },
      bounds: { x: [bounds.xMin, bounds.xMax], d: [bounds.dMin, bounds.dMax] },
      light: { dirX, tint: lerpTint(warmth), tintAlpha: strength },
      legPoints: feet.map(([a, b]) => [a, b]),
      occlusionMask:
        maskVersion > 0 && maskRef.current ? maskRef.current.toDataURL("image/png") : undefined,
      maskProcessing: { ...mp },
      orientation,
      rugSize,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo, aspect, focusY, quad, planeW, planeD, bounds, dirX, warmth, strength, feet, maskVersion, mp, name, styleTag, orientation, rugSize, author, sourceUrl, license]);

  /* -------------- drawing -------------- */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !photoEl || !draft) return;
    const ctx = canvas.getContext("2d")!;
    let cancelled = false;

    void (async () => {
      if (mode === "preview") {
        const rug = getTestRug();
        const rugEl = await loadImage(rug.dataUrl);
        if (cancelled) return;
        await renderMockup(canvas, {
          sceneId: draft.id,
          rug: { img: rugEl, w: rugEl.width, h: rugEl.height },
          placement: { widthM: pv.w, lengthM: pv.l, offsetX: pv.x, depth: pv.d, rotation: 0 },
          style: { pile: "high", fringe: true },
          customTemplates: [draft],
        });
        return;
      }

      // Calibration overlay view
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#1c1916";
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(photoEl, cp.dx, cp.dy, cp.iw * cp.scale, cp.ih * cp.scale);

      // Tint a mask layer and composite it over the photo.
      const tintLayer = (src: HTMLCanvasElement | HTMLImageElement, color: string, alpha: number) => {
        ctx.save();
        ctx.globalAlpha = alpha;
        const off = document.createElement("canvas");
        off.width = W;
        off.height = H;
        const og = off.getContext("2d")!;
        og.drawImage(src, cp.dx, cp.dy, cp.iw * cp.scale, cp.ih * cp.scale);
        og.globalCompositeOperation = "source-in";
        og.fillStyle = color;
        og.fillRect(0, 0, W, H);
        ctx.drawImage(off, 0, 0);
        ctx.restore();
      };

      const hasMask = maskRef.current && maskVersion > 0;
      let processed: HTMLCanvasElement | null = null;
      if (hasMask && (view.processedMask || view.maskEdge)) {
        processed = processMask(maskRef.current!, mp);
      }

      // Raw mask (red) vs pipeline output (green) — overlay both to compare.
      if (hasMask && view.rawMask) tintLayer(maskRef.current!, "#e23b2e", 0.4);
      if (processed && view.processedMask) tintLayer(processed, "#2ea35a", 0.4);

      // Feathered edge band (cyan): pixels the pipeline left semi-transparent.
      if (processed && view.maskEdge) {
        const e = document.createElement("canvas");
        e.width = processed.width;
        e.height = processed.height;
        const eg = e.getContext("2d", { willReadFrequently: true })!;
        eg.drawImage(processed, 0, 0);
        const img = eg.getImageData(0, 0, e.width, e.height);
        const d = img.data;
        for (let i = 3; i < d.length; i += 4) {
          d[i] = d[i] > 8 && d[i] < 247 ? 255 : 0;
        }
        eg.putImageData(img, 0, 0);
        tintLayer(e, "#28c7de", 0.9);
      }

      const toCanvas = ([fx, fy]: [number, number]) => ({
        x: cp.dx + fx * cp.iw * cp.scale,
        y: cp.dy + fy * cp.ih * cp.scale,
      });

      // Floor quad + placement bounds
      const q = quad.map(toCanvas);
      ctx.save();
      ctx.strokeStyle = "#4f8edd";
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      q.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
      if (mode === "floor") {
        q.forEach((p, i) => {
          ctx.fillStyle = i < 2 ? "#4f8edd" : "#e2a53b";
          ctx.beginPath();
          ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 3;
          ctx.stroke();
        });
      }
      ctx.restore();

      // Feet markers + the contact zones the renderer will paint at each foot.
      if (view.feet || view.compression || view.contactShadows) {
        const m = draft ? templateMapper(draft, W, H) : null;
        ctx.save();
        feet.forEach(([fx, fy]) => {
          const p = toCanvas([fx, fy]);
          let ppm = 120;
          if (m) {
            const pl = m.toPlane(p.x, p.y);
            const here = m.toScreen(pl.x, pl.depth);
            const nearer = m.toScreen(pl.x, Math.max(0.05, pl.depth - 0.25));
            ppm = Math.abs(here.y - nearer.y) / 0.25;
          }
          if (view.compression) {
            const rc = 0.065 * ppm;
            ctx.strokeStyle = "#e2a53b";
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, rc, rc * 0.45, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          if (view.contactShadows) {
            const r = 0.05 * ppm;
            const ox = -dirX * r * 0.45;
            ctx.strokeStyle = "#7b4fd8";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(p.x + ox, p.y + r * 0.14, r, r * 0.42, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          if (view.feet) {
            ctx.fillStyle = "#3f9f57";
            ctx.beginPath();
            ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2.5;
            ctx.stroke();
          }
        });
        ctx.restore();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [photoEl, draft, mode, quad, feet, maskVersion, mp, view, dirX, cp, pv]);

  /* -------------- pointer handling -------------- */

  function canvasPt(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  }
  const toFrac = (p: { x: number; y: number }): [number, number] => [
    (p.x - cp.dx) / (cp.iw * cp.scale),
    (p.y - cp.dy) / (cp.ih * cp.scale),
  ];

  function paintAt(frac: [number, number]) {
    const m = maskRef.current;
    if (!m) return;
    const g = m.getContext("2d")!;
    g.globalCompositeOperation = erase ? "destination-out" : "source-over";
    g.fillStyle = "rgba(255,255,255,1)";
    g.beginPath();
    g.arc(frac[0] * m.width, frac[1] * m.height, (brush / (cp.iw * cp.scale)) * m.width, 0, Math.PI * 2);
    g.fill();
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!photoEl) return;
    const p = canvasPt(e);
    const frac = toFrac(p);
    if (mode === "floor") {
      const toCanvas = ([fx, fy]: [number, number]) => ({
        x: cp.dx + fx * cp.iw * cp.scale,
        y: cp.dy + fy * cp.ih * cp.scale,
      });
      const idx = quad.findIndex((c) => {
        const q = toCanvas(c);
        return Math.hypot(q.x - p.x, q.y - p.y) < 30;
      });
      if (idx >= 0) {
        dragIdx.current = idx;
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    } else if (mode === "mask") {
      painting.current = true;
      paintAt(frac);
      setMaskVersion((v) => v + 1);
      e.currentTarget.setPointerCapture(e.pointerId);
    } else if (mode === "feet") {
      setFeet((cur) => {
        const near = cur.findIndex(
          ([fx, fy]) =>
            Math.hypot((fx - frac[0]) * cp.iw * cp.scale, (fy - frac[1]) * cp.ih * cp.scale) < 24,
        );
        return near >= 0 ? cur.filter((_, i) => i !== near) : [...cur, frac];
      });
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!photoEl) return;
    const p = canvasPt(e);
    if (mode === "floor" && dragIdx.current >= 0) {
      const idx = dragIdx.current;
      const frac = toFrac(p);
      setQuad((q) => q.map((c, i) => (i === idx ? frac : c)) as typeof quad);
    } else if (mode === "mask" && painting.current) {
      paintAt(toFrac(p));
      setMaskVersion((v) => v + 1);
    }
  }

  function onPointerUp() {
    dragIdx.current = -1;
    painting.current = false;
  }

  /* -------------- save -------------- */

  function buildFinal(): RoomTemplate | null {
    if (!draft) return null;
    if (!name.trim()) {
      toast("Give the room a name first", "error");
      return null;
    }
    return { ...draft, id: `${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${uid().slice(0, 6)}`, name: name.trim() };
  }

  function handleSaveJson() {
    const tpl = buildFinal();
    if (!tpl) return;
    const json = JSON.stringify(tpl, null, 2);
    downloadDataUrl(
      "data:application/json;charset=utf-8," + encodeURIComponent(json),
      `${tpl.id}.room.json`,
    );
    toast("Template JSON downloaded");
  }

  function handleAddToRooms() {
    const tpl = buildFinal();
    if (!tpl) return;
    addTemplate(tpl);
    toast(`“${tpl.name}” added to your Mockup Studio rooms`);
  }

  const num = (v: number, set: (n: number) => void, step = 0.1) => (
    <Input
      type="number"
      step={step}
      value={v}
      onChange={(e) => set(Number(e.target.value))}
      className="h-8.5 text-[13px]"
    />
  );

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Room calibration"
        description="Internal tool: turn a licensed room photograph into a reusable mockup template — no code involved."
      />

      <div className="grid items-start gap-4 xl:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          {!photo ? (
            <div className="p-10">
              <Dropzone onImage={(d) => void handlePhoto(d)} />
              <p className="mt-3 text-center text-xs text-ink-3">
                Use only photographs you own or have licensed for commercial use.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
                <Segmented<Mode>
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: "floor", label: "1 · Floor" },
                    { value: "mask", label: "2 · Occlusion" },
                    { value: "feet", label: "3 · Feet" },
                    { value: "preview", label: "4 · Preview" },
                  ]}
                />
                <button
                  onClick={() => {
                    setPhoto(null);
                    setPhotoEl(null);
                    setFeet([]);
                    setMaskVersion(0);
                  }}
                  className="text-xs text-ink-3 underline-offset-2 hover:text-danger hover:underline"
                >
                  Replace photo
                </button>
              </div>
              <canvas
                ref={canvasRef}
                width={W}
                height={H}
                className={cn(
                  "block aspect-3/2 w-full touch-none",
                  mode === "mask" && "cursor-crosshair",
                  mode === "floor" && "cursor-grab",
                  mode === "feet" && "cursor-copy",
                )}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              />
              <p className="border-t border-line px-4 py-2 text-xs text-ink-3">
                {mode === "floor" &&
                  "Drag the four dots onto a floor rectangle you can size in meters — blue pair on the far edge, amber pair near the camera. Enter its real size on the right."}
                {mode === "mask" &&
                  "Paint every piece of furniture the rug can slide UNDER — it will render in front of the rug. Include its contact shadow."}
                {mode === "feet" && "Click each furniture foot that could stand on the rug. Click a dot to remove it."}
                {mode === "preview" && "A test rug, live. Use the sliders to push it under the masked furniture."}
              </p>
            </>
          )}
        </Card>

        <div className="space-y-4">
          {photo && (
            <>
              <Card className="space-y-3 p-5">
                <p className="text-[13px] font-semibold text-ink">Floor plane</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Quad width (m)">{num(planeW, setPlaneW)}</Field>
                  <Field label="Quad depth (m)">{num(planeD, setPlaneD)}</Field>
                </div>
                <Slider label="Vertical framing" value={focusY} min={0} max={1} step={0.05} format={(v) => v.toFixed(2)} onChange={setFocusY} />
              </Card>

              {mode === "mask" && (
                <Card className="space-y-3 p-5">
                  <p className="text-[13px] font-semibold text-ink">Occlusion brush</p>
                  <Slider label="Brush size" value={brush} min={8} max={120} step={2} format={(v) => `${v}px`} onChange={setBrush} />
                  <div className="flex gap-2">
                    <Button size="sm" variant={erase ? "primary" : "secondary"} onClick={() => setErase(!erase)}>
                      {erase ? "Erasing" : "Painting"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<IconTrash size={13} />}
                      onClick={() => {
                        const m = maskRef.current;
                        if (m) m.getContext("2d")!.clearRect(0, 0, m.width, m.height);
                        setMaskVersion((v) => v + 1);
                      }}
                    >
                      Clear mask
                    </Button>
                  </div>
                </Card>
              )}

              <Card className="space-y-3 p-5">
                <p className="text-[13px] font-semibold text-ink">Mask pipeline</p>
                <Slider label="Noise threshold" value={mp.threshold} min={0} max={60} step={1} format={(v) => `${v}`} onChange={(threshold) => setMp({ ...mp, threshold })} />
                <Slider label="Expand / contract" value={mp.expandPx} min={-4} max={4} step={1} format={(v) => `${v > 0 ? "+" : ""}${v}px`} onChange={(expandPx) => setMp({ ...mp, expandPx })} />
                <Slider label="Edge feather" value={mp.featherPx} min={0} max={2} step={0.25} format={(v) => `${v.toFixed(2)}px`} onChange={(featherPx) => setMp({ ...mp, featherPx })} />
                <p className="text-[11px] leading-relaxed text-ink-3">
                  Saved with the template. Preview and every export run this exact pipeline once,
                  at the mask's own resolution.
                </p>
              </Card>

              <Card className="space-y-2 p-5">
                <p className="text-[13px] font-semibold text-ink">View layers</p>
                {(
                  [
                    ["rawMask", "Raw mask (red)"],
                    ["processedMask", "Processed mask (green)"],
                    ["maskEdge", "Feathered edge (cyan)"],
                    ["feet", "Furniture feet"],
                    ["compression", "Compression zones (amber)"],
                    ["contactShadows", "Contact shadows (violet)"],
                  ] as Array<[keyof typeof view, string]>
                ).map(([key, label]) => (
                  <label key={key} className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-2">
                    <input
                      type="checkbox"
                      checked={view[key]}
                      onChange={(e) => setView({ ...view, [key]: e.target.checked })}
                      className="accent-[#b3552f]"
                    />
                    {label}
                  </label>
                ))}
              </Card>

              <Card className="space-y-3 p-5">
                <p className="text-[13px] font-semibold text-ink">Rug region (m)</p>
                <p className="text-xs leading-relaxed text-ink-3">
                  The whole rug stays inside this region. Extend it past a furniture
                  line only where your occlusion mask covers (the tuck-under zone);
                  end it at the bottom of the frame.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="X min">{num(bounds.xMin, (v) => setBounds({ ...bounds, xMin: v }))}</Field>
                  <Field label="X max">{num(bounds.xMax, (v) => setBounds({ ...bounds, xMax: v }))}</Field>
                  <Field label="Depth min">{num(bounds.dMin, (v) => setBounds({ ...bounds, dMin: v }))}</Field>
                  <Field label="Depth max">{num(bounds.dMax, (v) => setBounds({ ...bounds, dMax: v }))}</Field>
                </div>
              </Card>

              <Card className="space-y-3 p-5">
                <p className="text-[13px] font-semibold text-ink">Light</p>
                <Slider label="Direction" value={dirX} min={-1} max={1} step={0.05} format={(v) => (v < 0 ? "from left" : v > 0 ? "from right" : "ambient")} onChange={setDirX} />
                <Slider label="Temperature" value={warmth} min={0} max={1} step={0.05} format={(v) => (v < 0.4 ? "cool" : v > 0.6 ? "warm" : "neutral")} onChange={setWarmth} />
                <Slider label="Grade strength" value={strength} min={0} max={0.12} step={0.005} format={(v) => v.toFixed(3)} onChange={setStrength} />
              </Card>

              {mode === "preview" && (
                <Card className="space-y-3 p-5">
                  <p className="text-[13px] font-semibold text-ink">Test rug</p>
                  <Slider label="Across" value={pv.x} min={-2.5} max={2.5} step={0.05} format={(v) => `${v.toFixed(2)} m`} onChange={(x) => setPv({ ...pv, x })} />
                  <Slider label="Depth" value={pv.d} min={0.2} max={4} step={0.05} format={(v) => `${v.toFixed(2)} m`} onChange={(d) => setPv({ ...pv, d })} />
                  <Slider label="Width" value={pv.w} min={0.6} max={4} step={0.05} format={(v) => `${v.toFixed(2)} m`} onChange={(w) => setPv({ ...pv, w })} />
                  <Slider label="Length" value={pv.l} min={0.5} max={3} step={0.05} format={(v) => `${v.toFixed(2)} m`} onChange={(l) => setPv({ ...pv, l })} />
                </Card>
              )}

              <Card className="space-y-3 p-5">
                <p className="text-[13px] font-semibold text-ink">Room details</p>
                <Field label="Name">
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="South-facing living room" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Style tag">
                    <Input value={styleTag} onChange={(e) => setStyleTag(e.target.value)} />
                  </Field>
                  <Field label="Best orientation">
                    <Select value={orientation} onChange={(e) => setOrientation(e.target.value as RoomTemplate["orientation"])}>
                      <option value="landscape">landscape</option>
                      <option value="portrait">portrait</option>
                      <option value="either">either</option>
                    </Select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Min width (m)">{num(rugSize.minW, (v) => setRugSize({ ...rugSize, minW: v }))}</Field>
                  <Field label="Max width (m)">{num(rugSize.maxW, (v) => setRugSize({ ...rugSize, maxW: v }))}</Field>
                  <Field label="Min length (m)">{num(rugSize.minL, (v) => setRugSize({ ...rugSize, minL: v }))}</Field>
                  <Field label="Max length (m)">{num(rugSize.maxL, (v) => setRugSize({ ...rugSize, maxL: v }))}</Field>
                </div>
              </Card>

              <Card className="space-y-3 p-5">
                <p className="text-[13px] font-semibold text-ink">Attribution & license</p>
                <Field label="Photographer / owner">
                  <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
                </Field>
                <Field label="Source URL">
                  <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
                </Field>
                <Field label="License">
                  <Input value={license} onChange={(e) => setLicense(e.target.value)} />
                </Field>
              </Card>

              <Card className="space-y-2 p-5">
                <Button variant="primary" className="w-full" icon={<IconCheck size={15} />} onClick={handleAddToRooms}>
                  Add to my Mockup rooms
                </Button>
                <Button variant="secondary" className="w-full" icon={<IconDownload size={15} />} onClick={handleSaveJson}>
                  Download template JSON
                </Button>
                <p className="text-[11px] leading-relaxed text-ink-3">
                  The JSON embeds the photo, mask, geometry, light and license — commit it as a
                  bundled room or share it between machines.
                </p>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
