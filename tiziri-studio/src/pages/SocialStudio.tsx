import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { RugPicker } from "@/components/RugPicker";
import type { Rug } from "@/lib/rugs";
import { IconSocial } from "@/components/icons";

export function SocialStudio() {
  const [rug, setRug] = useState<Rug | null>(null);

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Social Studio"
        description="One rug, four channels — Instagram, Pinterest, Facebook and email, in the house voice."
      />
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader title="Rug" description="Pick the piece to post." />
          <div className="px-6 pb-6">
            <RugPicker value={rug} onChange={setRug} />
          </div>
        </Card>
        <Card>
          <EmptyState
            icon={<IconSocial size={20} />}
            title="Posts appear here"
            description="Per-platform copy with character counts and one-click copy."
          />
        </Card>
      </div>
    </div>
  );
}
