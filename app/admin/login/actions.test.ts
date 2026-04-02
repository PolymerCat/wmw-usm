import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { createSupabaseServerActionClient } from "@/lib/supabase/auth-server";
import { signInWithEmailPassword } from "@/app/admin/login/actions";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/supabase/auth-server", () => ({
  createSupabaseServerActionClient: vi.fn(),
}));

describe("signInWithEmailPassword", () => {
  const redirectMock = vi.mocked(redirect);
  const createClientMock = vi.mocked(createSupabaseServerActionClient);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns validation error when email or password is missing", async () => {
    const formData = new FormData();
    formData.set("email", "");
    formData.set("password", "");

    const result = await signInWithEmailPassword({ ok: false, message: "" }, formData);

    expect(result).toEqual({
      ok: false,
      message: "Email and password are required.",
    });
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("returns auth error message when sign-in fails", async () => {
    createClientMock.mockResolvedValue({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          error: { message: "Invalid login credentials" },
        }),
      },
    } as never);

    const formData = new FormData();
    formData.set("email", "admin@example.com");
    formData.set("password", "wrong-password");

    const result = await signInWithEmailPassword({ ok: false, message: "" }, formData);

    expect(result).toEqual({
      ok: false,
      message: "Sign in failed. Please check your credentials.",
    });
  });

  it("redirects to sanitized admin next path on success", async () => {
    createClientMock.mockResolvedValue({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          error: null,
        }),
      },
    } as never);

    const formData = new FormData();
    formData.set("email", "admin@example.com");
    formData.set("password", "correct-password");
    formData.set("next", "https://malicious.example/phish");

    await signInWithEmailPassword({ ok: false, message: "" }, formData);

    expect(redirectMock).toHaveBeenCalledWith("/admin");
  });

  it("redirects to safe admin next path when provided", async () => {
    createClientMock.mockResolvedValue({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          error: null,
        }),
      },
    } as never);

    const formData = new FormData();
    formData.set("email", "admin@example.com");
    formData.set("password", "correct-password");
    formData.set("next", "/admin/reports");

    await signInWithEmailPassword({ ok: false, message: "" }, formData);

    expect(redirectMock).toHaveBeenCalledWith("/admin/reports");
  });
});
