import Link from "next/link";
import { addDays, todayYmd } from "@/lib/dates";

/** 조회 기준일·기간 선택(GET 폼). 앞뒤 이동은 기간만큼 */
export function PeriodBar({ base, from, days, extra }: {
  base: string; from: string; days: number; extra?: Record<string, string | undefined>;
}) {
  const qs = (f: string) => {
    const p = new URLSearchParams({ from: f, days: String(days) });
    for (const [k, v] of Object.entries(extra ?? {})) if (v) p.set(k, v);
    return `${base}?${p}`;
  };
  return (
    <form method="get" action={base} className="flex flex-wrap items-end gap-2 mb-4">
      {Object.entries(extra ?? {}).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
      <div>
        <label htmlFor="from" className="block text-[11px] font-medium text-slate-500 mb-1">기준일</label>
        <input id="from" name="from" type="date" defaultValue={from}
          className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-sm tabular-nums" />
      </div>
      <div>
        <label htmlFor="days" className="block text-[11px] font-medium text-slate-500 mb-1">기간</label>
        <select id="days" name="days" defaultValue={String(days)} className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-sm">
          <option value="7">7일</option><option value="14">14일</option><option value="31">31일</option>
        </select>
      </div>
      <button className="px-3 py-1.5 rounded-md bg-[#1B2E57] text-white text-sm font-semibold">조회</button>
      <div className="flex gap-1 ml-1">
        <Link href={qs(addDays(from, -days))} className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50" aria-label="이전 기간">◀</Link>
        <Link href={qs(todayYmd())} className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50">오늘</Link>
        <Link href={qs(addDays(from, days))} className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50" aria-label="다음 기간">▶</Link>
      </div>
    </form>
  );
}

export function parsePeriod(sp: { from?: string; days?: string }, isYmd: (s: unknown) => s is string) {
  const from = isYmd(sp.from) ? sp.from : todayYmd();
  const days = [7, 14, 31].includes(Number(sp.days)) ? Number(sp.days) : 31;
  return { from, days };
}
