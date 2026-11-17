import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TaxonPage } from "@/components/shop/taxon-page";
import { getConcern, listConcerns, listProducts, sortProducts } from "@/lib/catalog";

export async function generateStaticParams() {
  return (await listConcerns()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/preocupacion/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = await getConcern(slug);
  if (!c) return {};
  return {
    title: `${c.name}: productos para tu piel`,
    description: `${c.description} Productos dermocosméticos seleccionados para ${c.name.toLowerCase()}.`,
    alternates: { canonical: `/preocupacion/${c.slug}` },
  };
}

export default async function PreocupacionPage({ params }: PageProps<"/preocupacion/[slug]">) {
  const { slug } = await params;
  const [concern, products, concerns] = await Promise.all([
    getConcern(slug),
    listProducts({ concern: slug }),
    listConcerns(),
  ]);
  if (!concern) notFound();
  return (
    <TaxonPage
      kind="preocupacion"
      taxon={concern}
      products={sortProducts(products)}
      concerns={concerns}
    />
  );
}
