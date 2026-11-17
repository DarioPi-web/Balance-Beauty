import { describe, expect, it } from "vitest";
import {
  formatARS,
  installmentAmount,
  priceWithPaymentDiscount,
  remainingToThreshold,
} from "@/lib/pricing";

describe("formatARS", () => {
  it("formatea pesos sin decimales con separador de miles", () => {
    const out = formatARS(25000);
    expect(out).toContain("25.000");
    expect(out).not.toContain(",");
  });
});

describe("priceWithPaymentDiscount", () => {
  it("aplica 10 % y redondea hacia abajo", () => {
    expect(priceWithPaymentDiscount(25000, 10)).toBe(22500);
    expect(priceWithPaymentDiscount(29999, 10)).toBe(26999);
  });
  it("rechaza valores inválidos", () => {
    expect(() => priceWithPaymentDiscount(-1, 10)).toThrow();
    expect(() => priceWithPaymentDiscount(100, 120)).toThrow();
  });
});

describe("installmentAmount", () => {
  it("divide y redondea hacia arriba", () => {
    expect(installmentAmount(150000, 12)).toBe(12500);
    expect(installmentAmount(100000, 12)).toBe(8334);
  });
  it("rechaza cuotas inválidas", () => {
    expect(() => installmentAmount(1000, 0)).toThrow();
  });
});

describe("remainingToThreshold", () => {
  it("calcula lo que falta para 12 cuotas", () => {
    expect(remainingToThreshold(137700, 150000)).toBe(12300);
    expect(remainingToThreshold(160000, 150000)).toBe(0);
  });
});
