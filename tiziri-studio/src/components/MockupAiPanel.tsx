import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import type { RugAnalysis } from "@/lib/rugAnalysis";
import { IconRefresh, IconWand } from "@/components/icons";

const confidenceDot: Record<string, string> = {
  high: "bg-positive",
  medium: "bg-accent",
  low: "bg-ink-3",
};

const sourceLabel: Record<RugAnalysis["source"], string> = {
  ai: "Claude vision",
  local: "On-device",
  catalog: "Catalog facts",
};

function Why({ children }: { children: string }) {
  return <p className="mt-0.5 text-[11.5px] leading-snug text-ink-3">{children}</p>;
}

/**
 * The guided layer: what the AI saw, and what it set up for you.
 * Everything here is already applied — clicking alternatives re-applies.
 */
export function MockupAiPanel({
  analysis,
  analyzing,
  activeSceneId,
  activePresets,
  onPickRoom,
  onTogglePreset,
  onReanalyze,
}: {
  analysis: RugAnalysis | null;
  analyzing: boolean;
  activeSceneId: string;
  activePresets: string[];
  onPickRoom: (id: string) => void;
  onTogglePreset: (id: string) => void;
  onReanalyze: () => void;
}) {
  if (!analysis && !analyzing) return null;

  return (
    <Card className="border-accent/30 pb-5">
      <div className="flex items-center justify-between px-5 pt-4 pb-1">
        <span className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <IconWand size={15} className="text-accent" />
          AI recommendations
        </span>
        {analysis && <Badge tone={analysis.source === "local" ? "neutral" : "accent"}>{sourceLabel[analysis.source]}</Badge>}
      </div>

      {analyzing || !analysis ? (
        <div className="flex items-center gap-2.5 px-5 py-4 text-[13px] text-ink-2">
          <Spinner size={15} className="text-accent" />
          Reading the rug — style, pile, size, palette…
        </div>
      ) : (
        <div className="space-y-4 px-5 pt-2">
          {/* What the AI read */}
          <div>
            <p className="text-[13.5px] leading-relaxed text-ink">
              Reads as a{" "}
              <span className="font-semibold">
                {analysis.profile.style === "Unknown" ? "Moroccan rug" : `${analysis.profile.style}`}
              </span>
              <span
                className={cn("mx-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle", confidenceDot[analysis.profile.styleConfidence])}
                title={`${analysis.profile.styleConfidence} confidence`}
              />
              {analysis.profile.pile === "flat" ? "flat-woven" : `${analysis.profile.pile} pile`},{" "}
              {analysis.profile.fringe ? "fringed ends" : "clean ends"}, about{" "}
              <span className="font-semibold">
                {analysis.profile.widthCm} × {analysis.profile.lengthCm} cm
              </span>{" "}
              ({analysis.orientation}).
            </p>
            <Why>{analysis.profile.styleReason}</Why>
            <Why>{analysis.profile.dimensionsReason}</Why>
            <div className="mt-2 flex overflow-hidden rounded-lg border border-line">
              {analysis.palette.map((s) => (
                <span key={s.hex} className="h-4 flex-1" style={{ backgroundColor: s.hex }} title={`${s.name} ${s.hex}`} />
              ))}
            </div>
          </div>

          {/* Rooms */}
          <div>
            <p className="mb-1.5 text-[12px] font-semibold tracking-wide text-ink-2 uppercase">Best rooms</p>
            <div className="space-y-1.5">
              {analysis.rooms.map((room, i) => (
                <button
                  key={room.id}
                  onClick={() => onPickRoom(room.id)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2 text-left transition-all",
                    activeSceneId === room.id
                      ? "border-accent bg-accent-soft/60"
                      : "border-line hover:border-line-strong",
                  )}
                >
                  <span className="flex items-center justify-between text-[13px] font-medium text-ink">
                    {room.label}
                    {i === 0 && activeSceneId === room.id && (
                      <span className="text-[10.5px] font-semibold tracking-wide text-accent uppercase">applied</span>
                    )}
                  </span>
                  <Why>{room.reason}</Why>
                </button>
              ))}
            </div>
          </div>

          {/* Furniture */}
          <div>
            <p className="mb-1 text-[12px] font-semibold tracking-wide text-ink-2 uppercase">Style the room with</p>
            <p className="text-[12.5px] leading-relaxed text-ink-2">{analysis.furniture}</p>
          </div>

          {/* Exports */}
          <div>
            <p className="mb-1.5 text-[12px] font-semibold tracking-wide text-ink-2 uppercase">Export for</p>
            <div className="space-y-1.5">
              {analysis.exports.map((e) => (
                <button
                  key={e.id}
                  onClick={() => onTogglePreset(e.id)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2 text-left transition-all",
                    activePresets.includes(e.id)
                      ? "border-accent bg-accent-soft/60"
                      : "border-line opacity-70 hover:border-line-strong hover:opacity-100",
                  )}
                  aria-pressed={activePresets.includes(e.id)}
                >
                  <span className="text-[13px] font-medium text-ink">{e.label}</span>
                  <Why>{e.reason}</Why>
                </button>
              ))}
            </div>
          </div>

          {/* Marketplace */}
          <div>
            <p className="mb-1 text-[12px] font-semibold tracking-wide text-ink-2 uppercase">Lead marketplace</p>
            <p className="text-[13px] font-medium text-ink">{analysis.marketplace.label}</p>
            <Why>{analysis.marketplace.reason}</Why>
          </div>

          <div className="flex items-center justify-between border-t border-line pt-3">
            <span className="text-[11px] text-ink-3">Applied for you — every control below stays editable.</span>
            <Button size="sm" variant="ghost" icon={<IconRefresh size={13} />} onClick={onReanalyze}>
              Re-analyze
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
