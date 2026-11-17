import type { MetadataRoute } from "next";
import { listCategories, listConcerns, listProducts } from "@/lib/catalog";
import { absoluteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, concerns] = await Promise.all([
    listProducts(),
    listCategories(),
    listConcerns(),
  ]);
  return [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/tienda"), changeFrequency: "daily", priority: 0.9 },
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
    ...products.map((p) => ({
      url: absoluteUrl(`/producto/${p.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.6,
      images: p.images.map((i) => absoluteUrl(i.src)),
    })),
  ];
}
