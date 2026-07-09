import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useActivity, studioMeta } from "@/stores/activity";
import { catalog, inStockRugs, rugStyles } from "@/lib/rugs";
import { timeAgo } from "@/lib/utils";
import {
  IconArrowRight,
  IconHistory,
  IconListing,
  IconMockup,
  IconNaming,
  IconPdf,
  IconSocial,
} from "@/components/icons";

const quickActions = [
  {
    to: "/mockup",
    icon: IconMockup,
    title: "Stage a rug",
    description: "Drop a photo into a styled room scene",
  },
  {
    to: "/listing",
    icon: IconListing,
    title: "Write a listing",
    description: "Etsy, eBay and website copy in one pass",
  },
  {
    to: "/naming",
    icon: IconNaming,
    title: "Name a new arrival",
    description: "Name, story and palette from a photo",
  },
  {
    to: "/pdf",
    icon: IconPdf,
    title: "Designer tear sheet",
    description: "A printable spec sheet for the trade",
  },
  {
    to: "/social",
    icon: IconSocial,
    title: "Social posts",
    description: "Instagram, Pinterest, Facebook, email",
  },
];

export function Dashboard() {
  const { projects, exports } = useActivity();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="animate-fade-up">
      <PageHeader
        title={greeting}
        description={`${catalog.length} rugs in the catalog · ${inStockRugs.length} in stock across ${rugStyles.length} weaving styles.`}
      />

      {/* Quick actions */}
      <section aria-label="Quick actions" className="mb-10 grid grid-cols-2 gap-3 xl:grid-cols-5">
        {quickActions.map(({ to, icon: Icon, title, description }) => (
          <Link
            key={to}
            to={to}
            className="group rounded-2xl border border-line bg-surface p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift"
          >
            <div className="mb-6 flex h-9 w-9 items-center justify-center rounded-xl bg-surface-2 text-ink-2 transition-colors group-hover:bg-accent-soft group-hover:text-accent">
              <Icon size={17} />
            </div>
            <p className="text-[13.5px] font-semibold text-ink">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-3">{description}</p>
          </Link>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent projects */}
        <Card>
          <CardHeader
            title="Recent projects"
            description="Everything autosaves — pick up where you left off."
          />
          {projects.length === 0 ? (
            <EmptyState
              icon={<IconHistory size={20} />}
              title="No projects yet"
              description="Work you start in any studio shows up here automatically."
              className="py-10"
            />
          ) : (
            <ul className="px-3 pb-3">
              {projects.slice(0, 6).map((p) => (
                <li key={p.id}>
                  <Link
                    to={studioMeta[p.studio].route}
                    className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{p.title}</p>
                      <p className="mt-0.5 truncate text-xs text-ink-3">
                        {studioMeta[p.studio].label}
                        {p.subtitle ? ` · ${p.subtitle}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-ink-3">{timeAgo(p.at)}</span>
                    <IconArrowRight
                      size={14}
                      className="shrink-0 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Recent exports */}
        <Card>
          <CardHeader
            title="Recent exports"
            description="Images, PDFs and copy you've shipped out of the studio."
          />
          {exports.length === 0 ? (
            <EmptyState
              icon={<IconArrowRight size={20} />}
              title="Nothing exported yet"
              description="Exports from every studio land here with a timestamp."
              className="py-10"
            />
          ) : (
            <ul className="px-3 pb-3">
              {exports.slice(0, 6).map((e) => (
                <li key={e.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{e.title}</p>
                    <p className="mt-0.5 text-xs text-ink-3">{studioMeta[e.studio].label}</p>
                  </div>
                  <Badge>{e.kind}</Badge>
                  <span className="shrink-0 text-xs text-ink-3">{timeAgo(e.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Collections — live from the catalog */}
      <section className="mt-4">
        <Card>
          <CardHeader
            title="Collections"
            description="The live tizirirugs.com catalog, grouped by weaving tradition."
          />
          <div className="grid grid-cols-2 gap-3 px-6 pb-6 md:grid-cols-3 xl:grid-cols-4">
            {rugStyles.map((style) => {
              const rugs = catalog.filter((r) => r.style === style);
              const cover = rugs.find((r) => r.images.length > 0)?.images[0];
              return (
                <Link
                  key={style}
                  to={`/listing?style=${encodeURIComponent(style)}`}
                  className="group overflow-hidden rounded-xl border border-line bg-surface-2/50 transition-all hover:border-line-strong hover:shadow-soft"
                >
                  <div className="aspect-[5/3] overflow-hidden bg-surface-2">
                    {cover && (
                      <img
                        src={cover}
                        alt={`${style} rug`}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <span className="text-[13px] font-semibold text-ink">{style}</span>
                    <span className="text-xs text-ink-3">
                      {rugs.length} rug{rugs.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      </section>
    </div>
  );
}
