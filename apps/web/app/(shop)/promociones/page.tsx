import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, Landmark, Truck } from "lucide-react";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { formatARS } from "@/lib/pricing";
import { breadcrumbLd, JsonLd } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Promociones",
  description: `${site.transferDiscountPercent} % off pagando con transferencia y hasta ${site.installments.promo} cuotas sin interés en dermocosmética.`,
  alternates: { canonical: "/promociones" },
};

const crumbs = [
  { name: "Inicio", path: "/" },
  { name: "Promociones", path: "/promociones" },
];

export default function PromocionesPage() {
  const promos = [
    {
      Icon: Landmark,
      title: `${site.transferDiscountPercent} % off con transferencia`,
      text: "El descuento se aplica automáticamente al elegir transferencia bancaria al finalizar la compra.",
    },
    {
      Icon: CreditCard,
      title: `${site.installments.standard} cuotas sin interés`,
      text: "Con tarjeta de crédito a través de Mercado Pago, en cualquier compra.",
    },
    {
      Icon: CreditCard,
      title: `${site.installments.promo} cuotas sin interés desde ${formatARS(site.installments.promoMinAmount)}`,
      text: "Sumá productos a tu rutina y aprovechá más cuotas.",
    },
    {
      Icon: Truck,
      title: "Envíos a todo el país",
      text: "El costo se calcula al finalizar la compra según tu código postal.",
    },
  ];
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <Breadcrumbs items={crumbs} />
      <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">Promociones</h1>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {promos.map(({ Icon, title, text }) => (
          <li key={title} className="rounded-2xl border bg-card p-5">
            <Icon className="h-6 w-6 text-leaf" aria-hidden="true" />
            <h2 className="mt-3 font-display text-2xl font-semibold">{title}</h2>
            <p className="mt-1 text-muted-foreground">{text}</p>
          </li>
        ))}
      </ul>
      <Link
        href="/tienda"
        className="mt-8 inline-flex min-h-12 items-center rounded-full bg-leaf px-6 font-medium text-clinical hover:bg-leaf-hover"
      >
        Ver la tienda
      </Link>
      <JsonLd data={breadcrumbLd(crumbs)} />
    </main>
  );
}
