import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { TopNav } from "@/components/layout/TopNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  const [deliveries, invoices] = await Promise.all([
    db.delivery.count({ where: { status: { in: ["SUBMITTED", "INSPECTING"] } } }),
    db.invoice.count({ where: { status: { in: ["ISSUED", "REVIEWING", "APPROVED"] } } }),
  ]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <TopNav
        variant="admin"
        userName={user.name ?? "관리자"}
        userSub={`${user.grade} · ${user.code}`}
        badges={{ deliveries, invoices }}
      />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
    </div>
  );
}
