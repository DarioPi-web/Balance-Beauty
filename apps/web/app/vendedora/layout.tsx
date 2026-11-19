import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/actions/auth";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: { default: "Mi panel", template: "%s · Vendedoras | Balance Beauty" },
  robots: { index: false, follow: false },
};

/** Panel de vendedoras: layout propio, sin catálogo (cada página verifica la sesión). */
export default function SellerLayout({ children }: LayoutProps<"/vendedora">) {
  return (
    <div className="flex min-h-dvh flex-col bg-clinical">
      <header className="border-b bg-card safe-top">
        <nav
          aria-label="Vendedoras"
          className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6"
        >
          <Link href="/vendedora" className="font-display text-xl font-semibold text-leaf">
            {brand.name} · Vendedoras
          </Link>
          <Link href="/" prefetch={false} className="inline-flex min-h-11 items-center">
            Ver tienda
          </Link>
          <form action={signOut} className="ml-auto">
            <button className="inline-flex min-h-11 items-center underline underline-offset-2">
              Salir
            </button>
          </form>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 safe-bottom sm:px-6">
        {children}
      </main>
    </div>
  );
}
