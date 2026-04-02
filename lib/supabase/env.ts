export const SUPABASE_CONFIG_ERROR_MESSAGE = "Service configuration is incomplete.";

type SupabaseEnv = {
  url: string;
  anonKey: string;
};

function logMissingSupabaseEnv(hasSupabaseUrl: boolean, hasAnonKey: boolean) {
  console.error("[wmw-usm]", {
    area: "config",
    operation: "supabase_env_validation",
    hasSupabaseUrl,
    hasAnonKey,
  });
}

export function getSupabaseServerEnv(): SupabaseEnv {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    logMissingSupabaseEnv(Boolean(url), Boolean(anonKey));
    throw new Error(SUPABASE_CONFIG_ERROR_MESSAGE);
  }

  return { url, anonKey };
}

export function getSupabaseBrowserEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    logMissingSupabaseEnv(Boolean(url), Boolean(anonKey));
    throw new Error(SUPABASE_CONFIG_ERROR_MESSAGE);
  }

  return { url, anonKey };
}
