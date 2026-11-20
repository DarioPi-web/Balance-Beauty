/**
 * Navegación del admin agrupada por tarea (lo diario arriba, la configuración abajo).
 * Fuente única para la barra lateral (desktop) y el menú del celular.
 */
export type NavItem = {
  href: string;
  label: string;
  icon: "today" | "orders" | "products" | "sheet" | "users" | "sellers" | "integrations";
  /** Coincidencia exacta (para /admin) en lugar de prefijo. */
  exact?: boolean;
  description: string;
};

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Operación",
    items: [
      {
        href: "/admin",
        label: "Hoy",
        icon: "today",
        exact: true,
        description: "Lo que necesita atención",
      },
      {
        href: "/admin/pedidos",
        label: "Pedidos",
        icon: "orders",
        description: "Cobrar, despachar, cancelar",
      },
    ],
  },
  {
    label: "Catálogo",
    items: [
      {
        href: "/admin/productos",
        label: "Productos",
        icon: "products",
        description: "Fotos, precios, stock",
      },
      {
        href: "/admin/productos/planilla",
        label: "Editar con Excel",
        icon: "sheet",
        description: "Cambios masivos",
      },
    ],
  },
  {
    label: "Personas",
    items: [
      {
        href: "/admin/usuarios",
        label: "Usuarios y roles",
        icon: "users",
        description: "Accesos y permisos",
      },
      {
        href: "/admin/vendedoras",
        label: "Vendedoras",
        icon: "sellers",
        description: "Códigos y comisiones",
      },
    ],
  },
  {
    label: "Configuración",
    items: [
      {
        href: "/admin/integraciones",
        label: "Integraciones",
        icon: "integrations",
        description: "Pagos, envíos, emails, banco",
      },
    ],
  },
];

const ALL = NAV_GROUPS.flatMap((g) => g.items);

/** Ítem activo para una ruta: el de prefijo más largo (así "Excel" gana sobre "Productos"). */
export function activeNavItem(pathname: string): NavItem | undefined {
  return ALL.filter((i) =>
    i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(`${i.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0];
}
