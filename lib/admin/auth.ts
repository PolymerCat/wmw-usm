import "server-only";

type UserLike = {
  email?: string | null;
};

type ErrorLike = {
  message: string;
} | null;

export type AdminSupabaseClient = {
  auth: {
    getUser: () => Promise<{
      data: { user: UserLike | null };
      error: ErrorLike;
    }>;
  };
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{
          data: unknown;
          error: ErrorLike;
        }>;
      };
    };
  };
};

export type AdminGuardResult =
  | { ok: true; email: string }
  | { ok: false; reason: "unauthenticated" | "forbidden" | "error"; message: string };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getSessionEmail(user: UserLike | null): string | null {
  if (!user?.email) {
    return null;
  }

  return normalizeEmail(user.email);
}

export async function isAdminForEmail(
  supabase: Pick<AdminSupabaseClient, "from">,
  email: string
): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email);

  const { data, error } = await supabase
    .from("admin_users")
    .select("email")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (error) {
    console.error("[wmw-usm]", {
      area: "auth",
      operation: "admin_allowlist_lookup",
      message: error.message,
    });
    return false;
  }

  if (!data || typeof data !== "object") {
    return false;
  }

  const row = data as { email?: unknown };
  if (typeof row.email !== "string") {
    return false;
  }

  return normalizeEmail(row.email) === normalizedEmail;
}

export async function requireAdminUser(
  supabase: AdminSupabaseClient
): Promise<AdminGuardResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("[wmw-usm]", {
      area: "auth",
      operation: "auth_get_user",
      message: userError.message,
    });
    return {
      ok: false,
      reason: "error",
      message: "Could not verify the current session.",
    };
  }

  const email = getSessionEmail(user);
  if (!email) {
    return {
      ok: false,
      reason: "unauthenticated",
      message: "Please sign in to continue.",
    };
  }

  const isAdmin = await isAdminForEmail(supabase, email);
  if (!isAdmin) {
    return {
      ok: false,
      reason: "forbidden",
      message: "This account is not authorized for admin access.",
    };
  }

  return { ok: true, email };
}
