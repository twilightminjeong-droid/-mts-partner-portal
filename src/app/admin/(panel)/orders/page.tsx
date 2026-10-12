import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { Badge } from "@/components/ui/Badge";
import { EmptyRow, FilterTabs, PageHeader, Panel, Td, Th, btnPrimary, btnSmDanger } from "@/components/ui/kit";
import { ORDER_STATUS_MAP, formatDate, orderGroupFilter, orderGroupTabs } from "@/lib/utils";
import { cancelOrder } from "@/app/admin/actions";

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status } = await searchParams;

  const [all, orders] = await Promise.all([
    db.order.findMany({ select: { status: true } }),
    db.order.findMany({
      where: orderGroupFilter(status),
      include: { partner: true, _count: { select: { attachments: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const today = new Date();

  return (
    <div className="p-7">
      <PageHeader title="발주 관리" sub="협력사에 발주서를 내고 진행 상태를 확인합니다"
        action={<Link href="/admin/orders/new" className={btnPrimary}>+ 발주 등록</Link>} />

      <Panel title="발주 목록" action={<FilterTabs base="/admin/orders" current={status} tabs={orderGroupTabs(all.map(o => o.status))} />}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <Th>발주번호</Th><Th>협력사</Th><Th>품목</Th><Th>규격</Th><Th right>수량</Th>
                <Th right>공급가액</Th><Th>납기일</Th><Th>상태</Th><Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.length === 0 ? <EmptyRow cols={9} text="해당하는 발주가 없습니다" /> : orders.map(o => {
                const late = ["PENDING", "DELIVERING"].includes(o.status) && o.dueDate < today;
                return (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">
                      <Link href={`/admin/orders/${o.id}`} className="text-blue-600 hover:underline">{o.orderNo}</Link>
                    </td>
                    <Td>{o.partner.name}</Td>
                    <Td strong>
                      {o.itemName}
                      {o._count.attachments > 0 && <span className="ml-1.5 text-[11px] font-normal text-slate-400">· 첨부 {o._count.attachments}</span>}
                    </Td>
                    <Td muted>{o.spec ?? "—"}</Td>
                    <Td right>{o.quantity.toLocaleString()} {o.unit}</Td>
                    <Td right strong>{o.totalPrice.toLocaleString()}</Td>
                    <td className={`px-4 py-3 text-sm whitespace-nowrap tabular-nums ${late ? "text-red-600 font-semibold" : "text-slate-700"}`}>
                      {formatDate(o.dueDate)}{late && " · 경과"}
                    </td>
                   <Td><Badge {...ORDER_STATUS_MAP[o.status]} /></Td>
                    <Td right>
                      {o.status === "PENDING" && (
                        <form action={cancelOrder.bind(null, o.id)}>
                          <button className={btnSmDanger}>발주 취소</button>
                        </form>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
