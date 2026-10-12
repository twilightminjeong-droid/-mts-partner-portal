import Link from "next/link";
import { db } from "@/lib/db";
import { dateToYmd, localMonthBounds, monthBounds, shiftMonth } from "@/lib/dates";
import { formatDate, formatQty } from "@/lib/utils";
import { EmptyRow, Panel, Td, Th } from "@/components/ui/kit";

export function MonthBar({ base, ym, extra }: { base: string; ym: string; extra?: Record<string, string | undefined> }) {
  const href = (m: string) => {
    const p = new URLSearchParams({ ym: m });
    for (const [k, v] of Object.entries(extra ?? {})) if (v) p.set(k, v);
    return `${base}?${p}`;
  };
  const [y, m] = ym.split("-");
  return (
    <div className="flex items-center gap-2 mb-4">
      <Link href={href(shiftMonth(ym, -1))} className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50" aria-label="이전 달">◀</Link>
      <span className="text-lg font-bold text-slate-900 tabular-nums min-w-[110px] text-center">{y}년 {Number(m)}월</span>
      <Link href={href(shiftMonth(ym, 1))} className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50" aria-label="다음 달">▶</Link>
    </div>
  );
}

function Totals({ supply, label }: { supply: number; label: string }) {
  const tax = Math.floor(supply * 0.1);
  return (
    <div className="flex flex-wrap gap-6 px-5 py-4 bg-slate-50 border-t border-slate-100">
      {[[`${label} 공급가액`, supply], ["부가세", tax], ["합계", supply + tax]].map(([k, v], i) => (
        <div key={k as string}>
          <div className={`text-[11px] font-medium ${i === 2 ? "text-blue-600" : "text-slate-400"}`}>{k}</div>
          <div className={`text-lg font-bold tabular-nums ${i === 2 ? "text-blue-700" : "text-slate-900"}`}>{(v as number).toLocaleString()}원</div>
        </div>
      ))}
    </div>
  );
}

export async function purchaseClosing(partnerId: string | undefined, ym: string) {
  const { start, end } = localMonthBounds(ym);
  return db.delivery.findMany({
    where: { ...(partnerId && { partnerId }), status: "PASSED", inspectedAt: { gte: start, lt: end } },
    include: { partner: { select: { name: true } } },
    orderBy: [{ inspectedAt: "asc" }],
  });
}

export async function salesClosing(partnerId: string | undefined, ym: string) {
  const { start, end } = monthBounds(ym);
  return db.sagubTxn.findMany({
    where: { ...(partnerId && { partnerId }), type: "ISSUE", unitPrice: { gt: 0 }, txnDate: { gte: start, lt: end } },
    include: { item: { select: { code: true, name: true, unit: true } }, partner: { select: { name: true } } },
    orderBy: [{ txnDate: "asc" }, { createdAt: "asc" }],
  });
}

/** 매입마감 = 그 달 검수 합격분(합격수량 × 명세서 단가) */
export async function PurchaseClosingTable({ partnerId, ym, showPartner }: { partnerId?: string; ym: string; showPartner?: boolean }) {
  const rows = await purchaseClosing(partnerId, ym);
  const supply = rows.reduce((s, d) => s + (d.passQty ?? 0) * d.unitPrice, 0);
  return (
    <Panel title={`매입 명세 ${rows.length}건`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr>
            <Th>검수일</Th>{showPartner && <Th>협력사</Th>}<Th>명세서번호</Th><Th>P/No</Th><Th>품명</Th>
            <Th right>납품</Th><Th right>합격</Th><Th right>불합격</Th><Th right>단가</Th><Th right>매입금액</Th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? <EmptyRow cols={showPartner ? 10 : 9} text="이 달에 검수 합격한 납품이 없습니다" /> : rows.map(d => (
              <tr key={d.id} className="hover:bg-slate-50">
                <Td>{formatDate(d.inspectedAt!)}</Td>
                {showPartner && <Td>{d.partner.name}</Td>}
                <Td mono>{d.deliveryNo}</Td>
                <Td mono>{d.itemCode}</Td>
                <Td strong>{d.itemName}</Td>
                <Td right muted>{d.deliveredQty.toLocaleString()}</Td>
                <Td right>{(d.passQty ?? 0).toLocaleString()}</Td>
                <td className={`px-4 py-3 text-right tabular-nums text-sm ${d.failQty ? "text-red-600 font-semibold" : "text-slate-300"}`}>{d.failQty || "—"}</td>
                <Td right muted>{d.unitPrice.toLocaleString()}</Td>
                <Td right strong>{((d.passQty ?? 0) * d.unitPrice).toLocaleString()}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Totals supply={supply} label="매입" />
    </Panel>
  );
}

/** 매출마감 = 그 달 유상사급 불출분(불출수량 × 불출 당시 단가) */
export async function SalesClosingTable({ partnerId, ym, showPartner }: { partnerId?: string; ym: string; showPartner?: boolean }) {
  const rows = await salesClosing(partnerId, ym);
  const supply = rows.reduce((s, t) => s + Math.round(t.qty * t.unitPrice), 0);
  return (
    <Panel title={`유상사급 불출 ${rows.length}건`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr>
            <Th>불출일</Th>{showPartner && <Th>협력사</Th>}<Th>자도번</Th><Th>품명</Th><Th right>수량</Th><Th right>단가</Th><Th right>매출금액</Th><Th>비고</Th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? <EmptyRow cols={showPartner ? 8 : 7} text="이 달에 불출한 유상사급이 없습니다" /> : rows.map(t => (
              <tr key={t.id} className="hover:bg-slate-50">
                <Td>{dateToYmd(t.txnDate)}</Td>
                {showPartner && <Td>{t.partner.name}</Td>}
                <Td mono>{t.item.code}</Td>
                <Td strong>{t.item.name}</Td>
                <Td right>{formatQty(t.qty)} {t.item.unit}</Td>
                <Td right muted>{t.unitPrice.toLocaleString()}</Td>
                <Td right strong>{Math.round(t.qty * t.unitPrice).toLocaleString()}</Td>
                <Td muted>{t.note ?? ""}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Totals supply={supply} label="매출" />
    </Panel>
  );
}
