import type { Product } from "@/lib/catalog/types";
import { site } from "@/lib/site";
import { brand } from "@/lib/brand";

/** JSON‑LD seguro (escapa "<" para evitar cortar el <script>). */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export const absoluteUrl = (path: string) => new URL(path, site.url).toString();

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brand.name,
    url: site.url,
    logo: absoluteUrl("/icons/icon-512.png"),
    sameAs: Object.values(site.social),
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

export function itemListLd(products: Product[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(`/producto/${p.slug}`),
      name: p.name,
    })),
  };
}

/** Product + Offer. Solo datos visibles en la página (requisito de Google y de las IAs). */
export function productLd(p: Product) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.sku,
    ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
    ...(p.description ? { description: p.description.slice(0, 500) } : {}),
    image: p.images.map((i) => absoluteUrl(i.src)),
    url: absoluteUrl(`/producto/${p.slug}`),
    offers: {
      "@type": "Offer",
      price: p.price,
      priceCurrency: "ARS",
      availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      url: absoluteUrl(`/producto/${p.slug}`),
      seller: { "@type": "Organization", name: brand.name },
    },
  };
}
