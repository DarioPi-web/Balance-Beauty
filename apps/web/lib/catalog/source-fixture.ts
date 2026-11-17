import "server-only";
import data from "./fixture.json";
import type { CatalogSnapshot } from "./types";

/**
 * Fuente de desarrollo: catálogo heredado de WooCommerce + fotos identificadas
 * (scripts/generate-catalog-fixture.mjs). Se usa mientras no haya Supabase local.
 */
export async function loadFixture(): Promise<CatalogSnapshot> {
  return data as CatalogSnapshot;
}
