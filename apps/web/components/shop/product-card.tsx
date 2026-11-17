import Link from "next/link";
import type { Product } from "@/lib/catalog/types";
import { PriceBlock } from "./price-block";
import { ProductMedia } from "./product-media";

export type ProductCardData = Pick<
  Product,
  "slug" | "name" | "brand" | "price" | "compareAtPrice" | "inStock" | "images" | "concerns"
>;

/** Tarjeta de producto. Pura (sin hooks): sirve en Server y Client Components. */
export function ProductCard({
  product,
  concernNames,
  priority,
  headingLevel = "h3",
}: {
  product: ProductCardData;
  concernNames?: Record<string, string>;
  priority?: boolean;
  /** h2 cuando la grilla cuelga directo del h1 de la página (orden de encabezados, a11y). */
  headingLevel?: "h2" | "h3";
}) {
  const concern = product.concerns[0] && concernNames?.[product.concerns[0]];
  const Heading = headingLevel;
  return (
    <article className="group @container relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-[0_8px_30px_-12px_rgb(20_35_28/0.25)]">
      <ProductMedia
        image={product.images[0]}
        name={product.name}
        brand={product.brand}
        priority={priority}
        zoom
        sizes="(min-width: 1280px) 400px, (min-width: 768px) 45vw, 75vw"
        className="aspect-square"
      />
      <div className="flex flex-1 flex-col gap-1 p-3 @[220px]:p-4">
        <p className="truncate text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
          {[product.brand, concern].filter(Boolean).join(" · ") || "Balance"}
        </p>
        <Heading className="font-display text-lg leading-snug font-semibold @[220px]:text-xl">
          {/* Link "estirado": su ::after cubre toda la tarjeta, que es el área táctil real */}
          <Link
            href={`/producto/${product.slug}`}
            prefetch={false} // precarga al pasar el mouse/tocar: no compite con el LCP de grillas largas
            data-stretched-link
            className="after:absolute after:inset-0 focus-visible:outline-none"
          >
            {product.name}
          </Link>
        </Heading>
        <PriceBlock
          price={product.price}
          compareAtPrice={product.compareAtPrice}
          className="mt-auto pt-2"
        />
        {!product.inStock ? <p className="text-sm font-medium text-alert">Sin stock</p> : null}
      </div>
    </article>
  );
}
