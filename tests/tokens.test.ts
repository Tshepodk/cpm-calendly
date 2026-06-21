import { describe, it, expect } from "vitest";
import { newManageToken, isValidTokenShape } from "@/lib/tokens";

describe("manageToken", () => {
  it("generates a 64-character hex token", () => {
    const t = newManageToken();
    expect(t).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces unique tokens", () => {
    const a = newManageToken();
    const b = newManageToken();
    expect(a).not.toBe(b);
  });

  it("validates token shape", () => {
    expect(isValidTokenShape(newManageToken())).toBe(true);
    expect(isValidTokenShape("short")).toBe(false);
    expect(isValidTokenShape("z".repeat(64))).toBe(false);
  });
});
