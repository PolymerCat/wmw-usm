import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseServerEnv } from "@/lib/supabase/env";

export async function createSupabaseServerAuthClient() {
  const { url, anonKey } = getSupabaseServerEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components can be read-only for cookies. Middleware handles refresh.
        }
      },
    },
  });
}

export const createSupabaseServerActionClient = createSupabaseServerAuthClient;
