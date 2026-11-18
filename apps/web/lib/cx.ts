import { clsx, type ClassValue } from "clsx";

/**
 * Une clases SIN resolver conflictos de Tailwind (≈ 0,3 KB vs ≈ 8 KB de tailwind-merge).
 * Usar en componentes cliente de la ruta crítica (header, bottom nav, toasts) cuando las
 * clases que se suman no pisan a las base. Si hace falta que "la última gane", usar `cn`.
 */
export function cx(...inputs: ClassValue[]) {
  return clsx(inputs);
}
