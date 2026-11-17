import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { Cormorant_Garamond, Fraunces, Geist, Inter_Tight } from "next/font/google";
import { formatARS, installmentAmount, priceWithPaymentDiscount } from "@/lib/pricing";

/**
 * F2‑01 · Style tiles: dos direcciones visuales para elegir (docs/14 §2 y §8).
 * Página interna, no indexable. Se elimina al aprobar el design system.
 */
export const metadata: Metadata = {
  title: "Propuestas visuales",
  robots: { index: false, follow: false },
};

const fraunces = Fraunces({ subsets: ["latin"], axes: ["opsz"], display: "swap" });
const interTight = Inter_Tight({ subsets: ["latin"], display: "swap" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});
const geist = Geist({ subsets: ["latin"], display: "swap" });

type Tile = {
  id: string;
  name: string;
  concept: string;
  display: string;
  sans: string;
  displayName: string;
  sansName: string;
  c: {
    bg: string;
    surface: string;
    ink: string;
    muted: string;
    brand: string; // fondo del header con logo crema
    accent: string;
    accentInk: string;
    soft: string;
    line: string;
  };
  palette: { name: string; hex: string; use: string }[];
  drop: string; // gradiente del "hero" (marcador del WebGL)
};

const tiles: Tile[] = [
  {
    id: "a",
    name: "A · Equilibrio cálido",
    concept:
      "Evoluciona lo que ya tiene la marca: crema y arcilla, serif con carácter, mucha luz. Se siente cercana, de autor y premium; combina con las fotos actuales (madera y luz natural).",
    display: fraunces.className,
    sans: interTight.className,
    displayName: "Fraunces",
    sansName: "Inter Tight",
    c: {
      bg: "#f4efe9",
      surface: "#fbf8f5",
      ink: "#1e1b18",
      muted: "#5f5750",
      brand: "#7a5c49", // arcilla oscura: contraste AA con el texto crema
      accent: "#1e1b18",
      accentInk: "#f4efe9",
      soft: "#ebe3da",
      line: "#ded4c9",
    },
    palette: [
      { name: "Porcelana", hex: "#F4EFE9", use: "Fondo" },
      { name: "Tinta", hex: "#1E1B18", use: "Texto y botones" },
      { name: "Arcilla", hex: "#7A5C49", use: "Marca, header" },
      { name: "Salvia", hex: "#8FA391", use: "Señales de activos" },
      { name: "Sérum", hex: "#E8B04B", use: "Precio transferencia" },
    ],
    drop: "radial-gradient(circle at 38% 42%, #f6d9a8 0 18%, transparent 19%), radial-gradient(circle at 62% 58%, #e8c4ae 0 22%, transparent 23%), linear-gradient(135deg, #efe4d8, #f8f1ea)",
  },
  {
    id: "b",
    name: "B · Botánica clínica",
    concept:
      'Más fresca y "de laboratorio": verde profundo inspirado en las plantas de las fotos, blanco limpio y un rosa empolvado. Transmite eficacia y ciencia sin perder suavidad.',
    display: cormorant.className,
    sans: geist.className,
    displayName: "Cormorant Garamond",
    sansName: "Geist",
    c: {
      bg: "#f7f8f5",
      surface: "#ffffff",
      ink: "#14231c",
      muted: "#4d5b54",
      brand: "#1e3a2f",
      accent: "#1e3a2f",
      accentInk: "#f7f8f5",
      soft: "#e3ebe5",
      line: "#d5ded8",
    },
    palette: [
      { name: "Blanco clínico", hex: "#F7F8F5", use: "Fondo" },
      { name: "Verde hoja", hex: "#1E3A2F", use: "Marca, botones" },
      { name: "Niebla", hex: "#E3EBE5", use: "Superficies" },
      { name: "Rosa empolvado", hex: "#D9A7A0", use: "Acentos, promos" },
      { name: "Grafito", hex: "#14231C", use: "Texto" },
    ],
    drop: "radial-gradient(circle at 40% 40%, #cfe0d5 0 20%, transparent 21%), radial-gradient(circle at 62% 60%, #efcfca 0 20%, transparent 21%), linear-gradient(135deg, #eef3ef, #fbfcfa)",
  },
];

