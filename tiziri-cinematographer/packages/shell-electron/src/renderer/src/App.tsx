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

  async function runAnalysis() {
    setAnalysis(null);
    setStage("starting");
    const res = await window.tiziri.runAnalysis({
      image_path: imgPath, rug_width_cm: 300, rug_height_cm: 200, segmenter: "auto",
    });
    setAnalysis(res);
    setStage("");
  }

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
              <p style={{ marginTop: 8, color: "#aeb9cc" }}>
                ✓ {String(analysis["segmenter_used"])} · rms {String(analysis["reprojection_rms_px"])}px ·
                cutout ready
              </p>
            )}
            {analysis?.type === "error" && (
              <p style={{ marginTop: 8, color: "#d9a441" }}>
                {analysis.code}: {analysis.message}
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
