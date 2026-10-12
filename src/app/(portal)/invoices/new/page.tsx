import { requirePartner } from "@/lib/session";
import { db } from "@/lib/db";
import { formatKRW, formatDate } from "@/lib/utils";
import { invoiceAmounts } from "@/lib/invoice";
import { issueInvoice } from "./actions";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ deliveryId?: string }>;
}) {
  const { id: partnerId } = await requirePartner();
  const { deliveryId } = await searchParams;

  const delivery = deliveryId
    ? await db.delivery.findFirst({
        where: { id: deliveryId, partnerId, status: "PASSED", invoices: { none: {} } },
        
      })
    : null;

  if (!delivery) {
    return (
      <div className="p-7">
        <p className="text-slate-500">계산서 발행 가능한 납품 건을 선택해 주세요.</p>
        <a href="/invoices" className="text-blue-600 text-sm mt-2 inline-block">← 돌아가기</a>
      </div>
    );
  }

  const { supplyAmount, taxAmount, totalAmount } = invoiceAmounts(delivery);

  return (
    <div className="p-7 max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <a href="/invoices" className="text-slate-400 hover:text-slate-600 text-sm">← 세금계산서</a>
        <span className="text-slate-300">/</span>
        <span className="text-sm text-slate-600">계산서 발행</span>
      </div>

      <h1 className="text-xl font-bold text-slate-900 mb-6">세금계산서 발행</h1>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        {/* 납품 정보 요약 */}
        <div className="bg-slate-50 rounded-lg p-4 mb-6 space-y-2">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">납품 정보</div>
          {[
            ["납품번호", delivery.deliveryNo],
                        ["품목명", delivery.itemName],
            ["납품 수량", `${delivery.deliveredQty.toLocaleString()} ${delivery.unit}`],
            ["합격 수량", `${(delivery.passQty ?? delivery.deliveredQty).toLocaleString()} ${delivery.unit}`],
            ["납품일", formatDate(delivery.deliveryDate)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm">
              <span className="text-slate-500">{k}</span>
              <span className="font-medium text-slate-900">{v}</span>
            </div>
          ))}
        </div>

        {/* 금액 확인 */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 space-y-2">
          <div className="text-[11px] font-semibold text-blue-500 uppercase tracking-wider mb-3">계산서 금액</div>
          {[
            ["공급가액", formatKRW(supplyAmount)],
            ["부가세 (10%)", formatKRW(taxAmount)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm">
              <span className="text-slate-600">{k}</span>
              <span className="font-medium text-slate-900">{v}</span>
            </div>
          ))}
          <div className="flex justify-between text-base font-bold border-t border-blue-200 pt-2 mt-2">
            <span className="text-blue-700">합계 (VAT 포함)</span>
            <span className="text-blue-700">{formatKRW(totalAmount)}</span>
          </div>
        </div>

        <form action={issueInvoice}>
          <input type="hidden" name="deliveryId" value={delivery.id} />

          <div className="mb-5">
            <label className="text-[13px] font-medium text-slate-600 block mb-1.5">발행일</label>
            <input name="issueDate" type="date"
              defaultValue={new Date().toISOString().split("T")[0]}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="flex gap-3">
            <a href="/invoices"
              className="flex-1 text-center px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              취소
            </a>
            <button type="submit"
              className="flex-[2] px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
              세금계산서 발행
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
