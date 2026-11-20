import { Suspense } from "react";
import type { Metadata } from "next";
import { Download } from "lucide-react";
import { ProductSheetUploader } from "@/components/admin/product-sheet-uploader";
import { PageHeader, Panel, btnPrimary } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Editar con Excel" };

async function Gate({ children }: { children: React.ReactNode }) {
  await requireAdmin("/admin/productos/planilla");
  return <>{children}</>;
}

export default function PlanillaPage() {
  return (
    <>
      <PageHeader
        back={{ href: "/admin/productos", label: "Productos" }}
        title="Editar productos con Excel"
        description="Cambiá nombres, precios, stock, peso y medidas de envío de muchos productos a la vez. Los productos nuevos y las fotos se cargan desde el editor de cada producto."
      />

      <ol className="grid gap-6">
        <li className="contents">
          <Panel
            title="1. Descargá la planilla"
            description="Trae todos los productos con sus datos actuales."
          >
            <a
              href="/admin/productos/planilla/descargar"
              download
              className={cn(btnPrimary, "w-fit")}
            >
              <Download aria-hidden="true" className="size-4" />
              Descargar planilla (.xlsx)
            </a>
            <ul className="grid gap-2 text-sm text-muted-foreground">
              <li>
                • Editá las columnas verdes y guardala como .xlsx (Excel, Google Sheets o
                LibreOffice).
              </li>
              <li>• No cambies la columna “Código”: es la que identifica cada producto.</li>
              <li>
                • Stock: si lo subís, se suma como lote “PLANILLA”; si lo bajás, sale del lote que
                vence primero. Todo queda en el historial.
              </li>
              <li>• Precios en pesos sin decimales; medidas en cm (admiten decimales).</li>
            </ul>
          </Panel>
        </li>
        <li className="contents">
          <Suspense fallback={<div className="h-48 rounded-2xl bg-mist/60" aria-hidden="true" />}>
            <Gate>
              <ProductSheetUploader />
            </Gate>
          </Suspense>
        </li>
      </ol>
    </>
  );
}
