import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Error 404</p>
      <h1 className="font-display text-4xl font-semibold">No encontramos esta página</h1>
      <p className="text-muted-foreground">
        Puede que el producto ya no esté disponible o que el link haya cambiado.
      </p>
      <Link
        href="/tienda"
        className="inline-flex min-h-11 items-center rounded-full bg-leaf px-6 text-sm font-medium text-clinical"
      >
        Ir a la tienda
      </Link>
    </main>
  );
}
