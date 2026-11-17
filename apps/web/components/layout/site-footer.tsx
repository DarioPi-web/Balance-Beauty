import Image from "next/image";
import Link from "next/link";
import { listBrands, listCategories, listConcerns } from "@/lib/catalog";
import { site } from "@/lib/site";

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
          <Image
            src="/brand/logo-crema.webp"
            alt="Balance"
            width={72}
            height={53}
            className="h-12 w-auto"
          />
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
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-clinical/70 sm:px-6">
          © Balance Beauty. Precios en pesos argentinos.
        </p>
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
