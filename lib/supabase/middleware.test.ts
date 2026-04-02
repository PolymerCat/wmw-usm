import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { updateSession } from "@/lib/supabase/middleware";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

vi.mock("@/lib/supabase/env", () => ({
  getSupabaseServerEnv: vi.fn(() => ({
    url: "https://example.supabase.co",
    anonKey: "anon-key",
  })),
}));

describe("admin middleware", () => {
  const createServerClientMock = vi.mocked(createServerClient);

  it("redirects unauthenticated users from /admin to /admin/login", async () => {
    createServerClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
        }),
      },
    } as never);

    const request = new NextRequest("http://localhost/admin");
    const response = await updateSession(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/admin/login?next=%2Fadmin"
    );
  });

  it("redirects authenticated users away from /admin/login to /admin", async () => {
    createServerClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { email: "admin@example.com" } },
        }),
      },
    } as never);

    const request = new NextRequest("http://localhost/admin/login");
    const response = await updateSession(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/admin");
  });

  it("preserves refreshed auth cookies on redirect responses", async () => {
    createServerClientMock.mockImplementation((_, __, options) => {
      options?.cookies?.setAll?.([
        {
          name: "sb-access-token",
          value: "token-value",
          options: { path: "/", httpOnly: true },
        },
      ]);

      return {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
          }),
        },
      } as never;
    });

    const request = new NextRequest("http://localhost/admin");
    const response = await updateSession(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("set-cookie")).toContain("sb-access-token=token-value");
  });
});
