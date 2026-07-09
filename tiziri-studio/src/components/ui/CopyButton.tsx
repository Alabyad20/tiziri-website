import { useState } from "react";
import { copyText } from "@/lib/utils";
import { toast } from "@/stores/toast";
import { IconCheck, IconCopy } from "@/components/icons";
import { Button } from "./Button";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyText(text);
    if (!ok) {
      toast("Couldn't access the clipboard", "error");
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={handleCopy}
      icon={copied ? <IconCheck size={14} className="text-positive" /> : <IconCopy size={14} />}
      aria-label={`Copy ${label}`}
    >
      {copied ? "Copied" : label}
    </Button>
  );
}
