import type { Product, Taxon } from "@/lib/catalog/types";
import { Breadcrumbs } from "./breadcrumbs";
import { ConcernChips } from "./concern-chips";
import { ProductCard } from "./product-card";
import { JsonLd, breadcrumbLd, itemListLd } from "@/lib/seo";

/** Plantilla común de /categoria/[slug] y /preocupacion/[slug]. */
export function TaxonPage({
  kind,
  taxon,
  products,
  concerns,
}: {
  kind: "categoria" | "preocupacion" | "marca";
  taxon: Taxon;
  products: Product[];
  concerns: Taxon[];
}) {
  const crumbs = [
    { name: "Inicio", path: "/" },
    { name: "Tienda", path: "/tienda" },
    { name: taxon.name, path: `/${kind}/${taxon.slug}` },
  ];
  const concernNames = Object.fromEntries(concerns.map((c) => [c.slug, c.name]));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <Breadcrumbs items={crumbs} />
      <p className="mt-3 text-xs tracking-[0.18em] text-muted-foreground uppercase">
        {kind === "preocupacion" ? "Preocupación" : kind === "marca" ? "Marca" : "Categoría"}
      </p>
      <h1 className="mt-1 font-display text-4xl font-semibold sm:text-5xl">{taxon.name}</h1>
      <p className="mt-2 max-w-2xl text-lg text-muted-foreground">{taxon.description}</p>

      {kind === "preocupacion" ? (
        <ConcernChips concerns={concerns} active={taxon.slug} className="mt-6" />
      ) : null}

      <p className="mt-8 text-sm text-muted-foreground">
        {products.length} {products.length === 1 ? "producto" : "productos"}
      </p>
      {products.length ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p, i) => (
            <ProductCard
              key={p.slug}
              product={p}
              concernNames={concernNames}
              priority={i < 2}
              headingLevel="h2"
            />
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-2xl bg-mist p-6">Pronto vas a encontrar productos acá.</p>
      )}

      <JsonLd data={breadcrumbLd(crumbs)} />
      <JsonLd data={itemListLd(products)} />
    </main>
  );
}
