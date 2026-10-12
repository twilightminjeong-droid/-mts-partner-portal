import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { isYm, thisMonth } from "@/lib/dates";
import { EmptyRow, PageHeader, Panel, Td, Th } from "@/components/ui/kit";
import { MonthBar, PurchaseClosingTable, SalesClosingTable, purchaseClosing, salesClosing } from "@/components/closing/Closing";

export default async function AdminClosingPage({ searchParams }: { searchParams: Promise<{ ym?: string; partner?: string; view?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const ym = isYm(sp.ym) ? sp.ym : thisMonth();
  const view = sp.view === "sales" ? "sales" : "purchase";

  const [partners, buys, sells] = await Promise.all([
    db.partner.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    purchaseClosing(undefined, ym),
    salesClosing(undefined, ym),
  ]);
  const partner = partners.find(p => p.id === sp.partner);

  const summary = partners.map(p => {
    const buy = buys.filter(d => d.partnerId === p.id).reduce((s, d) => s + (d.passQty ?? 0) * d.unitPrice, 0);
    const sell = sells.filter(t => t.partnerId === p.id).reduce((s, t) => s + Math.round(t.qty * t.unitPrice), 0);
    return { ...p, buy, sell, cnt: buys.filter(d => d.partnerId === p.id).length };
  }).filter(r => r.buy || r.sell);
  const tot = summary.reduce((t, r) => ({ buy: t.buy + r.buy, sell: t.sell + r.sell }), { buy: 0, sell: 0 });
  const href = (extra: Record<string, string>) => `/admin/closing?${new URLSearchParams({ ym, ...extra })}`;

  return (
    <div className="p-4 md:p-6 max-w-6xl space-y-5">
      <PageHeader title="마감현황" sub="매입 = 검수 합격분 · 매출 = 유상사급 불출분 (모두 공급가액, VAT 별도)" />
      <MonthBar base="/admin/closing" ym={ym} extra={{ partner: partner?.id, view }} />

      <Panel title="협력사별 요약">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr><Th>협력사</Th><Th right>검수 합격 건수</Th><Th right>매입</Th><Th right>매출(유상사급)</Th><Th right>차감 후 지급 예상</Th><Th></Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {summary.length === 0 ? <EmptyRow cols={6} text="이 달 마감 대상이 없습니다" /> : summary.map(r => (
                <tr key={r.id} className={r.id === partner?.id ? "bg-blue-50/60" : "hover:bg-slate-50"}>
                  <Td strong>{r.name}</Td>
                  <Td right>{r.cnt}</Td>
                  <Td right>{r.buy.toLocaleString()}</Td>
                  <Td right>{r.sell.toLocaleString()}</Td>
                  <Td right strong>{(r.buy - r.sell).toLocaleString()}</Td>
                  <Td right><Link href={href({ partner: r.id, view })} className="text-xs font-semibold text-blue-600 hover:underline">상세</Link></Td>
                </tr>
              ))}
            </tbody>
            {summary.length > 0 && (
              <tfoot><tr className="bg-slate-50 font-bold">
                <Td>합계</Td><Td right /><Td right>{tot.buy.toLocaleString()}</Td><Td right>{tot.sell.toLocaleString()}</Td><Td right>{(tot.buy - tot.sell).toLocaleString()}</Td><Td />
              </tr></tfoot>
            )}
          </table>
        </div>
      </Panel>

      <div className="flex gap-1">
        {([["purchase", "매입 명세"], ["sales", "매출 명세"]] as const).map(([v, l]) => (
          <Link key={v} href={href({ view: v, ...(partner && { partner: partner.id }) })}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${view === v ? "bg-[#111A2E] text-white" : "bg-white border border-slate-200 text-slate-600"}`}>{l}</Link>
        ))}
        {partner && <Link href={href({ view })} className="px-3 py-1.5 text-sm text-slate-500 underline underline-offset-2">{partner.name} 필터 해제</Link>}
      </div>
      {view === "purchase"
        ? <PurchaseClosingTable partnerId={partner?.id} ym={ym} showPartner={!partner} />
        : <SalesClosingTable partnerId={partner?.id} ym={ym} showPartner={!partner} />}
    </div>
  );
}
