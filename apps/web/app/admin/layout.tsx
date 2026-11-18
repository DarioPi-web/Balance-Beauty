import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/actions/auth";
import { requireAdmin } from "@/lib/admin/server";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin | Balance Beauty" },
  robots: { index: false, follow: false },
};

/** Verifica sesión + rol (en la base) antes de mostrar cualquier pantalla de admin. */
async function AdminGate({ children }: { children: React.ReactNode }) {
  const { email } = await requireAdmin();
  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">Sesión: {email}</p>
      {children}
    </>
  );
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-dvh flex-col bg-clinical">
      <header className="border-b bg-card safe-top">
        <nav
          className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6"
          aria-label="Admin"
        >
          <Link href="/admin/pedidos" className="font-display text-xl font-semibold text-leaf">
            {brand.name} · Admin
          </Link>
          <Link href="/admin/pedidos" className="inline-flex min-h-11 items-center">
            Pedidos
          </Link>
          <Link href="/" className="inline-flex min-h-11 items-center" prefetch={false}>
            Ver tienda
          </Link>
          <form action={signOut} className="ml-auto">
            <button className="inline-flex min-h-11 items-center underline underline-offset-2">
              Salir
            </button>
          </form>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        <Suspense fallback={<div className="h-64 rounded-2xl bg-mist/60" aria-hidden="true" />}>
          <AdminGate>{children}</AdminGate>
        </Suspense>
      </main>
    </div>
  );
}
