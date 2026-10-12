import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { Badge } from "@/components/ui/Badge";
import { EmptyRow, PageHeader, Panel, Stat, Td, Th, btnSmPrimary } from "@/components/ui/kit";
import { INVOICE_STATUS_MAP, formatDate, formatKRW } from "@/lib/utils";
import { advanceInvoice } from "@/app/admin/actions";

const NEXT_LABEL: Record<string, string> = {
  ISSUED: "검토 시작",
  REVIEWING: "지급 확정",
  APPROVED: "지급 완료 처리",
};

export default async function AdminInvoicesPage() {
  await requireAdmin();
  const invoices = await db.invoice.findMany({
    include: { partner: true, delivery: true },
    orderBy: [{ createdAt: "desc" }],
  });

  const sum = (s: string[]) => invoices.filter(i => s.includes(i.status)).reduce((a, i) => a + i.totalAmount, 0);
  const now = new Date();
  const paidThisMonth = invoices
    .filter(i => i.paidAt && i.paidAt.getFullYear() === now.getFullYear() && i.paidAt.getMonth() === now.getMonth())
    .reduce((a, i) => a + i.totalAmount, 0);

  return (
    <div className="p-7">
      <PageHeader title="세금계산서 / 지급" sub="협력사가 발행한 계산서를 검토하고 대금 지급을 처리합니다" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Stat label="검토 대기 (발행·검토중)" value={formatKRW(sum(["ISSUED", "REVIEWING"]))} tone="amber" />
        <Stat label="지급 확정 (미지급)" value={formatKRW(sum(["APPROVED"]))} tone="blue" />
        <Stat label="이번 달 지급 완료" value={formatKRW(paidThisMonth)} tone="green" />
      </div>

      <Panel title="계산서 목록">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <Th>계산서번호</Th><Th>협력사</Th><Th>품목</Th><Th right>공급가액</Th><Th right>부가세</Th>
                <Th right>합계</Th><Th>발행일</Th><Th>지급예정일</Th><Th>상태</Th><Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.length === 0 ? <EmptyRow cols={10} text="접수된 계산서가 없습니다" /> : invoices.map(i => (
                <tr key={i.id} className="hover:bg-slate-50">
                  <Td mono>{i.invoiceNo}</Td>
                  <Td>{i.partner.name}</Td>
                  <Td strong>{i.delivery.itemName}</Td>
                  <Td right>{i.supplyAmount.toLocaleString()}</Td>
                  <Td right muted>{i.taxAmount.toLocaleString()}</Td>
                  <Td right strong>{i.totalAmount.toLocaleString()}</Td>
                  <Td>{formatDate(i.issueDate)}</Td>
                  <Td>{i.paidAt ? `${formatDate(i.paidAt)} 지급` : i.paymentDueDate ? formatDate(i.paymentDueDate) : "—"}</Td>
                  <Td><Badge {...INVOICE_STATUS_MAP[i.status]} /></Td>
                  <Td right>
                    {NEXT_LABEL[i.status] && (
                      <form action={advanceInvoice.bind(null, i.id)}>
                        <button className={btnSmPrimary}>{NEXT_LABEL[i.status]}</button>
                      </form>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
