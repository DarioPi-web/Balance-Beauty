import { formatARS, installmentAmount, priceWithPaymentDiscount } from "@/lib/pricing";

/**
 * Página base de F1: valida tokens, tipografías y render 100 % estático.
 * El home real se construye en F3 a partir del diseño aprobado en F2.
 */
export default function Home() {
  const sample = 150000;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-6 py-24">
      <p className="text-sm tracking-[0.2em] text-muted-foreground uppercase">Balance Beauty</p>
      <h1 className="font-display text-5xl leading-[1.05] text-balance sm:text-6xl">
        Tu piel, en equilibrio.
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        Estamos construyendo la nueva tienda. Muy pronto vas a poder elegir por preocupación de tu
        piel y armar tu rutina.
      </p>

      <ul className="grid gap-3 sm:grid-cols-3" aria-label="Beneficios">
        <li className="rounded-lg border bg-card p-4">
          <span className="block text-sm text-muted-foreground">12 cuotas sin interés</span>
          <span className="font-medium tabular-nums">
            de {formatARS(installmentAmount(sample, 12))}
          </span>
        </li>
        <li className="rounded-lg border bg-card p-4">
          <span className="block text-sm text-muted-foreground">Con transferencia</span>
          <span className="font-medium text-ink tabular-nums">
            {formatARS(priceWithPaymentDiscount(sample, 10))}
          </span>
        </li>
        <li className="rounded-lg border bg-card p-4">
          <span className="block text-sm text-muted-foreground">Envíos</span>
          <span className="font-medium">A todo el país</span>
        </li>
      </ul>
    </main>
  );
}
