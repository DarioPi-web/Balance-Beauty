import Image from "next/image";
import type { ProductImage } from "@/lib/catalog/types";
import { cn } from "@/lib/utils";

/** Foto del producto o, si todavía no tiene, un placeholder de marca (hojas del logo). */
export function ProductMedia({
  image,
  name,
  brand,
  sizes,
  priority,
  zoom,
  className,
}: {
  image?: ProductImage;
  name: string;
  brand: string | null;
  sizes: string;
  priority?: boolean;
  /** Acerca el encuadre al producto (las fotos de estudio tienen mucho fondo). */
  zoom?: boolean;
  className?: string;
}) {
  if (image) {
    return (
      <div className={cn("relative overflow-hidden bg-mist", className)}>
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={sizes}
          // Next 16: para la imagen LCP, fetchPriority + eager (priority quedó deprecado)
          {...(priority ? { fetchPriority: "high" as const, loading: "eager" as const } : {})}
          className={cn(
            "object-cover transition-transform duration-500 ease-out",
            zoom && "origin-[50%_62%] scale-[1.45] group-hover:scale-[1.55]",
          )}
        />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 overflow-hidden bg-mist p-6 text-center",
        className,
      )}
      role="img"
      aria-label={`${name}${brand ? ` de ${brand}` : ""} (foto próximamente)`}
    >
      <LeafMark className="h-10 w-10 text-leaf/40" />
      <span className="font-display text-lg leading-tight text-leaf">{name}</span>
    </div>
  );
}

export function LeafMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 48" aria-hidden="true" className={className} fill="currentColor">
      <path d="M32 2c7 5 10 11 10 18S39 33 32 38c-7-5-10-11-10-18S25 7 32 2z" />
      <path d="M4 20c9-3 17-1 22 4s7 12 6 18c-9 2-17 0-22-5S3 26 4 20z" opacity=".85" />
      <path d="M60 20c-9-3-17-1-22 4s-7 12-6 18c9 2 17 0 22-5s7-11 6-17z" opacity=".85" />
    </svg>
  );
}
