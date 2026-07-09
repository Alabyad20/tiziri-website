import catalogJson from "@catalog";
import { decodeEntities } from "./utils";

export interface Rug {
  slug: string;
  name: string;
  style: string;
  category: string;
  description: string;
  origin: string;
  dimensions: string;
  material: string;
  pile: string;
  age: string;
  price: number;
  currency: string;
  availability: string;
  images: string[];
  color: string;
}

/**
 * The live Tiziri catalog — imported straight from the site's data/rugs.json
 * so Studio always reflects what is actually for sale.
 */
export const catalog: Rug[] = (catalogJson as Rug[]).map((r) => ({
  ...r,
  dimensions: decodeEntities(r.dimensions),
  description: decodeEntities(r.description),
}));

export const inStockRugs = catalog.filter((r) => r.availability === "InStock");

export function rugBySlug(slug: string): Rug | undefined {
  return catalog.find((r) => r.slug === slug);
}

export const rugStyles = [...new Set(catalog.map((r) => r.style))].sort();

export function heroImage(rug: Rug): string | undefined {
  return rug.images[0];
}
