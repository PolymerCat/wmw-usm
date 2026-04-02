import { redirect } from "next/navigation";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { signOutAdmin } from "@/app/admin/actions";
import { requireAdminUser } from "@/lib/admin/auth";
import { toAdminSupabaseClient } from "@/lib/admin/supabase-adapter";
import { getBuildings } from "@/lib/data";
import { createSupabaseServerAuthClient } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";

function UnauthorizedState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#d4c6e8] bg-white p-6 shadow-sm">
        <h1 className="font-display text-2xl font-bold text-[#301a55]">Access denied</h1>
        <p className="mt-2 text-sm text-[#5a4973]">
          Your account is signed in, but it is not on the admin allowlist.
        </p>
        <form action={signOutAdmin} className="mt-5">
          <button
            type="submit"
            className="w-full rounded-xl bg-[var(--brand-600)] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--brand-700)]"
          >
            Sign Out
          </button>
        </form>
      </div>
    </main>
  );
}

export default async function AdminPage() {
  const supabase = await createSupabaseServerAuthClient();
  const guard = await requireAdminUser(toAdminSupabaseClient(supabase));

  if (!guard.ok) {
    if (guard.reason === "unauthenticated") {
      redirect("/admin/login");
    }

    return <UnauthorizedState />;
  }

  const buildings = await getBuildings();

  return <AdminDashboard buildings={buildings} adminEmail={guard.email} />;
}
