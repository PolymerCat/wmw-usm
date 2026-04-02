"use client";

import { useEffect } from "react";

type RouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function RouteError({ error, reset }: RouteErrorProps) {
  useEffect(() => {
    console.error("[wmw-usm]", {
      area: "app",
      operation: "route_error_boundary",
      message: error.message,
      digest: error.digest ?? null,
    });
  }, [error]);

  return (
    <main className="grid min-h-[100svh] place-items-center bg-background px-6">
      <section className="w-full max-w-xl rounded-2xl border border-[#d8cbe9] bg-white p-8 text-center shadow-[0_20px_35px_-28px_rgba(67,26,124,0.75)]">
        <h1 className="font-display text-3xl font-black text-[#311a57] md:text-4xl">
          We hit a temporary issue
        </h1>
        <p className="mt-3 text-base font-semibold text-[#4a3a66]">
          We could not load the water refill map right now. Please try again.
        </p>
        <p className="mt-2 text-sm text-[#5f5275]">
          If this keeps happening, contact the project maintainer.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-[var(--brand-600)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--brand-700)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
