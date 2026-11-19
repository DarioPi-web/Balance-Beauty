import Link from "next/link";
import { ChevronDown, UserRound } from "lucide-react";
import { CartButton } from "@/components/cart/cart-button";
import { SearchButton } from "@/components/search/search-button";
import { listConcerns } from "@/lib/catalog";
import { formatARS } from "@/lib/pricing";
import { site } from "@/lib/site";
import { BrandLogo } from "./brand-logo";
import { MenuCloser } from "./menu-closer";
import { FacebookIcon, InstagramIcon, TikTokIcon } from "./social-icons";

const topLinks = [
  { href: "/mayorista", label: "Mayorista" },
  { href: "/promociones", label: "Promos" },
  { href: "/contacto", label: "Contacto" },
  // Res. 424/2020: visible desde la primera pantalla.
  { href: "/arrepentimiento", label: "Botón de arrepentimiento" },
];

const socials = [
  { href: site.social.facebook, label: "Facebook", Icon: FacebookIcon },
  { href: site.social.instagram, label: "Instagram", Icon: InstagramIcon },
  { href: site.social.tiktok, label: "TikTok", Icon: TikTokIcon },
];

/** Seguimiento en los sitios oficiales de cada correo. */
const tracking = [
  { href: "https://www.correoargentino.com.ar/formularios/e-commerce", label: "Correo Argentino" },
  { href: "https://www.andreani.com/#!/personas", label: "Andreani" },
];

const navLink =
  "inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-[13px] font-semibold tracking-[0.08em] uppercase text-clinical/95 transition-colors hover:bg-white/10 hover:text-clinical";
const menuPanel =
  "absolute top-full left-1/2 z-50 mt-1 w-60 -translate-x-1/2 rounded-2xl border bg-card p-2 text-graphite shadow-[0_12px_40px_-12px_rgb(20_35_28/0.35)]";
const menuItem = "flex min-h-11 items-center rounded-xl px-3 text-sm hover:bg-mist";

function Dropdown({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <details data-menu className="group relative">
      <summary className={`${navLink} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
        {label}
        <ChevronDown
          className="h-4 w-4 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className={menuPanel}>{children}</div>
    </details>
  );
}

/**
 * Header en tres franjas (referencia del sitio anterior, dirección B):
 * 1) barra utilitaria (Mayorista · Promos · Contacto | promo | redes) — se va al hacer scroll;
 * 2) barra principal fija: buscador · logo centrado · carrito y cuenta;
 * 3) menú centrado con submenús <details> (sin JS; MenuCloser solo los cierra al navegar).
 */
export async function SiteHeader() {
  const concerns = await listConcerns();

  return (
    <>
      {/* Mobile: el Botón de arrepentimiento en la primera pantalla (Res. 424/2020); se va al
          hacer scroll. En desktop está en la barra utilitaria. */}
      <div className="flex justify-end bg-graphite px-3 md:hidden">
        <Link
          href="/arrepentimiento"
          prefetch={false}
          className="inline-flex min-h-11 items-center text-xs font-semibold tracking-[0.08em] text-clinical/90 uppercase underline-offset-4 hover:underline"
        >
          Botón de arrepentimiento
        </Link>
      </div>
      <div className="hidden bg-graphite text-clinical/90 md:block standalone:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6">
          <nav aria-label="Enlaces rápidos">
            <ul className="flex items-center gap-1">
              {topLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    prefetch={false}
                    className="inline-flex min-h-11 items-center px-2 text-xs font-semibold tracking-[0.1em] uppercase hover:text-clinical"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p className="hidden text-center text-xs tracking-wide lg:block">
            {site.installments.promo} cuotas sin interés desde{" "}
            {formatARS(site.installments.promoMinAmount)} · {site.transferDiscountPercent}% off con
            transferencia
          </p>
          <ul
            className="flex items-center justify-end gap-1 lg:col-start-3"
            aria-label="Redes sociales"
          >
            {socials.map(({ href, label, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${label} (se abre en otra pestaña)`}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10 hover:text-clinical"
                >
                  <Icon className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <header className="sticky top-0 z-40 bg-leaf safe-top text-clinical">
        <p className="bg-graphite px-4 py-1.5 text-center text-xs tracking-wide text-clinical/90 md:hidden">
          {site.installments.promo} cuotas sin interés desde{" "}
          {formatARS(site.installments.promoMinAmount)} · {site.transferDiscountPercent}% off
          transferencia
        </p>
        <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2 sm:gap-3 sm:px-6 md:py-3">
          <div className="flex items-center">
            {/* Mobile: lupa. Desktop: buscador en forma de pastilla (abre el mismo diálogo). */}
            <SearchButton className="inline-flex min-h-11 min-w-11 justify-center gap-1 rounded-full text-clinical hover:bg-white/10 md:hidden" />
            <SearchButton
              shortcut
              label="Buscar productos"
              className="hidden min-h-11 w-60 justify-start gap-3 rounded-full bg-clinical px-5 text-base text-graphite/70 shadow-sm hover:text-graphite md:inline-flex"
            />
          </div>

          <Link
            href="/"
            aria-label="Balance Beauty — inicio"
            className="inline-flex min-h-11 min-w-11 items-center justify-center justify-self-center text-clinical"
          >
            <BrandLogo />
          </Link>

          <div className="flex items-center justify-end gap-1 sm:gap-2 md:gap-3">
            <CartButton className="inline-flex min-h-11 min-w-11 justify-center gap-1 rounded-full text-clinical hover:bg-white/10 md:h-12 md:w-12 md:border md:border-clinical/80" />
            <Link
              href="/ingresar"
              prefetch={false}
              aria-label="Mi cuenta"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-clinical hover:bg-white/10 max-[379px]:hidden md:h-12 md:w-12 md:border md:border-clinical/80"
            >
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <nav aria-label="Principal" className="hidden border-t border-white/10 md:block">
          <ul className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-2 px-4 py-1 sm:px-6">
            <li>
              <Link href="/" className={navLink}>
                Inicio
              </Link>
            </li>
            <li>
              <Link href="/tienda" className={navLink}>
                Tienda
              </Link>
            </li>
            <li>
              <Dropdown label="Preocupaciones">
                <ul>
                  {concerns.map((c) => (
                    <li key={c.slug}>
                      <Link href={`/preocupacion/${c.slug}`} prefetch={false} className={menuItem}>
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Dropdown>
            </li>
            <li>
              <Link href="/rutina" className={navLink}>
                Armá tu rutina
              </Link>
            </li>
            <li>
              <Link href="/preguntas-frecuentes" prefetch={false} className={navLink}>
                Preguntas frecuentes
              </Link>
            </li>
            <li>
              <Dropdown label="Seguí tu envío">
                <ul>
                  {tracking.map((t) => (
                    <li key={t.href}>
                      <a
                        href={t.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={menuItem}
                      >
                        {t.label}
                        <span className="sr-only"> (se abre en otra pestaña)</span>
                      </a>
                    </li>
                  ))}
                </ul>
                <p className="px-3 pt-1 pb-2 text-xs text-muted-foreground">
                  Usá el código de seguimiento del email de despacho.
                </p>
              </Dropdown>
            </li>
          </ul>
        </nav>
        <MenuCloser />
      </header>
    </>
  );
}
