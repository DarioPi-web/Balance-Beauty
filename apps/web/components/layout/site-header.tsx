import Image from "next/image";
import Link from "next/link";
import { CartButton } from "@/components/cart/cart-button";
import { SearchButton } from "@/components/search/search-button";
import { site } from "@/lib/site";
import { formatARS } from "@/lib/pricing";

const nav = [
  { href: "/tienda", label: "Tienda" },
  { href: "/rutina", label: "Armá tu rutina" },
  { href: "/preocupacion/manchas", label: "Manchas" },
  { href: "/preocupacion/acne", label: "Acné" },
  { href: "/preocupacion/antiedad", label: "Antiedad" },
  { href: "/categoria/proteccion-solar", label: "Protección solar" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-leaf safe-top text-clinical">
      <div className="bg-[#16302a] px-4 py-1.5 text-center text-xs tracking-wide text-clinical/90">
        {site.installments.promo} cuotas sin interés desde{" "}
        {formatARS(site.installments.promoMinAmount)} · {site.transferDiscountPercent}% off con
        transferencia
      </div>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
        <Link href="/" aria-label="Balance — inicio" className="inline-flex min-h-11 items-center">
          <Image
            src="/brand/logo-crema.webp"
            alt="Balance"
            width={56}
            height={41}
            loading="eager"
            className="h-10 w-auto"
          />
        </Link>
        <nav aria-label="Principal" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {nav.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className="inline-flex min-h-11 items-center rounded-full px-3 text-sm text-clinical/90 transition-colors hover:bg-white/10 hover:text-clinical"
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-1">
          <SearchButton shortcut className="rounded-full text-clinical hover:bg-white/10" />
          <CartButton className="rounded-full text-clinical hover:bg-white/10" />
        </div>
      </div>
    </header>
  );
}
