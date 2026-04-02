import "server-only";

import { createClient } from "@supabase/supabase-js";

export const SUPABASE_CONFIG_ERROR_MESSAGE = "Service configuration is incomplete.";

function getSupabaseEnv() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.error("[wmw-usm]", {
      area: "config",
      operation: "supabase_env_validation",
      hasSupabaseUrl: Boolean(url),
      hasAnonKey: Boolean(anonKey),
    });
    throw new Error(SUPABASE_CONFIG_ERROR_MESSAGE);
  }

  return { url, anonKey };
}

export function createSupabaseServerClient() {
  const { url, anonKey } = getSupabaseEnv();

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
