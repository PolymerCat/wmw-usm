"use client";

import { useActionState } from "react";
import {
  signInWithEmailPassword,
  type LoginState,
} from "@/app/admin/login/actions";

const INITIAL_LOGIN_STATE: LoginState = {
  ok: false,
  message: "",
};

interface LoginFormProps {
  nextPath?: string;
}

export default function LoginForm({ nextPath = "/admin" }: LoginFormProps) {
  const [state, action, pending] = useActionState(
    signInWithEmailPassword,
    INITIAL_LOGIN_STATE
  );

  return (
    <form action={action} className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
      <input type="hidden" name="next" value={nextPath} />
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-semibold text-[#301a55]">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-xl border border-[#d4c6e8] bg-white px-3 py-2.5 text-sm text-[#2f1f49] outline-none transition focus:border-[#8b65c6] focus:ring-2 focus:ring-[#8b65c6]/20"
          placeholder="admin@example.com"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-semibold text-[#301a55]">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-xl border border-[#d4c6e8] bg-white px-3 py-2.5 text-sm text-[#2f1f49] outline-none transition focus:border-[#8b65c6] focus:ring-2 focus:ring-[#8b65c6]/20"
          placeholder="••••••••"
        />
      </div>

      {state.message ? (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            state.ok
              ? "bg-[#e8f7ef] text-[#1d613d]"
              : "bg-[#ffeef1] text-[#8f2e37]"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-[var(--brand-600)] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--brand-700)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
