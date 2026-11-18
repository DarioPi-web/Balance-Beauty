import { LeafMark } from "@/components/shop/product-media";
import { cn } from "@/lib/utils";

/** Logo horizontal: tres hojas + BALANCE / BEAUTY (SVG + texto, sin imagen: 0 KB extra). */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 sm:gap-2.5", className)}>
      <LeafMark className="h-7 w-9 shrink-0 sm:h-11 sm:w-14" />
      {/* < 340 px (Galaxy Fold, iPhone SE estrecho) queda solo la hoja; el nombre sigue para lectores. */}
      <span className="flex flex-col leading-none max-[339px]:sr-only">
        <span className="font-display text-[1.35rem] font-semibold tracking-wide min-[400px]:text-[1.6rem] sm:text-[2.1rem]">
          BALANCE
        </span>{" "}
        <span className="mt-0.5 pl-0.5 text-[0.55rem] tracking-[0.55em] min-[400px]:text-[0.62rem] sm:text-xs sm:tracking-[0.62em]">
          BEAUTY
        </span>
      </span>
    </span>
  );
}
