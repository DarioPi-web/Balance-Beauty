import { Suspense } from "react";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { FiltersView } from "@/components/shop/filters-view";
import { ProductCard } from "@/components/shop/product-card";
import { ProductFilters } from "@/components/shop/product-filters";
import { listCategories, listConcerns, listProducts, sortProducts } from "@/lib/catalog";
import { JsonLd, breadcrumbLd, itemListLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Tienda de dermocosmética",
  description:
    "Serums, protectores solares, despigmentantes, limpieza y nutricosmética. Elegí por preocupación de tu piel. 10 % off con transferencia y cuotas sin interés.",
  alternates: { canonical: "/tienda" },
};

export default async function TiendaPage() {
  const [products, categories, concerns] = await Promise.all([
    listProducts(),
    listCategories(),
    listConcerns(),
  ]);
  const items = sortProducts(products);
  const concernNames = Object.fromEntries(concerns.map((c) => [c.slug, c.name]));
  const crumbs = [
    { name: "Inicio", path: "/" },
    { name: "Tienda", path: "/tienda" },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <Breadcrumbs items={crumbs} />
      <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">Tienda</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Dermocosmética para cada necesidad. Filtrá por lo que le pasa a tu piel o por tipo de
        producto.
      </p>

      <div className="mt-8">
        {/* Mismo markup en servidor y cliente: el reemplazo no mueve nada */}
        <Suspense
          fallback={
            <FiltersView categories={categories} concerns={concerns} total={items.length} />
          }
        >
          <ProductFilters
            categories={categories}
            concerns={concerns}
            index={items.map((p) => ({ c: p.categories, k: p.concerns }))}
          />
        </Suspense>
      </div>

      {/* Grilla 100 % HTML del servidor (Google, IAs, sin JS). Los filtros solo ocultan/reordenan. */}
      <div
        id="product-grid"
        className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4"
      >
        {items.map((p, i) => (
          <div
            key={p.slug}
            data-product
            data-categories={p.categories.join(" ")}
            data-concerns={p.concerns.join(" ")}
            data-price={p.price}
            data-name={p.name}
            data-rank={i}
            className={`flex *:w-full [&[hidden]]:hidden ${i >= 8 ? "[contain-intrinsic-size:auto_420px] [content-visibility:auto]" : ""}`}
          >
            <ProductCard
              product={p}
              concernNames={concernNames}
              priority={i < 2}
              headingLevel="h2"
            />
          </div>
        ))}
      </div>
      <p
        id="product-empty"
        hidden
        className="mt-10 rounded-2xl bg-mist p-8 text-center font-display text-2xl font-semibold"
      >
        No encontramos productos con esos filtros.
      </p>

      <JsonLd data={breadcrumbLd(crumbs)} />
      <JsonLd data={itemListLd(items)} />
    </main>
  );
}
