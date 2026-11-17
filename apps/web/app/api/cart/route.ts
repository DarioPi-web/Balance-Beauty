import { readCart } from "@/lib/cart/server";

/** Lectura del carrito para el mini-carrito (dinámica: depende de la cookie, nunca se cachea). */
export async function GET() {
  const cart = await readCart();
  return Response.json(cart, { headers: { "Cache-Control": "private, no-store" } });
}
