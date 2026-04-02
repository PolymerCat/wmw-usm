import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import {
  createSupabaseServerClient,
  SUPABASE_CONFIG_ERROR_MESSAGE,
} from "@/lib/supabase/server";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ mocked: true })),
}));

describe("createSupabaseServerClient", () => {
  const createClientMock = vi.mocked(createClient);
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("logs redacted env status and throws a safe config error when env vars are missing", () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => createSupabaseServerClient()).toThrow(
      SUPABASE_CONFIG_ERROR_MESSAGE
    );
    expect(errorSpy).toHaveBeenCalledWith(
      "[wmw-usm]",
      expect.objectContaining({
        area: "config",
        operation: "supabase_env_validation",
        hasSupabaseUrl: false,
        hasAnonKey: false,
      })
    );
  });

  it("creates a Supabase client when env vars are present", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "public-anon-key";

    createSupabaseServerClient();

    expect(createClientMock).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "public-anon-key",
      expect.objectContaining({
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    );
  });
});
