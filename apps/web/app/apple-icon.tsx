import { renderAppIcon } from "@/lib/app-icon";

// iOS aplica sus propias esquinas redondeadas: se entrega cuadrado y sin transparencia.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return renderAppIcon(size.width, { maskable: true });
}
