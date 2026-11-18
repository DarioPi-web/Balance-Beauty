"use client";

import { useTransition } from "react";
import { toast } from "@/components/ui/toast";
import { addManyToCart, addToCart } from "@/actions/cart";
import { cx } from "@/lib/cx";
import { cartStore } from "./cart-store";

/** Agrega un producto (o varios: rutina) y abre el mini-carrito con el resultado. */
export function AddToCartButton({
  slug,
  slugs,
  label = "Agregar al carrito",
  disabled,
  className,
}: {
  slug?: string;
  slugs?: string[];
  label?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [pending, start] = useTransition();

  const onClick = () =>
    start(async () => {
      const res = slugs ? await addManyToCart({ slugs }) : await addToCart({ slug: slug!, qty: 1 });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      cartStore.setView(res.cart);
      cartStore.open(res.cart);
      toast.success(slugs ? "Rutina agregada al carrito" : "Agregado al carrito");
    });

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      aria-busy={pending}
      className={cx(
        "inline-flex min-h-12 items-center justify-center rounded-full bg-leaf px-6 text-base font-medium text-clinical transition-colors hover:bg-leaf-hover disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      {pending ? "Agregando…" : label}
    </button>
  );
}
