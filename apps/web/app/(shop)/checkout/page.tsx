import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ShieldCheck } from "lucide-react";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { readCart } from "@/lib/cart/server";
import { checkoutServerKey, isSupabaseConfigured, listShippingRates } from "@/lib/orders/server";
import { createFormToken } from "@/lib/security/form-guard";
import { isMercadoPagoConfigured } from "@/lib/payments/mercadopago";
import { formatARS } from "@/lib/pricing";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Finalizar compra",
  robots: { index: false, follow: false },
};

/** Lee la cookie del carrito (dinámico): va detrás de Suspense. */
async function CheckoutFromCookie() {
  const [cart, rates] = await Promise.all([readCart(), listShippingRates()]);

  if (cart.items.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <p className="text-lg">Tu carrito está vacío.</p>
        <Link
          href="/tienda"
          className="mt-4 inline-flex min-h-12 items-center justify-center rounded-full bg-leaf px-6 font-medium text-clinical hover:bg-leaf-hover"
        >
          Ir a la tienda
        </Link>
      </div>
    );
  }

  const serverKey = checkoutServerKey();
  await connection(); // el token usa la hora actual: este render es por request, nunca prerender
  if (!isSupabaseConfigured() || !serverKey || rates.length === 0) {
    return (
      <p role="status" className="rounded-2xl border bg-card p-6">
        El checkout no está disponible en este momento. Escribinos por{" "}
        <a href={site.social.instagram} className="underline underline-offset-2">
          Instagram
        </a>{" "}
        y te ayudamos con tu compra.
      </p>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <CheckoutForm
        subtotal={cart.subtotal}
        rates={rates}
        transferPercent={site.transferDiscountPercent}
        cardEnabled={await isMercadoPagoConfigured()}
        formToken={createFormToken(serverKey)}
      />
      <aside
        className="h-fit rounded-2xl border bg-card p-5 lg:sticky lg:top-32"
        aria-label="Resumen del pedido"
      >
        <h2 className="font-display text-2xl font-semibold">Tu pedido</h2>
        <ul className="mt-3 divide-y">
          {cart.items.map((i) => (
            <li key={i.slug} className="flex justify-between gap-3 py-2 text-sm">
              <span>
                {i.name} <span className="text-muted-foreground">× {i.qty}</span>
              </span>
              <span className="shrink-0">{formatARS(i.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex justify-between border-t pt-3 font-semibold">
          <span>Subtotal</span>
          <span>{formatARS(cart.subtotal)}</span>
        </p>
        <Link
          href="/carrito"
          prefetch={false}
          className="mt-3 inline-flex min-h-11 items-center text-sm underline underline-offset-2"
        >
          Modificar carrito
        </Link>
        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-leaf" aria-hidden="true" /> Compra segura. Tus datos
          viajan cifrados.
        </p>
      </aside>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <Breadcrumbs
        items={[
          { name: "Inicio", path: "/" },
          { name: "Carrito", path: "/carrito" },
          { name: "Finalizar compra", path: "/checkout" },
        ]}
      />
      <h1 className="mt-3 mb-6 font-display text-4xl font-semibold sm:text-5xl">
        Finalizar compra
      </h1>
      <Suspense fallback={<div className="h-96 rounded-2xl bg-mist/60" aria-hidden="true" />}>
        <CheckoutFromCookie />
      </Suspense>
    </main>
  );
}
