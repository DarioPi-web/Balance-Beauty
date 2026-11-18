import { describe, expect, it } from "vitest";
import { isAuthorized, parseTags } from "@/lib/cache/revalidate";

const secret = "s".repeat(32);

describe("revalidación por tags", () => {
  it("exige Bearer con el secreto exacto", () => {
    expect(isAuthorized(`Bearer ${secret}`, secret)).toBe(true);
    expect(isAuthorized(`Bearer ${secret}x`, secret)).toBe(false);
    expect(isAuthorized(secret, secret)).toBe(false);
    expect(isAuthorized(null, secret)).toBe(false);
    expect(isAuthorized(`Bearer ${secret}`, undefined)).toBe(false);
    expect(isAuthorized("Bearer corto", "corto")).toBe(false);
  });

  it("acepta solo tags conocidos", () => {
    expect(parseTags({})).toEqual(["catalog"]);
    expect(parseTags({ tags: ["catalog", "shipping", "catalog"] })).toEqual([
      "catalog",
      "shipping",
    ]);
    expect(parseTags({ tags: ["otro"] })).toBeNull();
    expect(parseTags({ tags: [] })).toBeNull();
    expect(parseTags({ tags: "catalog" })).toBeNull();
  });
});
