import { Suspense } from "react";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { CartPageClient } from "@/components/cart/cart-page-client";
import { readCart } from "@/lib/cart/server";

export const metadata: Metadata = {
  title: "Tu carrito",
  robots: { index: false, follow: false },
};

/** Lee la cookie del carrito: va detrás de Suspense para que el resto de la página sea estático. */
async function CartFromCookie() {
  const cart = await readCart();
  return <CartPageClient initial={cart} />;
}

export default function CarritoPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <Breadcrumbs
        items={[
          { name: "Inicio", path: "/" },
          { name: "Carrito", path: "/carrito" },
        ]}
      />
      <h1 className="mt-3 mb-6 font-display text-4xl font-semibold sm:text-5xl">Tu carrito</h1>
      <Suspense fallback={<div className="h-64 rounded-2xl bg-mist/60" aria-hidden="true" />}>
        <CartFromCookie />
      </Suspense>
    </main>
  );
}
