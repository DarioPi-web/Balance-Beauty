/** Roles de usuario (enum public.user_role) con su explicación para el admin. */
export const ROLES = ["customer", "wholesale", "staff", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_INFO: Record<
  Role,
  { label: string; short: string; grants: string; elevated: boolean }
> = {
  customer: {
    label: "Cliente",
    short: "Compra en la tienda",
    grants: "Compra con precios de lista y ve sus pedidos en Mi cuenta.",
    elevated: false,
  },
  wholesale: {
    label: "Mayorista",
    short: "Precios mayoristas",
    grants: "Compra con precios mayoristas. Queda aprobada al asignarle este rol.",
    elevated: false,
  },
  staff: {
    label: "Equipo",
    short: "Opera el admin",
    grants: "Entra al administrador: pedidos, productos, stock, vendedoras e integraciones.",
    elevated: true,
  },
  admin: {
    label: "Administración",
    short: "Acceso total",
    grants: "Acceso total al administrador, incluido cambiar los roles de otras personas.",
    elevated: true,
  },
};

export function isRole(v: unknown): v is Role {
  return typeof v === "string" && (ROLES as readonly string[]).includes(v);
}
