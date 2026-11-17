import Image from "next/image";
import { EquilibriumCanvas } from "@/components/webgl/equilibrium-canvas";
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
            width={60}
            height={44}
            priority
            className="h-11 w-auto"
          />
          <span className="text-xs tracking-[0.18em] text-clinical/90 uppercase">
            Dermocosmética
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10 px-5 py-16 sm:py-24">
        {/*
          Hero "Equilibrio": el póster CSS (mismas gotas, estáticas) es lo que se ve primero y
          el fallback; el canvas WebGL aparece encima cuando la página ya cargó (docs/14 §5).
        */}
        <div className="relative isolate flex min-h-[560px] flex-col overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_58%_74%,#cfe0d5cc_0,transparent_32%),radial-gradient(circle_at_40%_82%,#efcfcacc_0,transparent_28%),linear-gradient(135deg,#eef3ef,#fbfcfa)] px-6 pt-12 pb-64 sm:min-h-[520px] sm:px-12 sm:py-20 md:justify-center md:bg-[radial-gradient(circle_at_78%_44%,#cfe0d5cc_0,transparent_30%),radial-gradient(circle_at_66%_58%,#efcfcacc_0,transparent_26%),linear-gradient(135deg,#eef3ef,#fbfcfa)]">
          <EquilibriumCanvas className="absolute inset-0 -z-10 h-full w-full" />
          <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Nueva tienda · muy pronto
          </p>
          <h1 className="mt-3 font-display text-[clamp(2.5rem,9vw,4.5rem)] leading-[0.98] font-semibold text-balance md:max-w-[55%]">
            Tu piel, en equilibrio.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground md:max-w-[50%]">
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
