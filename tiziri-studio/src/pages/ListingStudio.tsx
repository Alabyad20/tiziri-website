import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { RugPicker } from "@/components/RugPicker";
import type { Rug } from "@/lib/rugs";
import { IconListing } from "@/components/icons";

export function ListingStudio() {
  const [rug, setRug] = useState<Rug | null>(null);

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Listing Studio"
        description="Turn a rug into complete marketplace copy — title, description, tags and materials."
      />
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader title="Rug" description="Start from the live catalog." />
          <div className="px-6 pb-6">
            <RugPicker value={rug} onChange={setRug} />
          </div>
        </Card>
        <Card>
          <EmptyState
            icon={<IconListing size={20} />}
            title="Generated copy appears here"
            description="Pick a rug and generate — every block is editable with one-click copy."
          />
        </Card>
      </div>
    </div>
  );
}
