import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { signOut } from "@/actions/auth";
import {
  AdminMobileNav,
  AdminMobileNavFallback,
  AdminNavList,
  AdminNavView,
} from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/admin/server";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin | Balance Beauty" },
  robots: { index: false, follow: false },
};

/** Pie del menú: tienda, sesión y salir. Server component (lee la sesión). */
async function SessionFooter() {
  const { email } = await requireAdmin();
  return (
    <div className="grid gap-1">
      <Link
        href="/"
        prefetch={false}
        target="_blank"
        className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-graphite hover:bg-mist"
      >
        <ExternalLink aria-hidden="true" className="size-4 text-leaf" />
        Ver la tienda
        <span className="sr-only">(se abre en otra pestaña)</span>
      </Link>
      <div className="flex items-center gap-2 rounded-xl px-3 py-2">
        <span
          aria-hidden="true"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-mist text-sm font-semibold text-leaf uppercase"
        >
          {email?.slice(0, 1) ?? "?"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-muted-foreground">Sesión</span>
          <span className="block truncate text-sm" title={email ?? undefined}>
            {email}
          </span>
        </span>
        <form action={signOut}>
          <button
            className="inline-flex size-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-mist hover:text-graphite"
            aria-label="Salir del administrador"
            title="Salir"
          >
            <LogOut aria-hidden="true" className="size-5" />
          </button>
        </form>
      </div>
    </div>
  );
}

/** Verifica sesión + rol (en la base) antes de mostrar cualquier pantalla de admin. */
async function AdminGate({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}

const footerFallback = <div className="h-24 rounded-xl bg-mist/50" aria-hidden="true" />;

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-dvh bg-clinical lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-leaf focus:px-4 focus:py-2 focus:text-clinical"
      >
        Saltar al contenido
      </a>

      {/* Escritorio: barra lateral fija */}
      <aside className="hidden border-r bg-card lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:gap-6 lg:overflow-y-auto lg:p-4">
        <Link
          href="/admin"
          className="px-3 pt-2 font-display text-2xl leading-none font-semibold text-leaf"
        >
          {brand.name}
          <span className="mt-1 block font-sans text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Administración
          </span>
        </Link>
        <Suspense fallback={<AdminNavView />}>
          <AdminNavList />
        </Suspense>
        <div className="mt-auto border-t pt-3">
          <Suspense fallback={footerFallback}>
            <SessionFooter />
          </Suspense>
        </div>
      </aside>

      {/* Celular y tablet: barra superior con menú */}
      <header className="sticky top-0 z-30 border-b bg-card/95 px-4 py-2 safe-top backdrop-blur lg:hidden">
        <Suspense fallback={<AdminMobileNavFallback />}>
          <AdminMobileNav
            footer={
              <Suspense fallback={footerFallback}>
                <SessionFooter />
              </Suspense>
            }
          />
        </Suspense>
      </header>

      <main id="admin-main" tabIndex={-1} className="min-w-0 safe-x outline-none">
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <Suspense fallback={<div className="h-64 rounded-2xl bg-mist/60" aria-hidden="true" />}>
            <AdminGate>{children}</AdminGate>
          </Suspense>
        </div>
      </main>
    </div>
  );
}
