import { describe, expect, it } from "vitest";
import { resolveAdminNextPath } from "@/lib/admin/redirect";

describe("resolveAdminNextPath", () => {
  it("falls back to /admin when next is missing", () => {
    expect(resolveAdminNextPath(undefined)).toBe("/admin");
  });

  it("accepts admin paths", () => {
    expect(resolveAdminNextPath("/admin/settings")).toBe("/admin/settings");
  });

  it("rejects external and non-admin paths", () => {
    expect(resolveAdminNextPath("https://example.com")).toBe("/admin");
    expect(resolveAdminNextPath("/")).toBe("/admin");
    expect(resolveAdminNextPath("//evil.com/admin")).toBe("/admin");
  });
});
