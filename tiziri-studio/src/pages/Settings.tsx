import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Kbd";
import { useSettings, applyTheme, type Theme } from "@/stores/settings";
import { useActivity } from "@/stores/activity";
import { toast } from "@/stores/toast";
import { modKey } from "@/lib/utils";
import { IconKeyboard, IconTrash } from "@/components/icons";

const shortcuts: Array<{ keys: string[]; action: string }> = [
  { keys: [modKey, "K"], action: "Open command palette" },
  { keys: [modKey, "1"], action: "Dashboard" },
  { keys: [modKey, "2"], action: "Mockup Studio" },
  { keys: [modKey, "3"], action: "Listing Studio" },
  { keys: [modKey, "4"], action: "Naming Studio" },
  { keys: [modKey, "5"], action: "Designer PDF" },
  { keys: [modKey, "6"], action: "Social Studio" },
  { keys: [modKey, ","], action: "Settings" },
  { keys: [modKey, "Z"], action: "Undo (in any studio)" },
  { keys: [modKey, "⇧", "Z"], action: "Redo" },
  { keys: [modKey, "↵"], action: "Generate (in any studio)" },
];

export function Settings() {
  const s = useSettings();
  const clearActivity = useActivity((a) => a.clear);
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="animate-fade-up mx-auto max-w-3xl">
      <PageHeader
        title="Settings"
        description="Appearance, brand voice, and the API key that powers generation."
      />

      <div className="space-y-4">
        <Card>
          <CardHeader
            title="Appearance"
            description="Studio follows your choice everywhere, instantly."
          />
          <div className="px-6 pb-6">
            <Segmented<Theme>
              value={s.theme}
              onChange={(t) => {
                s.setTheme(t);
                applyTheme(t);
              }}
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
                { value: "system", label: "System" },
              ]}
            />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Generation"
            description="Listing, naming and social copy are written by Claude. Your key is stored only on this machine."
          />
          <div className="space-y-4 px-6 pb-6">
            <Field label="Anthropic API key" hint="console.anthropic.com → API keys">
              <div className="flex gap-2">
                <Input
                  type={showKey ? "text" : "password"}
                  value={s.apiKey}
                  onChange={(e) => s.setApiKey(e.target.value.trim())}
                  placeholder="sk-ant-…"
                  autoComplete="off"
                  spellCheck={false}
                />
                <Button variant="ghost" onClick={() => setShowKey((v) => !v)}>
                  {showKey ? "Hide" : "Show"}
                </Button>
              </div>
            </Field>
            <p className="text-[13px] leading-relaxed text-ink-3">
              Without a key, the studios fall back to built-in structured templates — still
              usable, just less tailored.
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Brand"
            description="Injected into every prompt so all copy sounds like one house."
          />
          <div className="space-y-4 px-6 pb-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Brand name">
                <Input value={s.brandName} onChange={(e) => s.setBrandName(e.target.value)} />
              </Field>
              <Field label="Website">
                <Input value={s.websiteUrl} onChange={(e) => s.setWebsiteUrl(e.target.value)} />
              </Field>
            </div>
            <Field label="Voice notes">
              <Textarea
                value={s.brandVoice}
                onChange={(e) => s.setBrandVoice(e.target.value)}
                rows={3}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <IconKeyboard size={16} className="text-ink-3" /> Keyboard shortcuts
              </span>
            }
          />
          <ul className="grid gap-x-8 px-6 pb-6 sm:grid-cols-2">
            {shortcuts.map((sc) => (
              <li
                key={sc.action}
                className="flex items-center justify-between border-b border-line/60 py-2.5 last:border-0 sm:nth-last-2:border-0"
              >
                <span className="text-[13px] text-ink-2">{sc.action}</span>
                <span className="flex items-center gap-1">
                  {sc.keys.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Internal tools"
            description="For setting up the studio itself — not part of the daily workflow."
          />
          <div className="px-6 pb-6">
            <Link
              to="/calibrate"
              className="text-sm font-medium text-accent underline-offset-2 hover:underline"
            >
              Room calibration — turn a photo into a mockup room →
            </Link>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Data"
            description="Everything Studio saves lives in this browser. Nothing is sent anywhere except generation calls."
          />
          <div className="px-6 pb-6">
            <Button
              variant="danger"
              icon={<IconTrash size={15} />}
              onClick={() => {
                clearActivity();
                toast("Recent projects and exports cleared");
              }}
            >
              Clear recent activity
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
