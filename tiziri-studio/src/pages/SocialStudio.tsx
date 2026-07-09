import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Segmented } from "@/components/ui/Segmented";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { RugPicker } from "@/components/RugPicker";
import { rugBySlug, heroImage, type Rug } from "@/lib/rugs";
import { generateSocial, type SocialCopy } from "@/lib/generators/social";
import { useSocial, type SocialTab } from "@/stores/social";
import { useUndoRedo } from "@/lib/useUndoRedo";
import { useActivity } from "@/stores/activity";
import { toast } from "@/stores/toast";
import { AiError } from "@/lib/ai";
import { cn, modKey } from "@/lib/utils";
import { Kbd } from "@/components/ui/Kbd";
import { IconRedo, IconSocial, IconUndo, IconWand } from "@/components/icons";

function FieldBlock({
  label,
  value,
  limit,
  rows,
  onChange,
  copyValue,
}: {
  label: string;
  value: string;
  limit?: number;
  rows?: number;
  onChange: (v: string) => void;
  copyValue?: string;
}) {
  const over = limit !== undefined && value.length > limit;
  return (
    <div className="border-b border-line px-6 py-4 last:border-0">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[13px] font-medium text-ink">
          {label}
          {limit !== undefined && (
            <span className={cn("ml-2 text-xs font-normal", over ? "text-danger" : "text-ink-3")}>
              {value.length}/{limit}
            </span>
          )}
        </span>
        <CopyButton text={copyValue ?? value} />
      </div>
      {rows ? (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

export function SocialStudio() {
  const s = useSocial();
  const [busy, setBusy] = useState(false);
  const logProject = useActivity((a) => a.logProject);
  const logExport = useActivity((a) => a.logExport);
  const { undo, redo, canUndo, canRedo } = useUndoRedo(useSocial);

  const rug = useMemo(() => (s.rugSlug ? (rugBySlug(s.rugSlug) ?? null) : null), [s.rugSlug]);

  async function handleGenerate() {
    if (!rug) {
      toast("Pick a rug first", "error");
      return;
    }
    setBusy(true);
    try {
      const { copy, source } = await generateSocial(rug, s.notes);
      s.setCopy(copy, source);
      logProject({
        id: `social-${rug.slug}`,
        studio: "social",
        title: rug.name,
        subtitle: "IG · Pinterest · FB · Email",
      });
      logExport({ studio: "social", title: rug.name, kind: "Copy" });
      toast(source === "ai" ? "Posts written for all four channels" : "Template posts built — add an API key for tailored copy");
    } catch (e) {
      toast(e instanceof AiError ? e.message : "Generation failed", "error");
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
  }, [busy, s.rugSlug, s.notes]);

  const c = s.copy;
  const patch = (p: Partial<SocialCopy>) => s.patchCopy(p);
  const hashtagText = c ? c.igHashtags.map((h) => `#${h}`).join(" ") : "";

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Social Studio"
        description="One rug, four channels — Instagram, Pinterest, Facebook and email, in the house voice."
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

      <div className="grid items-start gap-4 xl:grid-cols-[360px_1fr]">
        {/* Inputs */}
        <Card>
          <CardHeader title="Rug" description="Pick the piece to post." />
          <div className="space-y-4 px-6 pb-6">
            <RugPicker value={rug} onChange={(r: Rug) => s.setRugSlug(r.slug)} />
            {rug && (
              <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/50 p-2.5">
                <img src={heroImage(rug)} alt="" className="h-12 w-12 rounded-lg object-cover" />
                <div className="min-w-0 text-[13px]">
                  <p className="font-medium text-ink">{rug.name}</p>
                  <p className="truncate text-xs text-ink-3">
                    {rug.style} · {rug.dimensions.split("(")[0].trim()} · ${rug.price}
                  </p>
                </div>
              </div>
            )}
            <Field label="Angle for this post" hint="optional">
              <Textarea
                value={s.notes}
                onChange={(e) => s.setNotes(e.target.value)}
                rows={3}
                placeholder="Just arrived / last chance / styled in the bedroom scene…"
              />
            </Field>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              loading={busy}
              disabled={!rug}
              icon={<IconWand size={16} />}
              onClick={() => void handleGenerate()}
            >
              {c ? "Regenerate posts" : "Write the posts"}
              <span className="ml-1 hidden items-center gap-0.5 opacity-70 sm:flex">
                <Kbd>{modKey}</Kbd>
                <Kbd>↵</Kbd>
              </span>
            </Button>
          </div>
        </Card>

        {/* Output */}
        <Card className="overflow-hidden">
          {!c ? (
            <EmptyState
              icon={<IconSocial size={20} />}
              title="Posts appear here"
              description="Per-platform copy with character counts and one-click copy — captions, hashtags, pins, posts and a newsletter feature."
              className="py-24"
            />
          ) : (
            <>
              <CardHeader
                title="Channel copy"
                description="Everything editable — autosaved, undo with ⌘Z."
                action={
                  s.source && (
                    <Badge tone={s.source === "ai" ? "accent" : "neutral"}>
                      {s.source === "ai" ? "Written by Claude" : "Template"}
                    </Badge>
                  )
                }
              />
              <div className="border-b border-line px-6 pb-4">
                <Segmented<SocialTab>
                  value={s.tab}
                  onChange={s.setTab}
                  options={[
                    { value: "instagram", label: "Instagram" },
                    { value: "pinterest", label: "Pinterest" },
                    { value: "facebook", label: "Facebook" },
                    { value: "email", label: "Email" },
                  ]}
                />
              </div>

              {s.tab === "instagram" && (
                <div>
                  <FieldBlock
                    label="Caption"
                    value={c.igCaption}
                    limit={2200}
                    rows={9}
                    onChange={(v) => patch({ igCaption: v })}
                  />
                  <div className="px-6 py-4">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[13px] font-medium text-ink">
                        Hashtags
                        <span className={cn("ml-2 text-xs font-normal", c.igHashtags.length > 30 ? "text-danger" : "text-ink-3")}>
                          {c.igHashtags.length}/30
                        </span>
                      </span>
                      <CopyButton text={hashtagText} />
                    </div>
                    <Textarea
                      value={hashtagText}
                      onChange={(e) =>
                        patch({
                          igHashtags: e.target.value
                            .split(/[\s,]+/)
                            .map((h) => h.replace(/^#/, ""))
                            .filter(Boolean),
                        })
                      }
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {s.tab === "pinterest" && (
                <div>
                  <FieldBlock label="Pin title" value={c.pinTitle} limit={100} onChange={(v) => patch({ pinTitle: v })} />
                  <FieldBlock
                    label="Pin description"
                    value={c.pinDescription}
                    limit={500}
                    rows={6}
                    onChange={(v) => patch({ pinDescription: v })}
                  />
                </div>
              )}

              {s.tab === "facebook" && (
                <FieldBlock label="Page post" value={c.fbPost} rows={9} onChange={(v) => patch({ fbPost: v })} />
              )}

              {s.tab === "email" && (
                <div>
                  <FieldBlock
                    label="Subject"
                    value={c.emailSubject}
                    limit={60}
                    onChange={(v) => patch({ emailSubject: v })}
                  />
                  <FieldBlock
                    label="Preheader"
                    value={c.emailPreheader}
                    limit={90}
                    onChange={(v) => patch({ emailPreheader: v })}
                  />
                  <FieldBlock label="Body" value={c.emailBody} rows={9} onChange={(v) => patch({ emailBody: v })} />
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
