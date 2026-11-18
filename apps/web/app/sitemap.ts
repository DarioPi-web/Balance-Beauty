import type { MetadataRoute } from "next";
import { listBrands, listCategories, listConcerns, listProducts } from "@/lib/catalog";
import { publicImageUrl } from "@/lib/image-loader";
import { absoluteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, concerns, brands] = await Promise.all([
    listProducts(),
    listCategories(),
    listConcerns(),
    listBrands(),
  ]);
  return [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/tienda"), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/rutina"), changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/promociones"), changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/contacto"), changeFrequency: "yearly", priority: 0.3 },
    ...concerns.map((c) => ({
      url: absoluteUrl(`/preocupacion/${c.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...categories.map((c) => ({
      url: absoluteUrl(`/categoria/${c.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...brands.map((b) => ({
      url: absoluteUrl(`/marca/${b.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...products.map((p) => ({
      url: absoluteUrl(`/producto/${p.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.6,
      images: p.images.map((i) => absoluteUrl(publicImageUrl(i.src))),
    })),
  ];
}
