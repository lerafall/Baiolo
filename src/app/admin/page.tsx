import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

/** Server Component gate — defense in depth beyond middleware. */
export default async function AdminPage() {
  const gate = await requireAdmin();
  if (!gate.ok) {
    if (gate.response.status === 401) {
      redirect("/auth?next=/admin");
    }
    redirect("/");
  }
  return <AdminDashboard />;
}
