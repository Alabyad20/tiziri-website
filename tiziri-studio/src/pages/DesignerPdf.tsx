import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RugPicker } from "@/components/RugPicker";
import { TearSheet } from "@/components/TearSheet";
import { rugBySlug, type Rug } from "@/lib/rugs";
import { usePdf } from "@/stores/pdf";
import { useUndoRedo } from "@/lib/useUndoRedo";
import { useActivity } from "@/stores/activity";
import { cn } from "@/lib/utils";
import { IconDownload, IconPdf, IconRedo, IconUndo } from "@/components/icons";

function usePrintRoot(): HTMLElement {
  return useMemo(() => {
    let el = document.getElementById("print-root");
    if (!el) {
      el = document.createElement("div");
      el.id = "print-root";
      document.body.appendChild(el);
    }
    return el;
  }, []);
}

/** Scale the fixed-mm sheet down to fit its on-screen container. */
function useFitScale(sheetWidthPx: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.7);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setScale(Math.min(1, el.clientWidth / sheetWidthPx));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [sheetWidthPx]);
  return { ref, scale };
}

const SHEET_W_PX = 794; // 210mm at 96dpi
const SHEET_H_PX = 1119; // 296mm at 96dpi

export function DesignerPdf() {
  const s = usePdf();
  const logProject = useActivity((a) => a.logProject);
  const logExport = useActivity((a) => a.logExport);
  const { undo, redo, canUndo, canRedo } = useUndoRedo(usePdf);
  const printRoot = usePrintRoot();
  const { ref, scale } = useFitScale(SHEET_W_PX);

  const rug = useMemo(() => (s.rugSlug ? (rugBySlug(s.rugSlug) ?? null) : null), [s.rugSlug]);

  function applyRug(r: Rug) {
    s.setRug(r.slug, r.description);
    logProject({ id: `pdf-${r.slug}`, studio: "pdf", title: r.name, subtitle: "Tear sheet" });
  }

  function handleExport() {
    if (!rug) return;
    logExport({ studio: "pdf", title: rug.name, kind: "PDF" });
    // The print stylesheet swaps #root for #print-root; "Save as PDF" in the
    // dialog produces the final A4 document.
    window.print();
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Designer PDF"
        description="A printable tear sheet for the trade — specs, story and imagery on one A4 page."
        actions={
          <>
            <Button size="sm" variant="ghost" icon={<IconUndo size={14} />} onClick={undo} disabled={!canUndo}>
              Undo
            </Button>
            <Button size="sm" variant="ghost" icon={<IconRedo size={14} />} onClick={redo} disabled={!canRedo}>
              Redo
            </Button>
            <Button
              variant="primary"
              icon={<IconDownload size={15} />}
              disabled={!rug}
              onClick={handleExport}
            >
              Export PDF
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-4 xl:grid-cols-[360px_1fr]">
        {/* Controls */}
        <Card>
          <CardHeader title="Sheet" description="Pick the piece, tune the words." />
          <div className="space-y-4 px-6 pb-6">
            <RugPicker value={rug} onChange={applyRug} />
            {rug && (
              <>
                <Field label="Story" hint="as it prints">
                  <Textarea value={s.story} onChange={(e) => s.setStory(e.target.value)} rows={6} />
                </Field>
                <Field label="Designer notes" hint="optional — trade-only line">
                  <Textarea
                    value={s.designerNotes}
                    onChange={(e) => s.setDesignerNotes(e.target.value)}
                    rows={3}
                    placeholder="Available for 30-day approval. COM sizing possible on commission."
                  />
                </Field>
                <button
                  onClick={() => s.setShowPrice(!s.showPrice)}
                  className="flex w-full items-center justify-between rounded-xl border border-line px-3.5 py-2.5 text-left transition-colors hover:border-line-strong"
                  role="switch"
                  aria-checked={s.showPrice}
                >
                  <span>
                    <span className="block text-[13px] font-medium text-ink">Show price</span>
                    <span className="block text-xs text-ink-3">Hide it on sheets for client presentations</span>
                  </span>
                  <span
                    className={cn(
                      "relative h-5.5 w-9.5 shrink-0 rounded-full transition-colors",
                      s.showPrice ? "bg-accent" : "bg-surface-3",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow-soft transition-all",
                        s.showPrice ? "left-4.5" : "left-0.5",
                      )}
                    />
                  </span>
                </button>
                <p className="text-xs leading-relaxed text-ink-3">
                  Export opens the print dialog — choose “Save as PDF”, A4, default margins off.
                </p>
              </>
            )}
          </div>
        </Card>

        {/* Preview */}
        <Card className="overflow-hidden">
          {!rug ? (
            <EmptyState
              icon={<IconPdf size={20} />}
              title="Tear sheet preview"
              description="Choose a rug to lay out its printable sheet."
              className="py-24"
            />
          ) : (
            <div ref={ref} className="bg-surface-2/60 p-6">
              <div
                className="mx-auto origin-top-left shadow-lift"
                style={{
                  width: SHEET_W_PX * scale,
                  height: SHEET_H_PX * scale,
                }}
              >
                <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
                  <TearSheet
                    rug={rug}
                    story={s.story}
                    designerNotes={s.designerNotes}
                    showPrice={s.showPrice}
                  />
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Print copy — the only thing the print stylesheet keeps */}
      {rug &&
        createPortal(
          <TearSheet rug={rug} story={s.story} designerNotes={s.designerNotes} showPrice={s.showPrice} />,
          printRoot,
        )}
    </div>
  );
}
