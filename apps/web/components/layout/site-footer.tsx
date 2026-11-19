import { getImageProps } from "next/image";
import Link from "next/link";
import { listBrands, listCategories, listConcerns } from "@/lib/catalog";
import { site } from "@/lib/site";

const { props: logo } = getImageProps({
  src: "/brand/logo-crema.webp",
  alt: "Balance",
  width: 72,
  height: 53,
});

export async function SiteFooter() {
  const [categories, concerns, brands] = await Promise.all([
    listCategories(),
    listConcerns(),
    listBrands(),
  ]);
  return (
    <footer className="mt-16 bg-leaf pb-20 text-clinical md:pb-0">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 md:grid-cols-5">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element -- props de getImageProps, sin JS cliente */}
          <img {...logo} alt="Balance" className="h-12 w-auto" />
          <p className="mt-4 max-w-xs text-sm text-clinical/80">
            Dermocosmética para cada necesidad de tu piel. Envíos a todo el país.
          </p>
        </div>
        <FooterList
          title="Preocupaciones"
          items={concerns.map((c) => ({ href: `/preocupacion/${c.slug}`, label: c.name }))}
        />
        <FooterList
          title="Categorías"
          items={categories.map((c) => ({ href: `/categoria/${c.slug}`, label: c.name }))}
        />
        <FooterList
          title="Marcas"
          items={brands.map((b) => ({ href: `/marca/${b.slug}`, label: b.name }))}
        />
        <FooterList
          title="Seguinos"
          items={[
            { href: site.social.instagram, label: "Instagram", external: true },
            { href: site.social.tiktok, label: "TikTok", external: true },
            { href: site.social.facebook, label: "Facebook", external: true },
          ]}
        />
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4 sm:px-6">
          <p className="text-xs text-clinical/70">© Balance Beauty. Precios en pesos argentinos.</p>
          <nav aria-label="Legales" className="flex flex-wrap gap-x-4">
            {/* Res. 424/2020: acceso fácil y visible desde la primera pantalla del sitio. */}
            <Link
              href="/arrepentimiento"
              prefetch={false}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-clinical underline underline-offset-4"
            >
              Botón de arrepentimiento
            </Link>
            <Link
              href="/devoluciones"
              prefetch={false}
              className="inline-flex min-h-11 items-center text-sm text-clinical/90 hover:text-clinical"
            >
              Cambios y devoluciones
            </Link>
            <Link
              href="/terminos"
              prefetch={false}
              className="inline-flex min-h-11 items-center text-sm text-clinical/90 hover:text-clinical"
            >
              Términos
            </Link>
            <Link
              href="/privacidad"
              prefetch={false}
              className="inline-flex min-h-11 items-center text-sm text-clinical/90 hover:text-clinical"
            >
              Privacidad
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

function FooterList({
  title,
  items,
}: {
  title: string;
  items: { href: string; label: string; external?: boolean }[];
}) {
  return (
    <div>
      <h2 className="text-xs font-semibold tracking-[0.18em] text-clinical/70 uppercase">
        {title}
      </h2>
      <ul className="mt-3 space-y-1">
        {items.map((i) => (
          <li key={i.href}>
            {i.external ? (
              <a
                href={i.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 min-w-11 items-center text-sm text-clinical/90 hover:text-clinical"
              >
                {i.label}
              </a>
            ) : (
              <Link
                href={i.href}
                prefetch={false}
                className="inline-flex min-h-11 min-w-11 items-center text-sm text-clinical/90 hover:text-clinical"
              >
                {i.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
