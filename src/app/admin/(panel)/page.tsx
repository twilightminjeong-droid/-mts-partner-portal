import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { Badge } from "@/components/ui/Badge";
import { EmptyRow, PageHeader, Panel, Stat, Td, Th } from "@/components/ui/kit";
import { DELIVERY_STATUS_MAP, INVOICE_STATUS_MAP, formatDate, formatKRW } from "@/lib/utils";

export default async function AdminDashboard() {
  await requireAdmin();

  const [partners, pendingOrders, inbound, openInvoices, approvedSum, overdue] = await Promise.all([
    db.partner.count({ where: { active: true } }),
    db.order.count({ where: { status: "PENDING" } }),
    db.delivery.findMany({
      where: { status: { in: ["SUBMITTED", "INSPECTING"] } },
      include: { partner: true },
      orderBy: { deliveryDate: "asc" },
      take: 6,
    }),
    db.invoice.findMany({
      where: { status: { in: ["ISSUED", "REVIEWING", "APPROVED"] } },
      include: { partner: true },
      orderBy: { paymentDueDate: "asc" },
      take: 6,
    }),
    db.invoice.aggregate({ where: { status: "APPROVED" }, _sum: { totalAmount: true } }),
    db.order.count({
      where: { status: "PENDING", dueDate: { lt: new Date() } },
    }),
  ]);

  const inboundCount = await db.delivery.count({ where: { status: { in: ["SUBMITTED", "INSPECTING"] } } });

  return (
    <div className="p-7">
      <PageHeader title="구매 현황" sub="처리가 필요한 업무를 먼저 보여 줍니다"
        action={<Link href="/admin/orders/new" className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg">+ 발주 등록</Link>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="확약 대기 발주" value={`${pendingOrders}건`} tone={pendingOrders ? "amber" : "slate"} note="협력사 응답 대기" />
        <Stat label="입고·검수 대기" value={`${inboundCount}건`} tone={inboundCount ? "amber" : "slate"} note="납품 신청 접수분" />
        <Stat label="납기 경과 발주" value={`${overdue}건`} tone={overdue ? "amber" : "slate"} note="미납품 상태로 납기일 지남" />
        <Stat label="지급 확정액" value={formatKRW(approvedSum._sum.totalAmount ?? 0)} tone="green" note={`활성 협력사 ${partners}곳`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="입고·검수 대기" action={<Link href="/admin/deliveries" className="text-sm text-blue-600 font-medium">전체 →</Link>}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><Th>협력사</Th><Th>품목</Th><Th right>수량</Th><Th>납품일</Th><Th>상태</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {inbound.length === 0 ? <EmptyRow cols={5} text="대기 중인 납품이 없습니다" /> : inbound.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <Td>{d.partner.name}</Td>
                    <Td strong>{d.itemName}</Td>
                    <Td right>{d.deliveredQty.toLocaleString()} {d.unit}</Td>
                    <Td>{formatDate(d.deliveryDate)}</Td>
                    <Td><Badge {...DELIVERY_STATUS_MAP[d.status]} /></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="지급 처리 대기 계산서" action={<Link href="/admin/invoices" className="text-sm text-blue-600 font-medium">전체 →</Link>}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><Th>협력사</Th><Th>계산서번호</Th><Th right>합계</Th><Th>지급예정</Th><Th>상태</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {openInvoices.length === 0 ? <EmptyRow cols={5} text="처리할 계산서가 없습니다" /> : openInvoices.map(i => (
                  <tr key={i.id} className="hover:bg-slate-50">
                    <Td>{i.partner.name}</Td>
                    <Td mono>{i.invoiceNo}</Td>
                    <Td right strong>{i.totalAmount.toLocaleString()}</Td>
                    <Td>{i.paymentDueDate ? formatDate(i.paymentDueDate) : "—"}</Td>
                    <Td><Badge {...INVOICE_STATUS_MAP[i.status]} /></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
