import { formatARS, installmentAmount, priceWithPaymentDiscount } from "@/lib/pricing";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

/** Precio de lista + precio con transferencia + cuotas (docs/14 §4). Puro: sirve en server y client. */
export function PriceBlock({
  price,
  compareAtPrice,
  size = "md",
  className,
}: {
  price: number;
  compareAtPrice?: number | null;
  size?: "md" | "lg";
  className?: string;
}) {
  const transfer = priceWithPaymentDiscount(price, site.transferDiscountPercent);
  const n =
    price >= site.installments.promoMinAmount
      ? site.installments.promo
      : site.installments.standard;

  return (
    <div className={cn("tabular-nums", className)}>
      <div className="flex items-baseline gap-2">
        <span className={cn("font-semibold", size === "lg" ? "text-3xl" : "text-lg")}>
          {formatARS(price)}
        </span>
        {compareAtPrice && compareAtPrice > price ? (
          <s className="text-sm text-muted-foreground">{formatARS(compareAtPrice)}</s>
        ) : null}
      </div>
      <p className={cn(size === "lg" ? "mt-1 text-base" : "text-sm")}>
        <span className="rounded bg-rose-soft px-1.5 py-0.5 font-medium">
          {formatARS(transfer)}
        </span>{" "}
        <span className="text-muted-foreground">con transferencia</span>
      </p>
      <p className={cn("text-muted-foreground", size === "lg" ? "mt-1 text-base" : "text-sm")}>
        {n} cuotas sin interés de {formatARS(installmentAmount(price, n))}
      </p>
    </div>
  );
}
