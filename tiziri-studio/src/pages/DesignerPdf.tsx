import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { RugPicker } from "@/components/RugPicker";
import type { Rug } from "@/lib/rugs";
import { IconPdf } from "@/components/icons";

export function DesignerPdf() {
  const [rug, setRug] = useState<Rug | null>(null);

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Designer PDF"
        description="A printable tear sheet for interior designers — specs, story, and imagery on one page."
      />
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader title="Rug" description="Pick the piece to sheet." />
          <div className="px-6 pb-6">
            <RugPicker value={rug} onChange={setRug} />
          </div>
        </Card>
        <Card>
          <EmptyState
            icon={<IconPdf size={20} />}
            title="Tear sheet preview"
            description="Choose a rug to lay out its printable sheet."
          />
        </Card>
      </div>
    </div>
  );
}
