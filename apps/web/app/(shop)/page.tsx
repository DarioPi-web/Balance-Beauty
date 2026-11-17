import Link from "next/link";
import { EquilibriumCanvas } from "@/components/webgl/equilibrium-canvas";
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
        Hero "Equilibrio": el póster CSS es lo primero que se ve y el fallback;
        el canvas WebGL aparece encima cuando la página ya cargó (docs/14 §5).
      */}
      <section className="relative isolate flex min-h-[520px] flex-col overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_58%_74%,#cfe0d5cc_0,transparent_32%),radial-gradient(circle_at_40%_82%,#efcfcacc_0,transparent_28%),linear-gradient(135deg,#eef3ef,#fbfcfa)] px-6 pt-10 pb-60 sm:px-12 md:min-h-[500px] md:justify-center md:bg-[radial-gradient(circle_at_78%_44%,#cfe0d5cc_0,transparent_30%),radial-gradient(circle_at_66%_58%,#efcfcacc_0,transparent_26%),linear-gradient(135deg,#eef3ef,#fbfcfa)] md:py-20">
        <EquilibriumCanvas className="absolute inset-0 -z-10 h-full w-full" />
        <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Dermocosmética</p>
        <h1 className="mt-3 font-display text-[clamp(2.5rem,9vw,4.5rem)] leading-[0.98] font-semibold text-balance md:max-w-[55%]">
          Tu piel, en equilibrio.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground md:max-w-[50%]">
          Elegí por lo que necesita tu piel: manchas, acné, rosácea, hidratación o antiedad.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/tienda"
            className="inline-flex min-h-11 items-center rounded-full bg-leaf px-6 text-sm font-medium text-clinical transition-colors hover:bg-leaf-hover"
          >
            Ver la tienda
          </Link>
          <Link
            href="/rutina"
            className="inline-flex min-h-11 items-center rounded-full border border-graphite px-6 text-sm font-medium"
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
