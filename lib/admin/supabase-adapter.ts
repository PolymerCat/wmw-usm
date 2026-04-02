import type { AdminSupabaseClient } from "@/lib/admin/auth";

type AdminSupabaseSource = {
  auth: {
    getUser: () => Promise<{
      data: { user: { email?: string | null } | null };
      error: unknown;
    }>;
  };
  from: (table: string) => unknown;
};

function normalizeError(error: unknown): { message: string } | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const maybeError = error as { message?: unknown };
  if (typeof maybeError.message !== "string") {
    return null;
  }

  return { message: maybeError.message };
}

export function toAdminSupabaseClient(source: AdminSupabaseSource): AdminSupabaseClient {
  return {
    auth: {
      async getUser() {
        const { data, error } = await source.auth.getUser();
        return {
          data: {
            user: data?.user ?? null,
          },
          error: normalizeError(error),
        };
      },
    },
    from(table: string) {
      const tableQuery = source.from(table) as {
        select: (columns: string) => {
          eq: (column: string, value: string) => {
            maybeSingle: () => Promise<{
              data: unknown;
              error: unknown;
            }>;
          };
        };
      };

      return {
        select(columns: string) {
          const selectQuery = tableQuery.select(columns);

          return {
            eq(column: string, value: string) {
              const eqQuery = selectQuery.eq(column, value);

              return {
                async maybeSingle() {
                  const { data, error } = await eqQuery.maybeSingle();

                  return {
                    data,
                    error: normalizeError(error),
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}
