import { useEffect, useState } from "react";
import type { AppInfo } from "../../shared/ipc-contract.ts";
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

  useEffect(() => {
    void (async () => {
      try {
        setInfo(await window.tiziri.appInfo());
        setRugs(await window.tiziri.listRugs());
      } catch (e) {
        setError(String((e as Error).message ?? e));
      }
    })();
  }, []);

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
      </div>
    </main>
  );
}
