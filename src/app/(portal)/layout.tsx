import { requirePartner } from "@/lib/session";
import { db } from "@/lib/db";
import { TopNav } from "@/components/layout/TopNav";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePartner();

  const [orders, statements, invoices] = await Promise.all([
    db.order.count({ where: { partnerId: user.id, status: "PENDING" } }),
    db.delivery.count({ where: { partnerId: user.id, status: "SUBMITTED" } }),
    db.delivery.count({ where: { partnerId: user.id, status: "PASSED", invoices: { none: {} } } }),
  ]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <TopNav
        variant="partner"
        userName={user.name ?? "협력사"}
        userSub={`${user.code} · ${user.grade} 협력사`}
        badges={{ orders, statements, invoices }}
      />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
    </div>
  );
}
