import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TaxonPage } from "@/components/shop/taxon-page";
import {
  getCategory,
  listCategories,
  listConcerns,
  listProducts,
  sortProducts,
} from "@/lib/catalog";

export async function generateStaticParams() {
  return (await listCategories()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/categoria/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCategory(slug);
  if (!c) return {};
  return {
    title: `${c.name} — dermocosmética`,
    description: `${c.description} Comprá online con 10 % off por transferencia y cuotas sin interés.`,
    alternates: { canonical: `/categoria/${c.slug}` },
  };
}

export default async function CategoriaPage({ params }: PageProps<"/categoria/[slug]">) {
  const { slug } = await params;
  const [category, products, concerns] = await Promise.all([
    getCategory(slug),
    listProducts({ category: slug }),
    listConcerns(),
  ]);
  if (!category) notFound();
  return (
    <TaxonPage
      kind="categoria"
      taxon={category}
      products={sortProducts(products)}
      concerns={concerns}
    />
  );
}
