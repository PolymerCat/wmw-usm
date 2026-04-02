import { describe, expect, it, vi } from "vitest";
import { getSessionEmail, requireAdminUser } from "@/lib/admin/auth";

function makeSupabase({
  userEmail,
  adminEmail,
  authError = null,
  allowlistError = null,
}: {
  userEmail: string | null;
  adminEmail: string | null;
  authError?: { message: string } | null;
  allowlistError?: { message: string } | null;
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userEmail ? { email: userEmail } : null },
        error: authError,
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: adminEmail ? { email: adminEmail } : null,
            error: allowlistError,
          }),
        }),
      }),
    }),
  };
}

describe("admin auth helpers", () => {
  it("normalizes session emails to lowercase", () => {
    expect(getSessionEmail({ email: "  Admin@Example.COM " })).toBe(
      "admin@example.com"
    );
  });

  it("returns unauthenticated when there is no active user", async () => {
    const supabase = makeSupabase({ userEmail: null, adminEmail: null });

    const result = await requireAdminUser(supabase as never);

    expect(result).toEqual({
      ok: false,
      reason: "unauthenticated",
      message: "Please sign in to continue.",
    });
  });

  it("returns forbidden when signed-in user is not on admin allowlist", async () => {
    const supabase = makeSupabase({
      userEmail: "staff@example.com",
      adminEmail: null,
    });

    const result = await requireAdminUser(supabase as never);

    expect(result).toEqual({
      ok: false,
      reason: "forbidden",
      message: "This account is not authorized for admin access.",
    });
  });

  it("returns ok with normalized email for valid admin users", async () => {
    const supabase = makeSupabase({
      userEmail: "Admin@Example.com",
      adminEmail: "admin@example.com",
    });

    const result = await requireAdminUser(supabase as never);

    expect(result).toEqual({
      ok: true,
      email: "admin@example.com",
    });
  });
});
