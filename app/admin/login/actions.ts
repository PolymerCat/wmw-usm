"use server";

import { redirect } from "next/navigation";
import { resolveAdminNextPath } from "@/lib/admin/redirect";
import { createSupabaseServerActionClient } from "@/lib/supabase/auth-server";

export type LoginState = {
  ok: boolean;
  message: string;
};

export async function signInWithEmailPassword(
  _previousState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const nextValue = formData.get("next");
  const nextPath = resolveAdminNextPath(
    typeof nextValue === "string" ? nextValue : undefined
  );

  if (!email || !password) {
    return {
      ok: false,
      message: "Email and password are required.",
    };
  }

  const supabase = await createSupabaseServerActionClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      ok: false,
      message: "Sign in failed. Please check your credentials.",
    };
  }

  redirect(nextPath);
}
