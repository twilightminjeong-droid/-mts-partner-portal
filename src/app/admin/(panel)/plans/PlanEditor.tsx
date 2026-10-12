"use client";

import { useActionState, useMemo, useState } from "react";
import { savePlan, type PlanSaveState } from "@/app/admin/master-actions";

type Item = { id: string; code: string; name: string; model: string | null };
type Day = { ymd: string; day: string; dow: string; weekend: boolean; today: boolean };

export function PlanEditor({ partnerId, from, days, dates, items, initial }: {
  partnerId: string; from: string; days: number; dates: Day[]; items: Item[];
  initial: Record<string, Record<string, number>>;
}) {
  const toStr = () => Object.fromEntries(items.map(i => [i.id, Object.fromEntries(dates.map(d => [d.ymd, initial[i.id]?.[d.ymd] ? String(initial[i.id][d.ymd]) : ""]))]));
  const [cells, setCells] = useState<Record<string, Record<string, string>>>(toStr);
  const [state, action, pending] = useActionState<PlanSaveState, FormData>(savePlan, { seq: 0 });

  const dirty = useMemo(() => {
    let n = 0;
    for (const i of items) for (const d of dates) {
      const before = initial[i.id]?.[d.ymd] ? String(initial[i.id][d.ymd]) : "";
      if ((cells[i.id]?.[d.ymd] ?? "") !== before) n++;
    }
    return n;
  }, [cells, items, dates, initial]);

  const set = (itemId: string, ymd: string, v: string) =>
    setCells(c => ({ ...c, [itemId]: { ...c[itemId], [ymd]: v } }));

  // 엑셀에서 복사한 여러 칸(탭·줄바꿈 구분)을 현재 칸부터 오른쪽·아래로 채운다
  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>, row: number, col: number) => {
    const text = e.clipboardData.getData("text");
    if (!/[\t\n]/.test(text)) return;
    e.preventDefault();
    const grid = text.replace(/\r/g, "").replace(/\n$/, "").split("\n").map(l => l.split("\t"));
    setCells(c => {
      const next = { ...c };
      grid.forEach((line, r) => {
        const item = items[row + r];
        if (!item) return;
        next[item.id] = { ...next[item.id] };
        line.forEach((v, k) => {
          const d = dates[col + k];
          if (d) next[item.id][d.ymd] = v.replace(/,/g, "").trim();
        });
      });
      return next;
    });
  };

  const rowSum = (itemId: string) => dates.reduce((s, d) => s + (Number(cells[itemId]?.[d.ymd]) || 0), 0);
  const payload = JSON.stringify({ partnerId, from, days, cells });

  return (
    <form action={action}>
      <input type="hidden" name="payload" value={payload} />
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <button disabled={pending || dirty === 0}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-40">
          {pending ? "저장 중…" : `계획 저장${dirty ? ` (변경 ${dirty}칸)` : ""}`}
        </button>
        <button type="button" onClick={() => setCells(toStr())} disabled={pending || dirty === 0}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 disabled:opacity-40">되돌리기</button>
        <p className="text-xs text-slate-400">엑셀에서 여러 칸을 복사해 시작 칸에 붙여넣을 수 있습니다 · 빈칸은 계획 없음</p>
        {state.error && <p role="alert" className="text-sm text-red-600 w-full">{state.error}</p>}
        {state.ok && !pending && dirty === 0 && <p role="status" className="text-sm text-emerald-700 w-full">{state.ok}</p>}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-slate-50 px-3 py-1.5 text-left text-[11px] font-semibold text-slate-500 border-b border-r border-slate-200 min-w-[220px]">도번 · 품명</th>
              {dates.map(d => (
                <th key={d.ymd} className={`px-1 py-1.5 text-center text-[11px] font-semibold border-b border-l border-slate-200 min-w-[54px]
                  ${d.today ? "bg-[#111A2E] text-white" : d.weekend ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-500"}`}>
                  <div>{d.day}</div><div className="font-normal">{d.dow}</div>
                </th>
              ))}
              <th className="px-2 py-1.5 text-right text-[11px] font-semibold text-slate-500 border-b border-l border-slate-200 bg-slate-50">합계</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, r) => (
              <tr key={it.id}>
                <td className="sticky left-0 z-10 bg-white px-3 py-1.5 border-b border-r border-slate-100">
                  <div className="font-mono text-xs font-semibold">{it.code}</div>
                  <div className="text-[11px] text-slate-500 whitespace-nowrap">{it.name}{it.model ? ` · ${it.model}` : ""}</div>
                </td>
                {dates.map((d, c) => {
                  const v = cells[it.id]?.[d.ymd] ?? "";
                  const changed = v !== (initial[it.id]?.[d.ymd] ? String(initial[it.id][d.ymd]) : "");
                  return (
                    <td key={d.ymd} className={`border-b border-l border-slate-100 p-0 ${d.weekend ? "bg-red-50/40" : ""}`}>
                      <input aria-label={`${it.code} ${d.ymd} 계획수량`} inputMode="numeric" value={v}
                        onChange={e => set(it.id, d.ymd, e.target.value)}
                        onPaste={e => onPaste(e, r, c)}
                        className={`w-full min-w-[54px] px-1 py-2 text-center text-xs tabular-nums bg-transparent focus:outline-none focus:bg-blue-50 focus:ring-2 focus:ring-inset focus:ring-blue-400
                          ${changed ? "bg-amber-50 font-bold text-amber-900" : "text-slate-800"}`} />
                    </td>
                  );
                })}
                <td className="px-2 py-1.5 border-b border-l border-slate-100 text-right text-xs font-semibold tabular-nums">{rowSum(it.id).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </form>
  );
}
