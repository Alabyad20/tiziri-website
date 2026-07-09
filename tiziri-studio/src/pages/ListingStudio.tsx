import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { RugPicker } from "@/components/RugPicker";
import { rugBySlug, rugStyles, type Rug } from "@/lib/rugs";
import { generateListing, type ListingCopy } from "@/lib/generators/listing";
import { useListing } from "@/stores/listing";
import { useUndoRedo } from "@/lib/useUndoRedo";
import { useActivity } from "@/stores/activity";
import { toast } from "@/stores/toast";
import { AiError } from "@/lib/ai";
import { cn, modKey } from "@/lib/utils";
import { Kbd } from "@/components/ui/Kbd";
import { IconListing, IconRedo, IconUndo, IconWand } from "@/components/icons";

function CopyBlock({
  label,
  value,
  hint,
  overLimit,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  hint?: string;
  overLimit?: boolean;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div className="border-b border-line px-6 py-4 last:border-0">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[13px] font-medium text-ink">
          {label}
          {hint && (
            <span className={cn("ml-2 text-xs font-normal", overLimit ? "text-danger" : "text-ink-3")}>
              {hint}
            </span>
          )}
        </span>
        <CopyButton text={value} />
      </div>
      {rows ? (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

export function ListingStudio() {
  const s = useListing();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const logProject = useActivity((a) => a.logProject);
  const logExport = useActivity((a) => a.logExport);
  const { undo, redo, canUndo, canRedo } = useUndoRedo(useListing);

  const selectedRug = useMemo(() => (s.rugSlug ? (rugBySlug(s.rugSlug) ?? null) : null), [s.rugSlug]);

  function applyRug(rug: Rug) {
    s.setRugSlug(rug.slug);
    s.setInputs({
      name: rug.name,
      style: rug.style,
      dimensions: rug.dimensions,
      material: rug.material,
      pile: rug.pile,
      age: rug.age,
      price: rug.price,
      color: rug.color,
      notes: rug.description,
    });
  }

  // Deep links: /listing?rug=amal from the command palette or dashboard.
  useEffect(() => {
    const slug = params.get("rug");
    if (slug && slug !== s.rugSlug) {
      const rug = rugBySlug(slug);
      if (rug) applyRug(rug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  async function handleGenerate() {
    if (!s.inputs.name.trim()) {
      toast("Pick a rug or give it a name first", "error");
      return;
    }
    setBusy(true);
    try {
      const { copy, source } = await generateListing(s.inputs);
      s.setCopy(copy, source);
      logProject({
        id: `listing-${s.rugSlug ?? s.inputs.name}`,
        studio: "listing",
        title: s.inputs.name,
        subtitle: source === "ai" ? "Generated with Claude" : "Template copy",
      });
      logExport({ studio: "listing", title: s.inputs.name, kind: "Copy" });
      toast(source === "ai" ? "Listing written" : "Template listing built — add an API key for tailored copy");
    } catch (e) {
      toast(e instanceof AiError ? e.message : "Generation failed", "error");
    } finally {
      setBusy(false);
    }
  }

  // ⌘↵ generates.
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
  }, [busy, s.inputs]);

  const patch = (p: Partial<ListingCopy>) => s.patchCopy(p);
  const copy = s.copy;

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Listing Studio"
        description="One rug in, complete marketplace copy out — titles, description, tags, materials, alt text."
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

      <div className="grid items-start gap-4 xl:grid-cols-[380px_1fr]">
        {/* Inputs */}
        <Card>
          <CardHeader title="Rug" description="Start from the catalog or fill the details by hand." />
          <div className="space-y-4 px-6 pb-6">
            <RugPicker value={selectedRug} onChange={applyRug} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name">
                <Input value={s.inputs.name} onChange={(e) => s.setInputs({ name: e.target.value })} placeholder="Amal" />
              </Field>
              <Field label="Style">
                <Select value={s.inputs.style} onChange={(e) => s.setInputs({ style: e.target.value })}>
                  {rugStyles.map((st) => (
                    <option key={st}>{st}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Size">
              <Input
                value={s.inputs.dimensions}
                onChange={(e) => s.setInputs({ dimensions: e.target.value })}
                placeholder="300 x 200 cm"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Material">
                <Input value={s.inputs.material} onChange={(e) => s.setInputs({ material: e.target.value })} />
              </Field>
              <Field label="Pile">
                <Input value={s.inputs.pile} onChange={(e) => s.setInputs({ pile: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Age">
                <Input value={s.inputs.age} onChange={(e) => s.setInputs({ age: e.target.value })} />
              </Field>
              <Field label="Price $">
                <Input
                  type="number"
                  value={s.inputs.price}
                  onChange={(e) => s.setInputs({ price: Number(e.target.value) })}
                />
              </Field>
              <Field label="Color">
                <Input value={s.inputs.color} onChange={(e) => s.setInputs({ color: e.target.value })} />
              </Field>
            </div>
            <Field label="Notes on this piece" hint="what makes it singular">
              <Textarea value={s.inputs.notes} onChange={(e) => s.setInputs({ notes: e.target.value })} rows={4} />
            </Field>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              loading={busy}
              icon={<IconWand size={16} />}
              onClick={() => void handleGenerate()}
            >
              {copy ? "Regenerate listing" : "Generate listing"}
              <span className="ml-1 hidden items-center gap-0.5 opacity-70 sm:flex">
                <Kbd>{modKey}</Kbd>
                <Kbd>↵</Kbd>
              </span>
            </Button>
          </div>
        </Card>

        {/* Generated copy */}
        <Card className="overflow-hidden">
          {!copy ? (
            <EmptyState
              icon={<IconListing size={20} />}
              title="Generated copy appears here"
              description="Every block is editable in place, with one-click copy for pasting into Etsy, eBay, or the site."
              className="py-24"
            />
          ) : (
            <>
              <CardHeader
                title="Listing copy"
                description="Edit anything in place — autosaved, undo with ⌘Z."
                action={
                  s.source && (
                    <Badge tone={s.source === "ai" ? "accent" : "neutral"}>
                      {s.source === "ai" ? "Written by Claude" : "Template"}
                    </Badge>
                  )
                }
              />
              <div className="border-t border-line">
                <CopyBlock
                  label="Etsy title"
                  hint={`${copy.etsyTitle.length}/140`}
                  overLimit={copy.etsyTitle.length > 140}
                  value={copy.etsyTitle}
                  onChange={(v) => patch({ etsyTitle: v })}
                />
                <CopyBlock
                  label="eBay title"
                  hint={`${copy.ebayTitle.length}/80`}
                  overLimit={copy.ebayTitle.length > 80}
                  value={copy.ebayTitle}
                  onChange={(v) => patch({ ebayTitle: v })}
                />
                <CopyBlock
                  label="Description"
                  value={copy.description}
                  onChange={(v) => patch({ description: v })}
                  rows={14}
                />
                {/* Tags */}
                <div className="border-b border-line px-6 py-4">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[13px] font-medium text-ink">
                      Etsy tags
                      <span className={cn("ml-2 text-xs font-normal", copy.tags.length > 13 ? "text-danger" : "text-ink-3")}>
                        {copy.tags.length}/13 · comma-separated
                      </span>
                    </span>
                    <CopyButton text={copy.tags.join(", ")} />
                  </div>
                  <Textarea
                    value={copy.tags.join(", ")}
                    onChange={(e) =>
                      patch({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })
                    }
                    rows={2}
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {copy.tags.map((t) => (
                      <Badge key={t} className={cn(t.length > 20 && "bg-danger/10 text-danger")}>
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
                <CopyBlock
                  label="Materials"
                  value={copy.materials.join(", ")}
                  onChange={(v) => patch({ materials: v.split(",").map((m) => m.trim()).filter(Boolean) })}
                />
                <CopyBlock
                  label="Photo alt text"
                  hint={`${copy.altText.length}/125`}
                  overLimit={copy.altText.length > 125}
                  value={copy.altText}
                  onChange={(v) => patch({ altText: v })}
                />
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
