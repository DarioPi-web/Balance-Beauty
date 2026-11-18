import Link from "next/link";
import { HeroVideo } from "@/components/home/hero-video";
import { ConcernChips } from "@/components/shop/concern-chips";
import { ProductCard } from "@/components/shop/product-card";
import { listCategories, listConcerns, listProducts, sortProducts } from "@/lib/catalog";
import { site } from "@/lib/site";
import { formatARS } from "@/lib/pricing";

export default async function Home() {
  const [concerns, categories, products] = await Promise.all([
    listConcerns(),
    listCategories(),
    listProducts(),
  ]);
  const featured = sortProducts(products)
    .filter((p) => p.images.length)
    .slice(0, 8);
  const concernNames = Object.fromEntries(concerns.map((c) => [c.slug, c.name]));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-4 pt-6 pb-10 sm:px-6 sm:pt-10">
      {/*
        Hero con video de marca de fondo: el póster (<picture>, primer cuadro del video) pinta
        primero y es el LCP; el video se suma después de la carga (components/home/hero-video).
      */}
      <section className="relative isolate flex min-h-[540px] flex-col justify-end overflow-hidden rounded-3xl bg-graphite px-6 pt-16 pb-10 text-clinical sm:px-12 md:min-h-[560px] md:justify-center md:py-20">
        <picture>
          <source
            type="image/avif"
            srcSet="/video/hero-poster-768.avif 768w, /video/hero-poster-1280.avif 1280w"
            sizes="(min-width: 1152px) 1152px, 100vw"
          />
          <img
            src="/video/hero-poster-1280.jpg"
            alt=""
            width={1280}
            height={720}
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 -z-20 h-full w-full object-cover"
          />
        </picture>
        <HeroVideo
          // AV1 primero (≈ 45–55 % más liviano que VP9 con mejor SSIM); el `codecs` hace que
          // los navegadores sin AV1 lo salteen sin descargarlo. Luego VP9 y H.264 (Safari viejo).
          sources={[
            {
              src: "/video/hero-1080-av1.mp4",
              type: 'video/mp4; codecs="av01.0.08M.08"',
              media: "(min-width: 768px)",
            },
            { src: "/video/hero-720-av1.mp4", type: 'video/mp4; codecs="av01.0.05M.08"' },
            { src: "/video/hero-1080.webm", type: "video/webm", media: "(min-width: 768px)" },
            { src: "/video/hero-720.webm", type: "video/webm" },
            { src: "/video/hero-1080.mp4", type: "video/mp4", media: "(min-width: 768px)" },
            { src: "/video/hero-720.mp4", type: "video/mp4" },
          ]}
        />
        {/* Velo para que el texto se lea sobre cualquier cuadro del video (contraste AA). */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-[5] bg-gradient-to-t from-graphite/85 via-graphite/40 to-transparent md:bg-gradient-to-r md:from-graphite/75 md:via-graphite/25 md:to-transparent"
        />
        <p className="text-xs tracking-[0.2em] text-clinical/85 uppercase">Dermocosmética</p>
        <h1 className="mt-3 font-display text-[clamp(2.5rem,9vw,4.5rem)] leading-[0.98] font-semibold text-balance md:max-w-[55%]">
          Tu piel, en equilibrio.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-clinical/90 md:max-w-[50%]">
          Elegí por lo que necesita tu piel: manchas, acné, rosácea, hidratación o antiedad.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/tienda"
            className="inline-flex min-h-11 items-center rounded-full bg-clinical px-6 text-sm font-medium text-graphite transition-colors hover:bg-mist"
          >
            Ver la tienda
          </Link>
          <Link
            href="/rutina"
            className="inline-flex min-h-11 items-center rounded-full border border-clinical px-6 text-sm font-medium text-clinical hover:bg-white/10"
          >
            Armá tu rutina
          </Link>
        </div>
      </section>

      <ul className="grid gap-3 sm:grid-cols-3" aria-label="Beneficios">
        <Benefit
          title={`${site.installments.promo} cuotas sin interés`}
          text={`En compras desde ${formatARS(site.installments.promoMinAmount)}`}
        />
        <Benefit
          title={`${site.transferDiscountPercent}% off`}
          text="Pagando con transferencia o QR"
        />
        <Benefit title="Envíos a todo el país" text="Por Correo Argentino y Andreani" />
      </ul>

      <section id="preocupaciones" aria-labelledby="h-preocupaciones" className="scroll-mt-28">
        <h2 id="h-preocupaciones" className="font-display text-3xl font-semibold">
          ¿Qué necesita tu piel?
        </h2>
        <p className="mt-2 text-muted-foreground">
          Empezá por tu preocupación y te mostramos qué usar.
        </p>
        <ConcernChips concerns={concerns} className="mt-5" />
      </section>

      <section aria-labelledby="h-destacados">
        <div className="flex items-end justify-between gap-4">
          <h2 id="h-destacados" className="font-display text-3xl font-semibold">
            Destacados
          </h2>
          <Link
            href="/tienda"
            className="inline-flex min-h-11 items-center text-sm font-medium text-leaf underline-offset-4 hover:underline"
          >
            Ver todo
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.slug} product={p} concernNames={concernNames} />
          ))}
        </div>
      </section>

      <section aria-labelledby="h-categorias">
        <h2 id="h-categorias" className="font-display text-3xl font-semibold">
          Categorías
        </h2>
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/categoria/${c.slug}`}
                className="flex min-h-20 flex-col justify-center rounded-2xl bg-mist px-4 py-3 transition-colors hover:bg-leaf hover:text-clinical"
              >
                <span className="font-display text-lg leading-tight font-semibold">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function Benefit({ title, text }: { title: string; text: string }) {
  return (
    <li className="rounded-2xl border bg-card p-5">
      <span className="block font-medium">{title}</span>
      <span className="text-sm text-muted-foreground">{text}</span>
    </li>
  );
}
