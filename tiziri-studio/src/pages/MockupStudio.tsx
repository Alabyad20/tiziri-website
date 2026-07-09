import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Dropzone } from "@/components/ui/Dropzone";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconMockup } from "@/components/icons";

export function MockupStudio() {
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Mockup Studio"
        description="Stage any rug photo in a styled interior — ready for Etsy, the site, or a client email."
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <div className="p-6">
            <Dropzone onImage={() => {}} />
          </div>
        </Card>
        <Card>
          <EmptyState
            icon={<IconMockup size={20} />}
            title="Room scenes"
            description="Upload a rug to choose a room and stage it."
          />
        </Card>
      </div>
    </div>
  );
}
