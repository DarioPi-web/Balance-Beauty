import { describe, expect, it } from "vitest";
import { checkoutSchema, postalCode } from "@/lib/validation/checkout";

const base = {
  email: "  Ana@Example.com ",
  fullName: "Ana Pérez",
  phone: "11 2345-6789",
  dni: "30.123.456",
  paymentMethod: "mercadopago" as const,
  acceptTerms: true as const,
};

const home = {
  ...base,
  shippingMethod: "home_delivery" as const,
  address: {
    street: "Av. Santa Fe",
    number: "1234",
    floorApt: "3B",
    city: "CABA",
    province: "Ciudad Autónoma de Buenos Aires" as const,
    postalCode: "c1425abc",
  },
};

describe("checkoutSchema", () => {
  it("acepta y normaliza un pedido a domicilio", () => {
    const r = checkoutSchema.safeParse(home);
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.email).toBe("ana@example.com");
    expect(r.data.dni).toBe("30123456");
    expect(r.data.phone).toBe("1123456789");
    expect(r.data.shippingMethod === "home_delivery" && r.data.address.postalCode).toBe("C1425ABC");
    expect(r.data.marketingOptIn).toBe(false);
  });

  it("retiro en sucursal no exige calle ni altura", () => {
    const r = checkoutSchema.safeParse({
      ...base,
      shippingMethod: "branch_pickup",
      address: { postalCode: "5000", city: "Córdoba", province: "Córdoba" },
    });
    expect(r.success).toBe(true);
  });

  it.each([
    ["email", { ...home, email: "no-es-email" }, "email válido"],
    ["nombre sin apellido", { ...home, fullName: "Ana" }, "nombre y apellido"],
    ["DNI corto", { ...home, dni: "12345" }, "DNI"],
    ["celular", { ...home, phone: "1234" }, "celular"],
    ["provincia", { ...home, address: { ...home.address, province: "Narnia" } }, "provincia"],
    ["términos", { ...home, acceptTerms: false }, "términos"],
    ["altura", { ...home, address: { ...home.address, number: "abc" } }, "altura"],
  ])("rechaza %s con mensaje claro", (_, input, msg) => {
    const r = checkoutSchema.safeParse(input);
    expect(r.success).toBe(false);
    if (r.success) return;
    expect(r.error.issues.map((i) => i.message).join(" ")).toContain(msg);
  });
});

describe("postalCode", () => {
  it.each([
    ["1425", "1425"],
    ["C1425ABC", "C1425ABC"],
    [" x5000abc ", "X5000ABC"],
  ])("válido: %s → %s", (cp, normalized) => {
    expect(postalCode.parse(cp)).toBe(normalized);
  });
  it.each(["142", "14255", "C1425AB", "ABCD"])("inválido: %s", (cp) => {
    expect(postalCode.safeParse(cp).success).toBe(false);
  });
});
