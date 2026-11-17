import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { retryPayment } from "@/actions/checkout";
import { getOrderSummary } from "@/lib/orders/server";
import type { OrderSummary } from "@/lib/orders/types";
import { formatARS } from "@/lib/pricing";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Estado de tu pedido",
  robots: { index: false, follow: false },
};

type Search = { ref?: string; estado?: string };

function Totals({ o }: { o: OrderSummary }) {
  return (
    <dl className="mt-4 grid gap-1 rounded-xl border bg-card p-4 text-base">
      {o.items.map((i) => (
        <div key={i.sku} className="flex justify-between gap-3 text-sm">
          <dt>
            {i.name} <span className="text-muted-foreground">× {i.qty}</span>
          </dt>
          <dd className="shrink-0">{formatARS(i.unit_price * i.qty)}</dd>
        </div>
      ))}
      {o.discount_total ? (
        <div className="flex justify-between text-sm text-leaf">
          <dt>Descuento</dt>
          <dd>−{formatARS(o.discount_total)}</dd>
        </div>
      ) : null}
      <div className="flex justify-between text-sm">
        <dt>Envío</dt>
        <dd>{o.shipping_total ? formatARS(o.shipping_total) : "Gratis"}</dd>
      </div>
      <div className="mt-2 flex justify-between border-t pt-2 font-semibold">
        <dt>Total</dt>
        <dd>{formatARS(o.total)}</dd>
      </div>
    </dl>
  );
}

async function Result({ search }: { search: Promise<Search> }) {
  const { ref = "", estado } = await search;
  const o = await getOrderSummary(ref).catch(() => null);

  if (!o) {
    return (
      <p className="rounded-2xl border bg-card p-6">
        No encontramos ese pedido. Si ya pagaste, escribinos por{" "}
        <a href={site.social.instagram} className="underline underline-offset-2">
          Instagram
        </a>{" "}
        y lo revisamos.
      </p>
    );
  }

  const paid =
    o.status === "paid" ||
    o.status === "preparing" ||
    o.status === "shipped" ||
    o.status === "delivered";
  const failed = estado === "rechazado" || estado === "error-pago";
  const byCard = o.payment_method === "card";

  let icon = <Clock className="h-10 w-10 text-leaf" aria-hidden="true" />;
  let title = `Recibimos tu pedido #${o.number}`;
  let body: React.ReactNode = null;

  if (paid) {
    icon = <CheckCircle2 className="h-10 w-10 text-leaf" aria-hidden="true" />;
    title = `¡Gracias, ${o.first_name}! Tu pago fue aprobado`;
    body = <p>Pedido #{o.number}. Te avisamos por email cuando lo despachemos.</p>;
  } else if (o.status === "cancelled" || o.status === "refunded") {
    icon = <XCircle className="h-10 w-10 text-alert" aria-hidden="true" />;
    title = `El pedido #${o.number} fue cancelado`;
  } else if (byCard && failed) {
    icon = <XCircle className="h-10 w-10 text-alert" aria-hidden="true" />;
    title = "El pago no se completó";
    body = (
      <>
        <p>
          Tu pedido #{o.number} sigue reservado. Podés intentar de nuevo con otra tarjeta o medio de
          pago.
        </p>
        <form action={retryPayment} className="mt-4">
          <input type="hidden" name="ref" value={ref} />
          <button className="inline-flex min-h-12 items-center justify-center rounded-full bg-leaf px-6 font-medium text-clinical hover:bg-leaf-hover">
            Reintentar el pago
          </button>
        </form>
      </>
    );
  } else if (byCard) {
    title = estado === "aprobado" ? "Estamos confirmando tu pago" : "Tu pago está en proceso";
    body = (
      <p>
        Mercado Pago nos avisa en unos instantes. Pedido #{o.number}.{" "}
        <a href={`/checkout/resultado?ref=${ref}`} className="underline underline-offset-2">
          Actualizar estado
        </a>
      </p>
    );
  } else {
    body = (
      <>
        <p>
          Para completarlo, transferí <strong>{formatARS(o.total)}</strong> (ya incluye el{" "}
          {site.transferDiscountPercent} % de descuento) indicando el número de pedido{" "}
          <strong>#{o.number}</strong> en el concepto.
        </p>
        <p className="mt-2">
          Te enviamos los datos bancarios y confirmamos el pago por email o WhatsApp. Guardamos el
          stock de tu pedido por 30 minutos.
        </p>
      </>
    );
  }

  return (
    <section aria-live="polite">
      <div className="flex items-start gap-4">
        {icon}
        <div>
          <h2 className="font-display text-3xl font-semibold">{title}</h2>
          <div className="mt-2 grid gap-1 text-base">{body}</div>
        </div>
      </div>
      <Totals o={o} />
      <Link
        href="/tienda"
        className="mt-6 inline-flex min-h-11 items-center underline underline-offset-2"
      >
        Seguir comprando
      </Link>
    </section>
  );
}

export default function ResultadoPage({ searchParams }: PageProps<"/checkout/resultado">) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="sr-only">Estado de tu pedido</h1>
      <Suspense fallback={<div className="h-64 rounded-2xl bg-mist/60" aria-hidden="true" />}>
        <Result search={searchParams as Promise<Search>} />
      </Suspense>
    </main>
  );
}
