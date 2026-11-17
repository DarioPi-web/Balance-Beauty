import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TaxonPage } from "@/components/shop/taxon-page";
import { getBrand, listBrands, listConcerns, listProducts, sortProducts } from "@/lib/catalog";

export async function generateStaticParams() {
  return (await listBrands()).map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: PageProps<"/marca/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const b = await getBrand(slug);
  if (!b) return {};
  return {
    title: `${b.name}: productos y precios`,
    description: `Comprá ${b.name} online: ${b.description} 10 % off con transferencia y cuotas sin interés.`,
    alternates: { canonical: `/marca/${b.slug}` },
  };
}

export default async function MarcaPage({ params }: PageProps<"/marca/[slug]">) {
  const { slug } = await params;
  const [brand, products, concerns] = await Promise.all([
    getBrand(slug),
    listProducts({ brand: slug }),
    listConcerns(),
  ]);
  if (!brand) notFound();
  return (
    <TaxonPage kind="marca" taxon={brand} products={sortProducts(products)} concerns={concerns} />
  );
}
