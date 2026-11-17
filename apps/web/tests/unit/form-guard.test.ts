import { describe, expect, it } from "vitest";
import {
  checkFormToken,
  createFormToken,
  hashClientIp,
  MAX_MS,
  MIN_MS,
} from "@/lib/security/form-guard";

const secret = "s".repeat(40);

describe("token de tiempo del checkout", () => {
  const t0 = 1_800_000_000_000;
  const token = createFormToken(secret, t0);

  it("válido entre el mínimo y el máximo", () => {
    expect(checkFormToken(token, secret, t0 + MIN_MS + 1)).toBe("ok");
  });
  it("demasiado rápido = bot", () => {
    expect(checkFormToken(token, secret, t0 + 500)).toBe("too_fast");
  });
  it("vencido", () => {
    expect(checkFormToken(token, secret, t0 + MAX_MS + 1)).toBe("expired");
  });
  it("firma falsa, otro secreto o basura", () => {
    expect(checkFormToken(`${t0}.firma-falsa`, secret, t0 + 5000)).toBe("invalid");
    expect(checkFormToken(token, "otro".repeat(10), t0 + 5000)).toBe("invalid");
    expect(checkFormToken(`${t0 - 60_000}.${token.split(".")[1]}`, secret, t0 + 5000)).toBe(
      "invalid",
    );
    expect(checkFormToken(null, secret)).toBe("invalid");
    expect(checkFormToken("abc", secret)).toBe("invalid");
  });
});

describe("hashClientIp", () => {
  it("usa el primer salto de x-forwarded-for y no expone la IP", () => {
    const h = hashClientIp(new Headers({ "x-forwarded-for": "200.1.2.3, 10.0.0.1" }), secret);
    expect(h).toMatch(/^[0-9a-f]{32}$/);
    expect(h).toBe(hashClientIp(new Headers({ "x-real-ip": "200.1.2.3" }), secret));
    expect(h).not.toContain("200");
  });
  it("sin IP → null", () => {
    expect(hashClientIp(new Headers(), secret)).toBeNull();
  });
});
