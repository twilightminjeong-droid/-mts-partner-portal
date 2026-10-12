import { requirePartner } from "@/lib/session";
import { db } from "@/lib/db";
import { formatKRW, formatDate, INVOICE_STATUS_MAP } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { invoiceAmounts } from "@/lib/invoice";
import Link from "next/link";

export default async function InvoicesPage() {
  const { id: partnerId } = await requirePartner();

  const [invoices, issuableDeliveries] = await Promise.all([
    db.invoice.findMany({
      where: { partnerId },
      include: { delivery: true },
      orderBy: { createdAt: "desc" },
    }),
    db.delivery.findMany({
      where: {
        partnerId,
        status: "PASSED",
        invoices: { none: {} },
      },
      
    }),
  ]);

  const totalSupply = invoices.reduce((s, i) => s + i.supplyAmount, 0);
  const totalTax = invoices.reduce((s, i) => s + i.taxAmount, 0);
  const totalAmount = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const pendingPay = invoices.filter(i => i.status === "APPROVED").reduce((s, i) => s + i.totalAmount, 0);

  return (
    <div className="p-7">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">세금계산서 / 정산</h1>
          <p className="text-sm text-slate-500 mt-0.5">세금계산서 발행 및 대금 지급 현황</p>
        </div>
      </div>

      {/* 요약 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <SummaryCard label="발행 가능" value={issuableDeliveries.length} unit="건" color="blue" icon="📑" note="검수 합격 · 미발행" />
        <SummaryCard label="지급 확정액" value={formatKRW(pendingPay)} color="green" icon="✅" />
        <SummaryCard label="누적 공급가액" value={formatKRW(totalSupply)} color="blue" icon="📊" />
        <SummaryCard label="누적 합계 (VAT)" value={formatKRW(totalAmount)} color="green" icon="💰" />
      </div>

      {/* 계산서 발행 가능 목록 */}
      {issuableDeliveries.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
          <div className="text-sm font-semibold text-blue-800 mb-3">📋 계산서 발행 가능 — 검수완료 {issuableDeliveries.length}건</div>
          <div className="space-y-2">
            {issuableDeliveries.map(d => (
              <div key={d.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-blue-100">
                <div>
                  <div className="text-sm font-medium text-slate-900">{d.itemName}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {d.deliveryNo} · 공급가액 {formatKRW(invoiceAmounts(d).supplyAmount)}
                  </div>
                </div>
                <Link href={`/invoices/new?deliveryId=${d.id}`}
                  className="text-xs font-semibold px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors flex-shrink-0">
                  계산서 발행
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 계산서 목록 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 font-bold text-[15px]">세금계산서 목록</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <Th>계산서번호</Th><Th>명세서번호</Th><Th>품목명</Th>
                <Th>공급가액</Th><Th>부가세</Th><Th>합계</Th>
                <Th>발행일</Th><Th>지급예정일</Th><Th>상태</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-slate-400">발행된 세금계산서가 없습니다</td></tr>
              ) : invoices.map(inv => {
                const s = INVOICE_STATUS_MAP[inv.status];
                return (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{inv.invoiceNo}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{inv.delivery.deliveryNo}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{inv.delivery.itemName}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">{inv.supplyAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-500">{inv.taxAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 tabular-nums font-semibold text-slate-900">{inv.totalAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(inv.issueDate)}</td>
                    <td className="px-4 py-3 text-slate-500">{inv.paymentDueDate ? formatDate(inv.paymentDueDate) : "—"}</td>
                    <td className="px-4 py-3"><Badge label={s.label} color={s.color as "green"|"amber"|"blue"|"red"|"gray"} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {invoices.length > 0 && (
          <div className="flex items-center gap-6 px-5 py-4 bg-slate-50 border-t border-slate-100">
            <div>
              <div className="text-[11px] text-slate-400 font-medium">공급가액 합계</div>
              <div className="text-lg font-bold tabular-nums text-slate-900">{totalSupply.toLocaleString()}원</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">부가세 합계</div>
              <div className="text-lg font-bold tabular-nums text-slate-900">{totalTax.toLocaleString()}원</div>
            </div>
            <div>
              <div className="text-[11px] text-blue-500 font-medium">합계 (VAT 포함)</div>
              <div className="text-lg font-bold tabular-nums text-blue-600">{totalAmount.toLocaleString()}원</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, unit, color, icon, note }: {
  label: string; value: string | number; unit?: string;
  color: "blue"|"green"; icon: string; note?: string;
}) {
  const bg = { blue:"bg-blue-50", green:"bg-emerald-50" }[color];
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center text-lg mb-3`}>{icon}</div>
      <div className="text-xs font-medium text-slate-500 mb-1.5">{label}</div>
      <div className="text-xl font-bold text-slate-900 tabular-nums leading-none">
        {typeof value === "number" ? value.toLocaleString() : value}
        {unit && <span className="text-sm font-medium text-slate-400 ml-1">{unit}</span>}
      </div>
      {note && <div className="text-xs text-slate-400 mt-1">{note}</div>}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{children}</th>;
}
