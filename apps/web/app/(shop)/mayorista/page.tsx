import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { site } from "@/lib/site";

// Las condiciones mayoristas (mínimo de compra, lista de precios) las define la tienda:
// hasta entonces la página invita a consultar y no se indexa.
export const metadata: Metadata = {
  title: "Venta mayorista",
  robots: { index: false, follow: true },
  alternates: { canonical: "/mayorista" },
};

export default function MayoristaPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Breadcrumbs
        items={[
          { name: "Inicio", path: "/" },
          { name: "Mayorista", path: "/mayorista" },
        ]}
      />
      <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">Venta mayorista</h1>
      <p className="mt-4 text-lg">
        ¿Tenés un centro de estética, consultorio o farmacia? Escribinos y te enviamos la lista de
        precios mayoristas y las condiciones de compra.
      </p>
      <a
        href={site.social.instagram}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex min-h-12 items-center rounded-full bg-leaf px-6 font-medium text-clinical hover:bg-leaf-hover"
      >
        Consultar por Instagram<span className="sr-only"> (se abre en otra pestaña)</span>
      </a>
    </main>
  );
}
