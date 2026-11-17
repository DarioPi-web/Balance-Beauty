import Image from "next/image";
import { formatARS, installmentAmount, priceWithPaymentDiscount } from "@/lib/pricing";

/**
 * Home provisoria (dirección "B · Botánica clínica", ADR-017).
 * Estática. El home real se construye en F3 con catálogo y hero WebGL.
 */
export default function Home() {
  const sample = 150000;

  return (
    <>
      <header className="bg-leaf safe-top">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <Image
            src="/brand/logo-crema.webp"
            alt="Balance"
            width={1080}
            height={790}
            priority
            className="h-11 w-auto"
          />
          <span className="text-xs tracking-[0.18em] text-clinical/90 uppercase">
            Dermocosmética
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10 px-5 py-16 sm:py-24">
        <div className="relative isolate overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_30%_35%,#cfe0d5_0_22%,transparent_23%),radial-gradient(circle_at_70%_65%,#efcfca_0_20%,transparent_21%),linear-gradient(135deg,#eef3ef,#fbfcfa)] px-6 py-14 sm:px-12 sm:py-20">
          <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Nueva tienda · muy pronto
          </p>
          <h1 className="mt-3 font-display text-[clamp(2.5rem,9vw,4.5rem)] leading-[0.98] font-semibold text-balance">
            Tu piel, en equilibrio.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Estamos construyendo la nueva tienda. Muy pronto vas a poder elegir por preocupación de
            tu piel y armar tu rutina.
          </p>
        </div>

        <ul className="grid gap-3 sm:grid-cols-3" aria-label="Beneficios">
          <li className="rounded-xl border bg-card p-5">
            <span className="block text-sm text-muted-foreground">12 cuotas sin interés</span>
            <span className="font-medium tabular-nums">
              de {formatARS(installmentAmount(sample, 12))}
            </span>
          </li>
          <li className="rounded-xl border bg-card p-5">
            <span className="block text-sm text-muted-foreground">Con transferencia</span>
            <span className="rounded bg-rose-soft px-1.5 py-0.5 font-medium tabular-nums">
              {formatARS(priceWithPaymentDiscount(sample, 10))}
            </span>
          </li>
          <li className="rounded-xl border bg-card p-5">
            <span className="block text-sm text-muted-foreground">Envíos</span>
            <span className="font-medium">A todo el país</span>
          </li>
        </ul>
      </main>
    </>
  );
}
