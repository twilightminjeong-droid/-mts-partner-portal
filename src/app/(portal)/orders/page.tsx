import Link from "next/link";
import { db } from "@/lib/db";
import { requirePartner } from "@/lib/session";
import { Badge } from "@/components/ui/Badge";
import { EmptyRow, FilterTabs, PageHeader, Panel, Td, Th, btnSm, btnSmPrimary } from "@/components/ui/kit";
import { ORDER_STATUS_MAP, formatDate, orderGroupFilter, orderGroupTabs } from "@/lib/utils";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { id: partnerId } = await requirePartner();
  const { status } = await searchParams;

  const [all, orders] = await Promise.all([
    db.order.findMany({ where: { partnerId }, select: { status: true } }),
    db.order.findMany({
      where: { partnerId, ...orderGroupFilter(status) },
      include: { _count: { select: { attachments: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const today = new Date();

  return (
    <div className="p-4 md:p-6">
      <PageHeader title="협력사 발주현황" sub="생산계획과 별도로 발행된 건별 발주서 · 납품대기 발주는 바로 거래명세서를 발행할 수 있습니다" />
      <Panel title="발주 목록" action={<FilterTabs base="/orders" current={status} tabs={orderGroupTabs(all.map(o => o.status))} />}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              <Th>발주번호</Th><Th>품목코드</Th><Th>품명</Th><Th>규격</Th><Th right>수량</Th><Th right>단가</Th>
              <Th right>공급가액</Th><Th>납기일</Th><Th right>첨부</Th><Th>상태</Th><Th></Th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {orders.length === 0 ? <EmptyRow cols={11} text="발주 내역이 없습니다" /> : orders.map(o => {
                const late = o.status === "PENDING" && o.dueDate < today;
                return (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">
                      <Link href={`/orders/${o.id}`} className="text-blue-600 hover:underline">{o.orderNo}</Link>
                    </td>
                    <Td mono>{o.itemCode}</Td>
                    <Td strong>{o.itemName}</Td>
                    <Td muted>{o.spec ?? "—"}</Td>
                    <Td right>{o.quantity.toLocaleString()} {o.unit}</Td>
                    <Td right muted>{o.unitPrice.toLocaleString()}</Td>
                    <Td right strong>{o.totalPrice.toLocaleString()}</Td>
                    <td className={`px-4 py-3 text-sm whitespace-nowrap tabular-nums ${late ? "text-red-600 font-semibold" : "text-slate-700"}`}>{formatDate(o.dueDate)}{late && " · 경과"}</td>
                    <Td right muted>{o._count.attachments || "—"}</Td>
                    <Td><Badge {...ORDER_STATUS_MAP[o.status]} /></Td>
                    <Td right>
                      {o.status === "PENDING"
                        ? <Link href={`/statements/new?order=${o.id}`} className={btnSmPrimary}>명세서 발행</Link>
                        : <Link href={`/orders/${o.id}`} className={btnSm}>상세</Link>}
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
