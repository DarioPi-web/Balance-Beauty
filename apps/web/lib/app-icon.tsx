import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";

/**
 * Ícono PROVISIONAL (monograma "B") hasta tener el logo vectorial (Q-12).
 * `maskable`: deja ~20 % de margen de seguridad para que Android pueda recortarlo en círculo/squircle.
 */
export function renderAppIcon(size: number, { maskable = false }: { maskable?: boolean } = {}) {
  const glyph = Math.round(size * (maskable ? 0.42 : 0.58));
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: brand.colors.leaf,
        color: brand.colors.clinical,
        fontSize: glyph,
        fontWeight: 600,
        letterSpacing: "-0.04em",
        borderRadius: maskable ? 0 : Math.round(size * 0.22),
      }}
    >
      B
    </div>,
    { width: size, height: size },
  );
}
