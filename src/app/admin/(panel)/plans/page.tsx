import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { dateRange, dateToYmd, dayInfo, isYmd, todayYmd, ymdToDate } from "@/lib/dates";
import { PageHeader } from "@/components/ui/kit";
import { PeriodBar, parsePeriod } from "@/components/plan/PeriodBar";
import { PlanEditor } from "./PlanEditor";

export default async function AdminPlansPage({ searchParams }: { searchParams: Promise<{ partner?: string; from?: string; days?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const { from, days } = parsePeriod(sp, isYmd);
  const today = todayYmd();

  const partners = await db.partner.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: { _count: { select: { items: true } } },
  });
  const partner = partners.find(p => p.id === sp.partner) ?? partners.find(p => p._count.items > 0) ?? partners[0];

  const ymds = dateRange(from, days);
  const [items, plans] = partner ? await Promise.all([
    db.item.findMany({ where: { partnerId: partner.id, kind: "ASSY", active: true }, orderBy: { code: "asc" }, select: { id: true, code: true, name: true, model: true } }),
    db.planLine.findMany({ where: { partnerId: partner.id, planDate: { gte: ymdToDate(from), lte: ymdToDate(ymds[ymds.length - 1]) } } }),
  ]) : [[], []];

  const initial: Record<string, Record<string, number>> = {};
  for (const p of plans) (initial[p.itemId] ??= {})[dateToYmd(p.planDate)] = p.qty;

  return (
    <div className="p-4 md:p-6">
      <PageHeader title="생산계획" sub="협력사별 도번 · 일자 계획수량. 저장하면 협력사 계획현황·자재계획현황에 바로 반영됩니다." />

      <div className="flex flex-wrap gap-1.5 mb-3" role="tablist" aria-label="협력사 선택">
        {partners.map(p => (
          <Link key={p.id} href={`/admin/plans?partner=${p.id}&from=${from}&days=${days}`} role="tab" aria-selected={p.id === partner?.id}
            className={`px-3 py-1.5 rounded-md text-sm font-medium border ${p.id === partner?.id ? "bg-[#111A2E] text-white border-[#111A2E]" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
            {p.name} <span className={`text-xs ${p.id === partner?.id ? "text-white/60" : "text-slate-400"}`}>도번 {p._count.items}</span>
          </Link>
        ))}
      </div>

      {partner && <PeriodBar base="/admin/plans" from={from} days={days} extra={{ partner: partner.id }} />}

      {!partner ? (
        <p className="text-sm text-slate-500">등록된 협력사가 없습니다.</p>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
          {partner.name}이(가) 담당하는 도번이 없습니다. <Link href="/admin/items" className="text-blue-600 underline">품목 · BOM</Link>에서 ASSY 품목의 담당 협력사를 지정해 주세요.
        </div>
      ) : (
        <PlanEditor
          key={`${partner.id}-${from}-${days}`}
          partnerId={partner.id} from={from} days={days} items={items} initial={initial}
          dates={ymds.map(y => ({ ymd: y, ...dayInfo(y), today: y === today }))}
        />
      )}
    </div>
  );
}
