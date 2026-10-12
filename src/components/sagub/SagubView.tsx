import Link from "next/link";
import { db } from "@/lib/db";
import { sagubBalances, sagubLedger } from "@/lib/sagub";
import { addDays, isYmd, todayYmd } from "@/lib/dates";
import { formatQty } from "@/lib/utils";
import { EmptyRow, Panel, Td, Th } from "@/components/ui/kit";

/** 협력사 1곳의 사급 수불장. 협력사 화면과 관리자 화면이 같이 쓴다 */
export async function SagubView({ partnerId, basePath, sp }: {
  partnerId: string;
  basePath: string;
  sp: { item?: string; from?: string; to?: string; partner?: string };
}) {
  const balances = await sagubBalances(partnerId);
  const items = await db.item.findMany({
    where: { OR: [{ id: { in: [...balances.keys()] } }, { sagubType: { not: null }, bomParents: { some: { parent: { partnerId } } } }] },
    select: { id: true, code: true, name: true, unit: true, sagubType: true, unitPrice: true },
    orderBy: { code: "asc" },
  });

  const selected = items.find(i => i.id === sp.item) ?? items[0];
  const to = isYmd(sp.to) ? sp.to : todayYmd();
  const from = isYmd(sp.from) ? sp.from : addDays(to, -30);
  const ledger = selected ? await sagubLedger(partnerId, selected.id, from, to) : null;
  const link = (itemId: string) => {
    const p = new URLSearchParams({ item: itemId, from, to });
    if (sp.partner) p.set("partner", sp.partner);
    return `${basePath}?${p}`;
  };

  return (
    <div className="space-y-5">
      <Panel title="자재별 잔량">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr><Th>자도번</Th><Th>품명</Th><Th>구분</Th><Th right>협력사입고(불출)</Th><Th right>협력사출고(소진)</Th><Th right>조정</Th><Th right>잔량</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? <EmptyRow cols={7} text="지급받은 사급자재가 없습니다" /> : items.map(i => {
                const b = balances.get(i.id) ?? { issued: 0, consumed: 0, adjusted: 0, balance: 0 };
                const on = i.id === selected?.id;
                return (
                  <tr key={i.id} className={on ? "bg-blue-50/60" : "hover:bg-slate-50"}>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">
                      <Link href={link(i.id)} className="text-blue-600 hover:underline" aria-current={on ? "true" : undefined}>{i.code}</Link>
                    </td>
                    <Td strong>{i.name}</Td>
                    <Td muted>{i.sagubType ?? "—"}</Td>
                    <Td right>{formatQty(b.issued)}</Td>
                    <Td right>{formatQty(b.consumed)}</Td>
                    <Td right muted>{b.adjusted ? formatQty(b.adjusted) : "—"}</Td>
                    <td className={`px-4 py-3 text-right tabular-nums text-sm font-bold ${b.balance < 0 ? "text-red-600" : "text-slate-900"}`}>{formatQty(b.balance)} <span className="text-xs font-normal text-slate-400">{i.unit}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {selected && ledger && (
        <Panel title={`${selected.code} ${selected.name} 수불`} action={
          <form method="get" action={basePath} className="flex items-center gap-2 text-sm">
            <input type="hidden" name="item" value={selected.id} />
            {sp.partner && <input type="hidden" name="partner" value={sp.partner} />}
            <label className="sr-only" htmlFor="lf">시작일</label>
            <input id="lf" name="from" type="date" defaultValue={from} className="px-2 py-1 rounded-md border border-slate-200 tabular-nums" />
            <span className="text-slate-400">~</span>
            <label className="sr-only" htmlFor="lt">종료일</label>
            <input id="lt" name="to" type="date" defaultValue={to} className="px-2 py-1 rounded-md border border-slate-200 tabular-nums" />
            <button className="px-3 py-1 rounded-md bg-[#1B2E57] text-white text-xs font-semibold">조회</button>
          </form>
        }>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><Th>일자</Th><Th right>전일잔량</Th><Th right>협력사입고</Th><Th right>협력사출고</Th><Th right>조정</Th><Th right>잔량</Th><Th>내역</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="bg-slate-50/60">
                  <Td muted>{from} 이전</Td><Td right /><Td right /><Td right /><Td right />
                  <Td right strong>{formatQty(ledger.opening)}</Td><Td muted>이월</Td>
                </tr>
                {ledger.days.length === 0 ? <EmptyRow cols={7} text="기간 내 수불이 없습니다" /> : ledger.days.map(day => (
                  <tr key={day.date} className="hover:bg-slate-50">
                    <Td>{day.date}</Td>
                    <Td right muted>{formatQty(day.opening)}</Td>
                    <Td right>{day.issued ? formatQty(day.issued) : ""}</Td>
                    <Td right>{day.consumed ? formatQty(day.consumed) : ""}</Td>
                    <Td right muted>{day.adjusted ? formatQty(day.adjusted) : ""}</Td>
                    <Td right strong>{formatQty(day.closing)}</Td>
                    <td className="px-4 py-3 text-xs text-slate-500">{day.notes.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
