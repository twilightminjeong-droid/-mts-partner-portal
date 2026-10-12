import { requirePartner } from "@/lib/session";
import { getMaterialPlan } from "@/lib/plan";
import { isYmd, todayYmd } from "@/lib/dates";
import { formatQty } from "@/lib/utils";
import { PageHeader } from "@/components/ui/kit";
import { PeriodBar, parsePeriod } from "@/components/plan/PeriodBar";
import { DateTh } from "@/components/plan/DateTh";

export default async function MaterialPlanPage({ searchParams }: { searchParams: Promise<{ from?: string; days?: string }> }) {
  const user = await requirePartner();
  const { from, days } = parsePeriod(await searchParams, isYmd);
  const today = todayYmd();
  const { dates, rows } = await getMaterialPlan(user.id, from, days);
  const short = rows.filter(r => r.shortage > 0);

  return (
    <div className="p-4 md:p-6">
      <PageHeader title="협력사 자재계획현황" sub="남은 생산계획 × BOM 사용수량 = 자도번별 일자 소요량 · 사급자재는 (잔량 − 발행 미입고분)과 비교합니다" />
      <PeriodBar base="/matplan" from={from} days={days} />

      {short.length > 0 && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 mb-4 text-sm">
          <b className="whitespace-nowrap">사급 부족 {short.length}건</b>
          <span>{short.map(s => `${s.item.code} ${formatQty(s.shortage)}${s.item.unit}`).join(" · ")} — 발주사 구매팀에 불출을 요청하세요.</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-slate-50 px-3 py-1.5 text-left text-[11px] font-semibold text-slate-500 border-b border-slate-200 min-w-[120px] md:min-w-[140px]">자도번</th>
              <th className="md:sticky md:left-[140px] md:z-20 bg-slate-50 px-3 py-1.5 text-left text-[11px] font-semibold text-slate-500 border-b border-r border-slate-200 min-w-[170px]">품명</th>
              <th className="px-2 py-1.5 text-left text-[11px] font-semibold text-slate-500 border-b border-slate-200 bg-slate-50 whitespace-nowrap">모도번 (사용수)</th>
              <th className="px-2 py-1.5 text-center text-[11px] font-semibold text-slate-500 border-b border-slate-200 bg-slate-50 whitespace-nowrap">사급</th>
              <th className="px-2 py-1.5 text-right text-[11px] font-semibold text-slate-500 border-b border-slate-200 bg-slate-50 whitespace-nowrap">사급잔량</th>
              <th className="px-2 py-1.5 text-right text-[11px] font-semibold text-slate-500 border-b border-slate-200 bg-slate-50 whitespace-nowrap" title="발행했지만 입고 전이라 수불장에서 아직 빠지지 않은 소진 예정분">발행분</th>
              <th className="px-2 py-1.5 text-right text-[11px] font-semibold text-red-600 border-b border-slate-200 bg-slate-50">이월</th>
              {dates.map((d, i) => <DateTh key={d} ymd={d} today={today} showMonth={i === 0 || d.endsWith("-01")} />)}
              <th className="px-2 py-1.5 text-right text-[11px] font-semibold text-slate-500 border-b border-l border-slate-200 bg-slate-50 whitespace-nowrap">기간소요</th>
              <th className="px-2 py-1.5 text-right text-[11px] font-semibold text-slate-500 border-b border-l border-slate-200 bg-slate-50">부족</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={dates.length + 9} className="text-center py-14 text-slate-400">남은 계획이 없거나 BOM이 등록되지 않았습니다</td></tr>
            ) : rows.map(r => (
              <tr key={r.item.id} className="group">
                <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 px-3 py-2 border-b border-slate-100 font-mono text-xs font-semibold whitespace-nowrap">{r.item.code}</td>
                <td className="md:sticky md:left-[140px] md:z-10 bg-white group-hover:bg-slate-50 px-3 py-2 border-b border-r border-slate-100 text-[13px] whitespace-nowrap">{r.item.name}</td>
                <td className="px-2 py-2 border-b border-slate-100 text-[11px] text-slate-500 whitespace-nowrap font-mono">
                  {r.parents.map(p => `${p.code} (${formatQty(p.qtyPer)})`).join(", ")}
                </td>
                <td className="px-2 py-2 border-b border-slate-100 text-center text-xs whitespace-nowrap">
                  {r.item.sagubType ? <span className="text-amber-700 font-semibold">{r.item.sagubType}</span> : <span className="text-slate-300">자체</span>}
                </td>
                <td className="px-2 py-2 border-b border-slate-100 text-right tabular-nums text-xs">{r.balance == null ? "—" : formatQty(r.balance)}</td>
                <td className="px-2 py-2 border-b border-slate-100 text-right tabular-nums text-xs text-slate-500">{r.item.sagubType && r.pending ? `−${formatQty(r.pending)}` : ""}</td>
                <td className={`px-2 py-2 border-b border-slate-100 text-right tabular-nums text-xs ${r.carryOver ? "text-red-600 font-bold" : "text-slate-300"}`}>{r.carryOver ? formatQty(r.carryOver) : "—"}</td>
                {dates.map(d => (
                  <td key={d} className="px-1 py-2 border-b border-l border-slate-100 text-center tabular-nums text-xs text-slate-700">
                    {r.cells[d] ? formatQty(r.cells[d]) : ""}
                  </td>
                ))}
                <td className="px-2 py-2 border-b border-l border-slate-100 text-right tabular-nums text-xs font-semibold">{formatQty(r.periodNeed)}</td>
                <td className={`px-2 py-2 border-b border-l border-slate-100 text-right tabular-nums text-xs ${r.shortage ? "bg-red-50 text-red-700 font-bold" : "text-slate-300"}`}>
                  {r.shortage ? formatQty(r.shortage) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
