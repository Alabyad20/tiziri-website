import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Dropzone } from "@/components/ui/Dropzone";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { extractPalette } from "@/lib/palette";
import { generateNaming } from "@/lib/generators/naming";
import { useNaming } from "@/stores/naming";
import { useUndoRedo } from "@/lib/useUndoRedo";
import { useActivity } from "@/stores/activity";
import { toast } from "@/stores/toast";
import { AiError } from "@/lib/ai";
import { loadImage, modKey } from "@/lib/utils";
import { copyText } from "@/platform";
import { Kbd } from "@/components/ui/Kbd";
import { IconNaming, IconPalette, IconRedo, IconUndo, IconWand } from "@/components/icons";

const styleOptions = [
  "Let the photo decide",
  "Beni Ourain",
  "Boujaad",
  "Mrirt",
  "Azilal",
  "Kilim",
  "Contemporary",
];

/** Downscale for storage + a reasonable vision payload. */
async function normalize(src: string): Promise<string> {
  const img = await loadImage(src);
  const maxSide = 1100;
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.82);
}

export function NamingStudio() {
  const s = useNaming();
  const [busy, setBusy] = useState(false);
  const logProject = useActivity((a) => a.logProject);
  const { undo, redo, canUndo, canRedo } = useUndoRedo(useNaming);

  async function handleUpload(dataUrl: string) {
    const normalized = await normalize(dataUrl);
    const palette = await extractPalette(normalized);
    s.setImage(normalized, palette);
    s.setResult(null);
  }

  async function handleGenerate() {
    if (!s.image) {
      toast("Upload a rug photo first", "error");
      return;
    }
    setBusy(true);
    try {
      const { result, source } = await generateNaming({
        imageDataUrl: s.image,
        palette: s.palette,
        styleHint: s.styleHint,
        notes: s.notes,
      });
      s.setResult(result, source);
      logProject({
        id: `naming-${result.name}`,
        studio: "naming",
        title: result.name,
        subtitle: result.collection,
      });
      toast(source === "ai" ? `She's called ${result.name}` : `Named ${result.name} from the house list`);
    } catch (e) {
      toast(e instanceof AiError ? e.message : "Naming failed", "error");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !busy) {
        e.preventDefault();
        void handleGenerate();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, s.image, s.styleHint, s.notes]);

  const r = s.result;
  const identityBlock = r
    ? `${r.name} — ${r.meaning}\nCollection: ${r.collection}\n\n${r.story}\n\nPalette: ${s.palette
        .map((p) => `${p.name} ${p.hex}`)
        .join(" · ")}`
    : "";

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Naming Studio"
        description="A new arrival gets its name, collection, story and palette — from one photo."
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

      <div className="grid items-start gap-4 lg:grid-cols-[420px_1fr]">
        {/* Photo + hints */}
        <Card>
          <CardHeader title="The rug" description="Flat, well-lit photos name best." />
          <div className="space-y-4 px-6 pb-6">
            {s.image ? (
              <div className="overflow-hidden rounded-xl border border-line">
                <img src={s.image} alt="New arrival rug" className="max-h-80 w-full object-cover" />
                <div className="flex items-center justify-between bg-surface-2/60 px-3 py-2">
                  <span className="flex items-center gap-1.5 text-xs text-ink-2">
                    <IconPalette size={13} /> extracted palette
                  </span>
                  <button
                    onClick={() => {
                      s.setImage(null, []);
                      s.setResult(null);
                    }}
                    className="text-xs text-ink-3 underline-offset-2 hover:text-danger hover:underline"
                  >
                    Replace photo
                  </button>
                </div>
                <div className="flex">
                  {s.palette.map((p) => (
                    <button
                      key={p.hex}
                      title={`${p.name} — ${p.hex} (click to copy)`}
                      onClick={() => {
                        void copyText(p.hex);
                        toast(`${p.hex} copied`);
                      }}
                      className="h-9 flex-1 transition-transform hover:scale-y-110"
                      style={{ backgroundColor: p.hex }}
                      aria-label={`Copy ${p.name} ${p.hex}`}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <Dropzone onImage={(d) => void handleUpload(d)} />
            )}
            <Field label="Weaving tradition" hint="optional hint">
              <Select value={s.styleHint} onChange={(e) => s.setStyleHint(e.target.value)}>
                {styleOptions.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
            </Field>
            <Field label="Anything the photo can't show" hint="age, provenance, feel">
              <Textarea value={s.notes} onChange={(e) => s.setNotes(e.target.value)} rows={3} />
            </Field>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              loading={busy}
              disabled={!s.image}
              icon={<IconWand size={16} />}
              onClick={() => void handleGenerate()}
            >
              {r ? "Name her again" : "Name this rug"}
              <span className="ml-1 hidden items-center gap-0.5 opacity-70 sm:flex">
                <Kbd>{modKey}</Kbd>
                <Kbd>↵</Kbd>
              </span>
            </Button>
          </div>
        </Card>

        {/* Identity */}
        <Card className="overflow-hidden">
          {!r ? (
            <EmptyState
              icon={<IconNaming size={20} />}
              title="Identity appears here"
              description="Name, meaning, collection and story — every rug in the house carries a woman's name."
              className="py-24"
            />
          ) : (
            <>
              <div className="border-b border-line bg-surface-2/40 px-8 pt-8 pb-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Input
                      value={r.name}
                      onChange={(e) => s.patchResult({ name: e.target.value })}
                      className="h-auto border-0 bg-transparent p-0 font-display text-[40px] font-semibold tracking-tight text-ink hover:border-0 focus:border-0"
                      aria-label="Rug name"
                    />
                    <Input
                      value={r.meaning}
                      onChange={(e) => s.patchResult({ meaning: e.target.value })}
                      className="mt-1 h-auto w-full border-0 bg-transparent p-0 text-sm text-ink-2 italic hover:border-0"
                      aria-label="Name meaning"
                    />
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {s.source && (
                      <Badge tone={s.source === "ai" ? "accent" : "neutral"}>
                        {s.source === "ai" ? "Named by Claude" : "House list"}
                      </Badge>
                    )}
                    <CopyButton text={identityBlock} label="Copy identity" />
                  </div>
                </div>
              </div>

              <div className="space-y-5 px-8 py-6">
                <Field label="Collection">
                  <Select
                    value={r.collection}
                    onChange={(e) => s.patchResult({ collection: e.target.value })}
                    className="max-w-60"
                  >
                    {styleOptions.slice(1).map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </Select>
                </Field>
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[13px] font-medium text-ink">Story</span>
                    <CopyButton text={r.story} />
                  </div>
                  <Textarea
                    value={r.story}
                    onChange={(e) => s.patchResult({ story: e.target.value })}
                    rows={5}
                    className="text-[15px] leading-relaxed"
                  />
                </div>
                <div>
                  <span className="mb-2 block text-[13px] font-medium text-ink">Palette</span>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {s.palette.map((p) => (
                      <li
                        key={p.hex}
                        className="flex items-center gap-3 rounded-xl border border-line px-3 py-2"
                      >
                        <span
                          className="h-8 w-8 shrink-0 rounded-lg border border-black/10"
                          style={{ backgroundColor: p.hex }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-ink">{p.name}</span>
                          <span className="font-mono text-xs text-ink-3">{p.hex}</span>
                        </span>
                        <CopyButton text={p.hex} label="" />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
