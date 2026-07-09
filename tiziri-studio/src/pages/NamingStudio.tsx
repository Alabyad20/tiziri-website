import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Dropzone } from "@/components/ui/Dropzone";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconNaming } from "@/components/icons";

export function NamingStudio() {
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Naming Studio"
        description="A new arrival gets its name, collection, story and color palette — from one photo."
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card className="p-6">
          <Dropzone onImage={() => {}} />
        </Card>
        <Card>
          <EmptyState
            icon={<IconNaming size={20} />}
            title="Identity appears here"
            description="Name, collection, story and palette — all editable."
          />
        </Card>
      </div>
    </div>
  );
}
