import "server-only";

import { createClient } from "@supabase/supabase-js";
import {
  getSupabaseServerEnv,
  SUPABASE_CONFIG_ERROR_MESSAGE,
} from "@/lib/supabase/env";

export { SUPABASE_CONFIG_ERROR_MESSAGE };

export function createSupabaseServerClient() {
  const { url, anonKey } = getSupabaseServerEnv();

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
