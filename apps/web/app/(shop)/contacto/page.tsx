import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { FacebookIcon, InstagramIcon, TikTokIcon } from "@/components/layout/social-icons";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Escribinos por Instagram, TikTok o Facebook y te asesoramos con tu rutina.",
  alternates: { canonical: "/contacto" },
};

const channels = [
  {
    href: site.social.instagram,
    label: "Instagram",
    handle: "@balancesaludbelleza",
    Icon: InstagramIcon,
  },
  { href: site.social.tiktok, label: "TikTok", handle: "@balancesaludbelleza", Icon: TikTokIcon },
  {
    href: site.social.facebook,
    label: "Facebook",
    handle: "Balance Salud y Belleza",
    Icon: FacebookIcon,
  },
];

export default function ContactoPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Breadcrumbs
        items={[
          { name: "Inicio", path: "/" },
          { name: "Contacto", path: "/contacto" },
        ]}
      />
      <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">Contacto</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        ¿Dudas con un producto o con tu pedido? Escribinos y te asesoramos.
      </p>
      <ul className="mt-6 grid gap-3">
        {channels.map(({ href, label, handle, Icon }) => (
          <li key={label}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-14 items-center gap-4 rounded-2xl border bg-card px-5 py-3 hover:border-leaf"
            >
              <Icon className="h-6 w-6 text-leaf" />
              <span>
                <span className="block font-medium">{label}</span>
                <span className="text-sm text-muted-foreground">{handle}</span>
              </span>
              <span className="sr-only"> (se abre en otra pestaña)</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-muted-foreground">
        Para consultas sobre un pedido, tené a mano el número que figura en el email de
        confirmación.
      </p>
    </main>
  );
}