const products = [
  {
    name: "Jabón de limpieza íntimo prebiótico",
    brand: "Sulderm",
    tag: "pH 4,5 · Íntimo",
    price: 38000,
    img: "/estilos/sulderm-jabon-intimo.webp",
  },
  {
    name: "Contorno de ojos bolsas y ojeras",
    brand: "Sulderm",
    tag: "Ojeras · AM/PM",
    price: 32000,
    img: "/estilos/sulderm-contorno-ojos.webp",
  },
  {
    name: "Fine Smooth",
    brand: "FINE",
    tag: "Nutricosmética",
    price: 70000,
    img: "/estilos/fine-smooth.webp",
  },
];

const concerns = ["Acné", "Manchas", "Rosácea", "Hidratación", "Antiedad", "Ojeras"];

export default function EstilosPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-10 max-w-2xl">
        <p className="text-sm tracking-[0.2em] text-muted-foreground uppercase">
          Fase 2 · Style tiles
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-balance sm:text-4xl">
          Elegí la dirección visual de la nueva tienda
        </h1>
        <p className="mt-3 text-muted-foreground">
          Dos propuestas con el logo y fotos reales. Los círculos del hero marcan dónde va la
          animación WebGL de las gotas. Mirala también en el celular.
        </p>
      </header>

      <div className="grid gap-12 lg:grid-cols-2">
        {tiles.map((t) => (
          <StyleTile key={t.id} tile={t} />
        ))}
      </div>
    </main>
  );
}

