import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CreditCard, Landmark, Truck } from "lucide-react";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { PriceBlock } from "@/components/shop/price-block";
import { ProductCard } from "@/components/shop/product-card";
import { ProductMedia } from "@/components/shop/product-media";
import {
  brandSlug,
  getProduct,
  listCategories,
  listConcerns,
  listProducts,
  relatedProducts,
} from "@/lib/catalog";
import { JsonLd, breadcrumbLd, productLd } from "@/lib/seo";
import { publicImageUrl } from "@/lib/image-loader";
import { site } from "@/lib/site";

export async function generateStaticParams() {
  return (await listProducts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/producto/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return {};
  const title = [p.name, p.brand].filter(Boolean).join(" ");
  const description =
    p.tagline ??
    (p.description
      ? p.description.slice(0, 150)
      : `${p.name}: comprá online con 10 % off por transferencia y cuotas sin interés.`);
  return {
    title,
    description,
    alternates: { canonical: `/producto/${p.slug}` },
    openGraph: {
      title,
      description,
      images: p.images.slice(0, 1).map((i) => ({ url: publicImageUrl(i.src), alt: i.alt })),
    },
  };
}

export default async function ProductoPage({ params }: PageProps<"/producto/[slug]">) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const [concerns, categories, related] = await Promise.all([
    listConcerns(),
    listCategories(),
    relatedProducts(product),
  ]);
  const concernNames = Object.fromEntries(concerns.map((c) => [c.slug, c.name]));
  const category = categories.find((c) => c.slug === product.categories[0]);
  const crumbs = [
    { name: "Inicio", path: "/" },
    ...(category
      ? [{ name: category.name, path: `/categoria/${category.slug}` }]
      : [{ name: "Tienda", path: "/tienda" }]),
    { name: product.name, path: `/producto/${product.slug}` },
  ];
  const paragraphs = product.description.split(/\n{2,}/).filter(Boolean);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-24 sm:px-6 sm:pt-8 md:pb-8">
      <Breadcrumbs items={crumbs} />

      <div className="mt-4 grid gap-8 md:grid-cols-2 md:gap-12">
        {/* Galería: scroll-snap nativo (sin JS); en desktop, miniaturas como anclas */}
        <section aria-label="Fotos del producto" className="md:sticky md:top-32 md:self-start">
          {product.images.length ? (
            <>
              {/* Enfocable: con teclado se desplaza con las flechas (WCAG 2.1.1, axe scrollable-region-focusable) */}
              <ul
                tabIndex={0}
                aria-label={`Fotos de ${product.name}: deslizá para ver más`}
                className="-mx-4 flex snap-x snap-mandatory [scrollbar-width:none] gap-2 overflow-x-auto px-4 focus-visible:ring-2 focus-visible:ring-leaf focus-visible:outline-none sm:mx-0 sm:px-0"
              >
                {product.images.map((img, i) => (
                  <li
                    key={img.src}
                    id={`foto-${i + 1}`}
                    className="w-[88%] shrink-0 snap-center sm:w-full"
                  >
                    <ProductMedia
                      image={img}
                      name={product.name}
                      brand={product.brand}
                      priority={i === 0}
                      sizes="(min-width: 768px) 560px, 88vw"
                      className="aspect-square rounded-2xl"
                    />
                  </li>
                ))}
              </ul>
              {product.images.length > 1 ? (
                <ul className="mt-3 hidden gap-2 md:flex">
                  {product.images.map((img, i) => (
                    <li key={img.src}>
                      <a
                        href={`#foto-${i + 1}`}
                        className="block h-16 w-16 overflow-hidden rounded-lg border"
                        aria-label={`Ver foto ${i + 1}`}
                      >
                        <ProductMedia
                          image={img}
                          name={product.name}
                          brand={product.brand}
                          sizes="64px"
                          className="h-full w-full"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : (
            <ProductMedia
              name={product.name}
              brand={product.brand}
              sizes="560px"
              className="aspect-square rounded-2xl"
            />
          )}
        </section>

        <section aria-labelledby="h-producto">
          {product.brand ? (
            <Link
              href={`/marca/${brandSlug(product.brand)}`}
              className="inline-flex min-h-11 min-w-11 items-center text-xs tracking-[0.18em] text-muted-foreground uppercase hover:text-graphite"
            >
              {product.brand}
            </Link>
          ) : null}
          <h1
            id="h-producto"
            className="mt-1 font-display text-4xl leading-tight font-semibold sm:text-5xl"
          >
            {product.name}
          </h1>
          {product.tagline ? (
            <p className="mt-3 text-lg text-muted-foreground">{product.tagline}</p>
          ) : null}

          {product.concerns.length ? (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Ideal para">
              {product.concerns.map((c) => (
                <li key={c}>
                  <Link
                    href={`/preocupacion/${c}`}
                    className="inline-flex min-h-11 items-center rounded-full bg-mist px-4 text-sm font-medium hover:bg-leaf/10"
                  >
                    {concernNames[c] ?? c}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          <PriceBlock
            price={product.price}
            compareAtPrice={product.compareAtPrice}
            size="lg"
            className="mt-6"
          />

          <p
            className={
              product.inStock ? "mt-3 text-sm text-leaf" : "mt-3 text-sm font-medium text-alert"
            }
          >
            {product.inStock
              ? product.stock !== null && product.stock <= 3
                ? `¡Quedan ${product.stock}!`
                : "En stock"
              : "Sin stock por el momento"}
          </p>

          {/* CTA: el carrito llega en F4. En mobile queda fijo sobre la barra inferior. */}
          <div className="fixed inset-x-0 bottom-14 z-30 border-t bg-clinical/95 p-3 safe-bottom backdrop-blur md:static md:mt-6 md:border-0 md:bg-transparent md:p-0">
            {product.requiresReview ? (
              <p className="rounded-xl bg-rose-soft p-3 text-sm">
                Este producto requiere asesoramiento antes de la compra. Consultanos por Instagram.
              </p>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-leaf px-6 text-base font-medium text-clinical opacity-80 disabled:cursor-not-allowed md:w-auto"
              >
                Agregar al carrito · muy pronto
              </button>
            )}
          </div>

          <div className="mt-8 space-y-4 text-[17px] leading-relaxed">
            {paragraphs.length ? (
              paragraphs.map((t) => <p key={t.slice(0, 32)}>{t}</p>)
            ) : (
              <p className="text-muted-foreground">
                Estamos preparando la descripción completa con activos, modo de uso y
                recomendaciones.
              </p>
            )}
          </div>

          <ul className="mt-8 grid gap-3 rounded-2xl border bg-card p-5 text-sm">
            <li className="flex gap-3">
              <Landmark className="h-5 w-5 shrink-0 text-leaf" aria-hidden="true" />
              <span>
                <strong className="font-medium">{site.transferDiscountPercent}% off</strong> pagando
                con transferencia o QR.
              </span>
            </li>
            <li className="flex gap-3">
              <CreditCard className="h-5 w-5 shrink-0 text-leaf" aria-hidden="true" />
              <span>Tarjetas de crédito y débito, con cuotas sin interés.</span>
            </li>
            <li className="flex gap-3">
              <Truck className="h-5 w-5 shrink-0 text-leaf" aria-hidden="true" />
              <span>Envíos a todo el país.</span>
            </li>
          </ul>
        </section>
      </div>

      {related.length ? (
        <section aria-labelledby="h-relacionados" className="mt-16">
          <h2 id="h-relacionados" className="font-display text-3xl font-semibold">
            Completá tu rutina
          </h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.slug} product={p} concernNames={concernNames} />
            ))}
          </div>
        </section>
      ) : null}

      <JsonLd data={productLd(product)} />
      <JsonLd data={breadcrumbLd(crumbs)} />
    </main>
  );
}
