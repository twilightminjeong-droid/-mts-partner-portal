import Link from "next/link";
import { requirePartner } from "@/lib/session";
import { getPlanStatus, type PlanCell } from "@/lib/plan";
import { isYmd, todayYmd } from "@/lib/dates";
import { PageHeader } from "@/components/ui/kit";
import { PeriodBar, parsePeriod } from "@/components/plan/PeriodBar";
import { DateTh } from "@/components/plan/DateTh";

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ from?: string; days?: string }> }) {
  const user = await requirePartner();
  const { from, days } = parsePeriod(await searchParams, isYmd);
  const today = todayYmd();
  const { dates, rows } = await getPlanStatus(user.id, from, days);

  const totals = rows.reduce((t, r) => ({ plan: t.plan + r.periodPlan, remain: t.remain + r.periodRemain + r.carryOver }), { plan: 0, remain: 0 });

  return (
    <div className="p-4 md:p-6">
      <PageHeader title="협력사 계획현황" sub="발주사 생산계획 기준 · 발행한 명세서 수량을 가장 이른 계획일부터 채워 잔여를 계산합니다"
        action={<Link href="/statements/new" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg whitespace-nowrap">거래명세서 발행</Link>} />
      <PeriodBar base="/plan" from={from} days={days} />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mb-2">
        <span>도번 <b className="text-slate-800">{rows.length}</b>건 · 기간 계획 <b className="text-slate-800 tabular-nums">{totals.plan.toLocaleString()}</b> · 미납 잔여(이월 포함) <b className="text-slate-800 tabular-nums">{totals.remain.toLocaleString()}</b></span>
        <span className="flex items-center gap-1"><i className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-200" />납품 완료</span>
        <span className="flex items-center gap-1"><i className="w-3 h-3 rounded-sm bg-amber-50 border border-amber-200" />일부 남음</span>
        <span className="flex items-center gap-1"><i className="w-3 h-3 rounded-sm bg-red-50 border border-red-200" />납기 지난 미납</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-slate-50 px-3 py-1.5 text-left text-[11px] font-semibold text-slate-500 border-b border-slate-200 min-w-[120px] md:min-w-[150px]">도번</th>
              <th className="md:sticky md:left-[150px] md:z-20 bg-slate-50 px-3 py-1.5 text-left text-[11px] font-semibold text-slate-500 border-b border-r border-slate-200 min-w-[170px]">품명 · 모델</th>
              <th className="px-2 py-1.5 text-center text-[11px] font-semibold text-slate-500 border-b border-slate-200 bg-slate-50 whitespace-nowrap">사급</th>
              <th className="px-2 py-1.5 text-right text-[11px] font-semibold text-red-600 border-b border-slate-200 bg-slate-50 whitespace-nowrap">이월</th>
              {dates.map((d, i) => <DateTh key={d} ymd={d} today={today} showMonth={i === 0 || d.endsWith("-01")} />)}
              {["기간계획", "기간잔여", "발행", "입고·검수", "합격"].map(h => (
                <th key={h} className="px-2 py-1.5 text-right text-[11px] font-semibold text-slate-500 border-b border-l border-slate-200 bg-slate-50 whitespace-nowrap">{h}</th>
              ))}
              <th className="border-b border-slate-200 bg-slate-50" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={dates.length + 10} className="text-center py-14 text-slate-400">이 기간에 잡힌 생산계획이 없습니다</td></tr>
            ) : rows.map(r => (
              <tr key={r.item.id} className="group">
                <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 px-3 py-2 border-b border-slate-100 font-mono text-xs font-semibold text-slate-800 whitespace-nowrap">{r.item.code}</td>
                <td className="md:sticky md:left-[150px] md:z-10 bg-white group-hover:bg-slate-50 px-3 py-2 border-b border-r border-slate-100">
                  <div className="text-[13px] text-slate-900 whitespace-nowrap">{r.item.name}</div>
                  {r.item.model && <div className="text-[11px] text-slate-400">{r.item.model}</div>}
                </td>
                <td className="px-2 py-2 border-b border-slate-100 text-center text-xs whitespace-nowrap">{r.hasSagub ? <span className="text-amber-700 font-semibold">사급</span> : <span className="text-slate-300">—</span>}</td>
                <td className={`px-2 py-2 border-b border-slate-100 text-right tabular-nums text-xs ${r.carryOver ? "text-red-600 font-bold" : "text-slate-300"}`}>{r.carryOver ? r.carryOver.toLocaleString() : "—"}</td>
                {dates.map(d => <Cell key={d} c={r.cells[d]} past={d < today} />)}
                <td className="px-2 py-2 border-b border-l border-slate-100 text-right tabular-nums text-xs font-semibold">{r.periodPlan.toLocaleString()}</td>
                <td className={`px-2 py-2 border-b border-l border-slate-100 text-right tabular-nums text-xs font-semibold ${r.periodRemain ? "text-amber-700" : "text-emerald-700"}`}>{r.periodRemain.toLocaleString()}</td>
                <td className="px-2 py-2 border-b border-l border-slate-100 text-right tabular-nums text-xs text-slate-600">{r.submitted.toLocaleString()}</td>
                <td className="px-2 py-2 border-b border-l border-slate-100 text-right tabular-nums text-xs text-slate-600">{r.inspecting.toLocaleString()}</td>
                <td className="px-2 py-2 border-b border-l border-slate-100 text-right tabular-nums text-xs text-slate-600">{r.passed.toLocaleString()}</td>
                <td className="px-2 py-2 border-b border-slate-100">
                  {r.periodRemain + r.carryOver > 0 && (
                    <Link href={`/statements/new?item=${r.item.id}`} className="text-[11px] font-semibold text-blue-600 hover:underline whitespace-nowrap">발행 →</Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Cell({ c, past }: { c?: PlanCell; past: boolean }) {
  if (!c) return <td className="px-1 py-2 border-b border-l border-slate-100" />;
  const done = c.remain === 0;
  const partial = !done && c.remain < c.plan;
  const tone = done ? "bg-emerald-50 text-emerald-700" : past ? "bg-red-50 text-red-700 font-bold" : partial ? "bg-amber-50 text-amber-800" : "text-slate-800";
  return (
    <td className={`px-1 py-1.5 border-b border-l border-slate-100 text-center tabular-nums text-xs ${tone}`}
      title={`계획 ${c.plan.toLocaleString()} · 잔여 ${c.remain.toLocaleString()}`}>
      <div className="font-semibold">{c.plan.toLocaleString()}</div>
      {!done && partial && <div className="text-[10px] opacity-80">잔 {c.remain.toLocaleString()}</div>}
    </td>
  );
}