function StyleTile({ tile: t }: { tile: Tile }) {
  const v = {
    "--bg": t.c.bg,
    "--surface": t.c.surface,
    "--ink": t.c.ink,
    "--muted": t.c.muted,
    "--line": t.c.line,
    background: t.c.bg,
    color: t.c.ink,
  } as CSSProperties;

  return (
    <section
      aria-labelledby={`tile-${t.id}`}
      style={v}
      className={`${t.sans} overflow-hidden rounded-2xl border`}
    >
      {/* Header con logo */}
      <div
        style={{ background: t.c.brand }}
        className="flex items-center justify-between gap-3 px-5 py-4"
      >
        <Image
          src="/estilos/logo-crema.webp"
          alt="Balance"
          width={74}
          height={56}
          className="h-10 w-auto"
        />
        <span style={{ color: t.c.bg }} className="text-xs tracking-[0.18em] uppercase opacity-90">
          12 cuotas sin interés
        </span>
      </div>

      <div className="space-y-8 p-5 sm:p-7">
        <div>
          <h2 id={`tile-${t.id}`} className={`${t.display} text-2xl font-semibold`}>
            {t.name}
          </h2>
          <p style={{ color: t.c.muted }} className="mt-2 text-[15px] leading-relaxed">
            {t.concept}
          </p>
        </div>

        {/* Hero */}
        <div style={{ background: t.drop }} className="rounded-xl px-5 py-10 sm:px-8 sm:py-14">
          <p style={{ color: t.c.muted }} className="text-xs tracking-[0.2em] uppercase">
            Dermocosmética
          </p>
          <p
            className={`${t.display} mt-2 text-[clamp(2rem,7vw,3.25rem)] leading-[1.02] font-semibold text-balance`}
          >
            Tu piel, en equilibrio.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Btn bg={t.c.accent} fg={t.c.accentInk}>
              Comprar por preocupación
            </Btn>
            <Btn bg="transparent" fg={t.c.ink} border={t.c.ink}>
              Armá tu rutina
            </Btn>
          </div>
        </div>

        {/* Chips de preocupación */}
        <div>
          <Label muted={t.c.muted}>Comprar por preocupación</Label>
          <div className="mt-3 flex flex-wrap gap-2">
            {concerns.map((c) => (
              <span
                key={c}
                style={{ background: t.c.soft, color: t.c.ink }}
                className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium"
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* Tarjetas de producto */}
        <div>
          <Label muted={t.c.muted}>Tarjeta de producto</Label>
          <div className="mt-3 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
            {products.slice(0, 2).map((p) => (
              <ProductCard key={p.name} p={p} t={t} />
            ))}
          </div>
        </div>

        {/* Paleta */}
        <div>
          <Label muted={t.c.muted}>Paleta</Label>
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {t.palette.map((sw) => (
              <li
                key={sw.hex}
                className="overflow-hidden rounded-lg border"
                style={{ borderColor: t.c.line }}
              >
                <div style={{ background: sw.hex }} className="h-14" />
                <div className="p-2 text-xs leading-tight break-words">
                  <div className="font-medium">{sw.name}</div>
                  <div style={{ color: t.c.muted }}>{sw.hex}</div>
                  <div style={{ color: t.c.muted }}>{sw.use}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Tipografía */}
        <div>
          <Label muted={t.c.muted}>Tipografía</Label>
          <p className={`${t.display} mt-3 text-4xl font-semibold`}>Aa — {t.displayName}</p>
          <p className="mt-1 text-base">
            Aa — {t.sansName}: textos, botones y precios {formatARS(38000)}
          </p>
        </div>

        {/* Producto destacado con foto horizontal */}
        <ProductFeature p={products[2]} t={t} />
      </div>
    </section>
  );
}

function ProductCard({ p, t }: { p: (typeof products)[number]; t: Tile }) {
  return (
    <article
      style={{ background: t.c.surface, borderColor: t.c.line }}
      className="flex flex-col overflow-hidden rounded-xl border"
    >
      <div className="relative aspect-square">
        <Image
          src={p.img}
          alt={`${p.name} ${p.brand}`}
          fill
          sizes="(min-width: 1024px) 260px, (min-width: 420px) 45vw, 90vw"
          className="object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <span style={{ color: t.c.muted }} className="text-xs tracking-wide uppercase">
          {p.brand} · {p.tag}
        </span>
        <h3 className={`${t.display} text-lg leading-snug font-semibold`}>{p.name}</h3>
        <PriceBlock price={p.price} t={t} />
        <div className="mt-auto pt-3">
          <Btn bg={t.c.accent} fg={t.c.accentInk} full>
            Agregar al carrito
          </Btn>
        </div>
      </div>
    </article>
  );
}

function ProductFeature({ p, t }: { p: (typeof products)[number]; t: Tile }) {
  return (
    <article
      style={{ background: t.c.soft }}
      className="grid overflow-hidden rounded-xl sm:grid-cols-2"
    >
      <div className="relative aspect-[4/3] sm:aspect-auto">
        <Image
          src={p.img}
          alt={`${p.name} ${p.brand}`}
          fill
          sizes="(min-width: 640px) 300px, 90vw"
          className="object-cover"
        />
      </div>
      <div className="p-5">
        <span style={{ color: t.c.muted }} className="text-xs tracking-wide uppercase">
          Activo protagonista
        </span>
        <h3 className={`${t.display} mt-1 text-2xl font-semibold`}>{p.name}</h3>
        <p style={{ color: t.c.muted }} className="mt-2 text-[15px]">
          Péptidos de colágeno, coenzima Q10 y zinc. Así se vería la sección con la animación de la
          gota cambiando de color según el activo.
        </p>
        <PriceBlock price={p.price} t={t} />
      </div>
    </article>
  );
}

function PriceBlock({ price, t }: { price: number; t: Tile }) {
  return (
    <div className="mt-1 tabular-nums">
      <div className="text-lg font-semibold">{formatARS(price)}</div>
      <div className="text-sm">
        <span style={{ background: t.c.soft }} className="rounded px-1.5 py-0.5 font-medium">
          {formatARS(priceWithPaymentDiscount(price, 10))}
        </span>{" "}
        <span style={{ color: t.c.muted }}>con transferencia</span>
      </div>
      <div style={{ color: t.c.muted }} className="text-sm">
        6 cuotas sin interés de {formatARS(installmentAmount(price, 6))}
      </div>
    </div>
  );
}

function Btn({
  children,
  bg,
  fg,
  border,
  full,
}: {
  children: ReactNode;
  bg: string;
  fg: string;
  border?: string;
  full?: boolean;
}) {
  return (
    <button
      type="button"
      style={{ background: bg, color: fg, borderColor: border ?? bg }}
      className={`inline-flex min-h-11 items-center justify-center rounded-full border px-5 text-sm font-medium transition-transform duration-150 ease-out hover:-translate-y-0.5 active:translate-y-0 ${full ? "w-full" : ""}`}
    >
      {children}
    </button>
  );
}

function Label({ children, muted }: { children: ReactNode; muted: string }) {
  return (
    <p style={{ color: muted }} className="text-xs font-medium tracking-[0.18em] uppercase">
      {children}
    </p>
  );
}
