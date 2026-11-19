import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ProductSheetUploader } from "@/components/admin/product-sheet-uploader";
import { requireAdmin } from "@/lib/admin/server";

export const metadata: Metadata = { title: "Editar con Excel" };

async function Gate({ children }: { children: React.ReactNode }) {
  await requireAdmin("/admin/productos/planilla");
  return <>{children}</>;
}

export default function PlanillaPage() {
  return (
    <div className="grid gap-6">
      <p>
        <Link
          href="/admin/productos"
          className="inline-flex min-h-11 items-center underline underline-offset-2"
        >
          ← Productos
        </Link>
      </p>
      <header>
        <h1 className="font-display text-4xl font-semibold">Editar productos con Excel</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Cambiá nombres, precios, stock, peso y medidas de envío de muchos productos a la vez. Los
          productos nuevos y las fotos se cargan desde el editor de cada producto.
        </p>
      </header>

      <section className="grid gap-3 rounded-2xl border bg-card p-5">
        <h2 className="font-display text-2xl font-semibold">1. Descargá la planilla</h2>
        <p className="text-sm text-muted-foreground">
          Trae todos los productos con sus datos actuales. Editá las columnas verdes y guardala como
          .xlsx (Excel, Google Sheets o LibreOffice).
        </p>
        <a
          href="/admin/productos/planilla/descargar"
          download
          className="inline-flex min-h-11 w-fit items-center justify-center rounded-full bg-leaf px-5 font-medium text-clinical hover:bg-leaf-hover"
        >
          Descargar planilla (.xlsx)
        </a>
        <ul className="grid list-disc gap-1 pl-5 text-sm text-muted-foreground">
          <li>No cambies la columna “Código”: es la que identifica cada producto.</li>
          <li>
            Stock: si lo subís, se suma como lote “PLANILLA”; si lo bajás, sale del lote que vence
            primero. Todo queda en el historial.
          </li>
          <li>Precios en pesos sin decimales; medidas en cm (admiten decimales).</li>
        </ul>
      </section>

      <Suspense fallback={<div className="h-48 rounded-2xl bg-mist/60" aria-hidden="true" />}>
        <Gate>
          <ProductSheetUploader />
        </Gate>
      </Suspense>
    </div>
  );
}
