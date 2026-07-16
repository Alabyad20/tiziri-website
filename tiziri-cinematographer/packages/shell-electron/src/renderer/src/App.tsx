import { useEffect, useState } from "react";
import type { AppInfo } from "../../shared/ipc-contract.ts";
import type { AnalysisEvent } from "../../shared/analysis-contract.ts";
import type { RugRecord } from "@tiziri/library";

/**
 * P0 renderer — a foundations placeholder, NOT the Atelier (that is P4). It exists
 * to prove the React/Vite UI loads inside Electron and that the renderer can reach
 * main only through the allow-listed preload API. The self-test reads these nodes.
 */
export function App(): React.ReactElement {
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [rugs, setRugs] = useState<RugRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Smallest developer harness for inspecting P1 analysis output (dev only).
  const [imgPath, setImgPath] = useState("");
  const [stage, setStage] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisEvent | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setInfo(await window.tiziri.appInfo());
        setRugs(await window.tiziri.listRugs());
      } catch (e) {
        setError(String((e as Error).message ?? e));
      }
    })();
    const off = window.tiziri.onAnalysisEvent((e) => {
      if (e.type === "progress") setStage(`${e.stage} ${Math.round(e.pct * 100)}%`);
    });
    return off;
  }, []);

  // Interactive refine state (the human-in-the-loop fallback).
  const [refineOpen, setRefineOpen] = useState(false);
  const [points, setPoints] = useState<number[][]>([]);
  const [negative, setNegative] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState<[number, number] | null>(null);

  async function runAnalysis(pts?: number[][]) {
    setAnalysis(null);
    setStage("starting");
    const res = await window.tiziri.runAnalysis({
      image_path: imgPath, rug_width_cm: 300, rug_height_cm: 200, segmenter: "auto",
      ...(pts && pts.length ? { points: pts } : {}),
    });
    setAnalysis(res);
    setStage("");
    // Fail-closed: if not production-ready, open the refine panel.
    if (res.type === "result" && res["production_ready"] === false) setRefineOpen(true);
  }

  async function refinePreview(pts: number[][]) {
    const res = await window.tiziri.runAnalysis({
      image_path: imgPath, rug_width_cm: 300, rug_height_cm: 200, segmenter: "auto",
      preview_only: true, ...(pts.length ? { points: pts } : {}),
    });
    if (res.type === "result") {
      setPreviewUrl((res["previewDataUrl"] as string) ?? null);
      setImgSize((res["image_size"] as [number, number]) ?? null);
    }
  }

  function onPreviewClick(e: React.MouseEvent<HTMLImageElement>) {
    if (!imgSize) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * imgSize[0];
    const py = ((e.clientY - r.top) / r.height) * imgSize[1];
    const next = [...points, [px, py, negative ? 0 : 1]];
    setPoints(next);
    void refinePreview(next);
  }

  function undo() { const n = points.slice(0, -1); setPoints(n); void refinePreview(n); }
  function reset() { setPoints([]); void refinePreview([]); }

  // Keyboard: Enter=accept, u=undo, r=reset, n=toggle negative, Esc=close.
  useEffect(() => {
    if (!refineOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") { setRefineOpen(false); void runAnalysis(points); }
      else if (e.key === "u") undo();
      else if (e.key === "r") reset();
      else if (e.key === "n") setNegative((v) => !v);
      else if (e.key === "Escape") setRefineOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [refineOpen, points, negative]);

  return (
    <main
      style={{
        height: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#0e0f12",
        color: "#ecedf0",
        fontFamily: "Georgia, serif",
        fontWeight: 300,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 34, margin: 0, letterSpacing: "0.02em" }}>Tiziri</h1>
        <p
          style={{
            fontFamily: "system-ui, sans-serif",
            color: "#6e747e",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            marginTop: 10,
          }}
        >
          Foundations
        </p>
        <p data-testid="ready" style={{ display: "none" }}>
          {info ? "ready" : "loading"}
        </p>
        <p data-testid="app-info" style={{ display: "none" }}>
          {info ? JSON.stringify(info) : ""}
        </p>
        <p data-testid="rug-count" style={{ display: "none" }}>
          {rugs ? String(rugs.length) : ""}
        </p>
        <p data-testid="error" style={{ display: "none" }}>
          {error ?? ""}
        </p>

        {import.meta.env.DEV && (
          <div style={{ marginTop: 28, fontFamily: "system-ui, sans-serif", fontSize: 12, color: "#a7acb6" }}>
            <p style={{ marginBottom: 6 }}>P1 analysis harness (dev)</p>
            <input
              value={imgPath}
              onChange={(e) => setImgPath(e.target.value)}
              placeholder="absolute path to a Flat Hero"
              style={{ width: 360, padding: 6, background: "#16181d", color: "#ecedf0", border: "1px solid #2a2d33", borderRadius: 6 }}
            />
            <button onClick={() => void runAnalysis()} style={{ marginLeft: 8, padding: "6px 12px" }}>
              Analyse
            </button>
            {stage && <p style={{ marginTop: 8 }}>{stage}</p>}
            {analysis?.type === "result" && (
              <div style={{ marginTop: 8 }}>
                <p style={{ color: analysis["production_ready"] ? "#8fb98f" : "#d9a441" }}>
                  {analysis["production_ready"] ? "✓ production-ready" : "⚠ blocked"} ·{" "}
                  {String((analysis["readiness"] as { decision?: string })?.decision ?? "")} ·{" "}
                  {String(analysis["segmenter_used"])} · rms {String(analysis["reprojection_rms_px"])}px
                </p>
                <p style={{ color: "#6e747e", maxWidth: 420 }}>
                  {String((analysis["readiness"] as { message?: string })?.message ?? "")}
                </p>
                <button onClick={() => { setRefineOpen(true); void refinePreview(points); }}>
                  Refine selection
                </button>
              </div>
            )}
            {analysis?.type === "error" && (
              <p style={{ marginTop: 8, color: "#d9a441" }}>
                {analysis.code}: {analysis.message}
              </p>
            )}

            {refineOpen && (
              <div style={{ marginTop: 12, borderTop: "1px solid #2a2d33", paddingTop: 12 }}>
                <p style={{ marginBottom: 6 }}>
                  Refine — click {negative ? "background to REMOVE" : "inside the rug to KEEP"} ·{" "}
                  <button onClick={() => setNegative((v) => !v)}>[n] {negative ? "negative" : "positive"}</button>{" "}
                  <button onClick={undo}>[u] undo</button>{" "}
                  <button onClick={reset}>[r] reset</button>{" "}
                  <button onClick={() => { setRefineOpen(false); void runAnalysis(points); }}>[Enter] accept</button>{" "}
                  <button onClick={() => setRefineOpen(false)}>[Esc] close</button>
                </p>
                {previewUrl && (
                  <img
                    src={previewUrl}
                    onClick={onPreviewClick}
                    style={{ maxWidth: 480, cursor: "crosshair", border: "1px solid #2a2d33" }}
                    alt="segmentation preview"
                  />
                )}
                <p style={{ color: "#6e747e" }}>{points.length} click(s)</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
