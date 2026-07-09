import type { Rug } from "@/lib/rugs";
import { heroImage } from "@/lib/rugs";
import { useSettings } from "@/stores/settings";

/**
 * The printable A4 tear sheet. Deliberately theme-independent — it is a
 * paper document, so every color is fixed (cream paper, warm ink) and all
 * dimensions are in millimeters so screen preview and print match 1:1.
 */
export function TearSheet({
  rug,
  story,
  designerNotes,
  showPrice,
}: {
  rug: Rug;
  story: string;
  designerNotes: string;
  showPrice: boolean;
}) {
  const { brandName, websiteUrl } = useSettings();
  const site = websiteUrl.replace(/^https?:\/\//, "");
  const secondImage = rug.images[1];

  const specs: Array<[string, string]> = [
    ["Size", rug.dimensions],
    ["Material", rug.material],
    ["Pile", rug.pile],
    ["Age", rug.age],
    ["Origin", rug.origin],
  ];
  if (showPrice) specs.push(["Price", `$${rug.price.toLocaleString()} USD · free worldwide shipping`]);

  return (
    <div
      className="relative flex flex-col overflow-hidden font-sans"
      style={{
        width: "210mm",
        height: "296mm",
        backgroundColor: "#fbf8f1",
        color: "#2a2520",
        padding: "16mm 16mm 12mm",
      }}
    >
      {/* Masthead */}
      <header
        className="flex items-baseline justify-between"
        style={{ borderBottom: "0.4mm solid #2a2520", paddingBottom: "4mm" }}
      >
        <span
          className="font-display font-semibold"
          style={{ fontSize: "17pt", letterSpacing: "0.02em" }}
        >
          {brandName}
        </span>
        <span style={{ fontSize: "8pt", letterSpacing: "0.28em", color: "#6f6557" }}>
          DESIGNER TEAR SHEET ·{" "}
          {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </span>
      </header>

      {/* Imagery */}
      <div className="flex" style={{ gap: "5mm", marginTop: "8mm", height: "108mm" }}>
        <img
          src={heroImage(rug)}
          alt={`${rug.name} — ${rug.style} Moroccan rug`}
          className="h-full min-w-0 flex-1 object-cover"
          style={{ borderRadius: "1.5mm" }}
        />
        {secondImage && (
          <img
            src={secondImage}
            alt={`${rug.name}, detail`}
            className="h-full object-cover"
            style={{ width: "58mm", borderRadius: "1.5mm" }}
          />
        )}
      </div>

      {/* Name */}
      <div style={{ marginTop: "9mm" }}>
        <div className="flex items-baseline justify-between">
          <h1 className="font-display font-semibold" style={{ fontSize: "34pt", lineHeight: 1 }}>
            {rug.name}
          </h1>
          <span
            style={{ fontSize: "9pt", letterSpacing: "0.22em", color: "#a15a38" }}
            className="uppercase"
          >
            {rug.style} · One of One
          </span>
        </div>
        <p style={{ fontSize: "10.5pt", lineHeight: 1.65, marginTop: "4mm", maxWidth: "165mm", color: "#42392f" }}>
          {story}
        </p>
        {designerNotes && (
          <p
            style={{
              fontSize: "9.5pt",
              lineHeight: 1.6,
              marginTop: "3.5mm",
              paddingLeft: "4mm",
              borderLeft: "0.8mm solid #a15a38",
              color: "#6f6557",
              maxWidth: "160mm",
            }}
          >
            {designerNotes}
          </p>
        )}
      </div>

      {/* Specifications */}
      <div style={{ marginTop: "auto" }}>
        <div
          className="grid grid-cols-3"
          style={{ borderTop: "0.4mm solid #2a2520", paddingTop: "5mm", gap: "4.5mm 8mm" }}
        >
          {specs.map(([label, value]) => (
            <div key={label}>
              <div
                className="uppercase"
                style={{ fontSize: "6.5pt", letterSpacing: "0.24em", color: "#a2977f", marginBottom: "1.2mm" }}
              >
                {label}
              </div>
              <div style={{ fontSize: "9.5pt", lineHeight: 1.4 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer
          className="flex items-center justify-between"
          style={{
            marginTop: "6mm",
            paddingTop: "3.5mm",
            borderTop: "0.2mm solid #d2c7b2",
            fontSize: "8pt",
            color: "#6f6557",
          }}
        >
          <span>
            Hand-woven by Amazigh artisans in the Atlas Mountains. Each piece is the one photographed.
          </span>
          <span style={{ letterSpacing: "0.08em" }}>{site}</span>
        </footer>
      </div>
    </div>
  );
}
