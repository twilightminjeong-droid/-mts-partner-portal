import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { todayYmd } from "@/lib/dates";
import { FormError, PageHeader, btnPrimary, inputCls, labelCls } from "@/components/ui/kit";
import { SagubView } from "@/components/sagub/SagubView";
import { postSagub } from "@/app/admin/master-actions";

const ERRORS: Record<string, string> = {
  partner: "협력사를 선택해 주세요.",
  item: "사급(무상·유상)으로 지정된 자재만 불출할 수 있습니다. 품목 · BOM에서 지정해 주세요.",
  date: "일자를 입력해 주세요.",
  qty: "수량을 확인해 주세요. 불출은 0보다 커야 하고, 조정은 증감(−는 차감)으로 입력합니다.",
};

export default async function AdminSagubPage({ searchParams }: {
  searchParams: Promise<{ partner?: string; item?: string; from?: string; to?: string; error?: string; saved?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const [partners, materials] = await Promise.all([
    db.partner.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.item.findMany({ where: { sagubType: { not: null }, active: true }, orderBy: { code: "asc" }, select: { id: true, code: true, name: true, unit: true, sagubType: true, unitPrice: true } }),
  ]);
  const partner = partners.find(p => p.id === sp.partner) ?? partners[0];

  return (
    <div className="p-4 md:p-6 max-w-6xl space-y-5">
      <PageHeader title="사급 관리" sub="협력사에 지급한 자재(불출)와 조정을 등록합니다 · 소진은 납품 입고 때 BOM 기준으로 자동 처리됩니다" />

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="협력사 선택">
        {partners.map(p => (
          <Link key={p.id} href={`/admin/sagub?partner=${p.id}`} role="tab" aria-selected={p.id === partner?.id}
            className={`px-3 py-1.5 rounded-md text-sm font-medium border ${p.id === partner?.id ? "bg-[#111A2E] text-white border-[#111A2E]" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
            {p.name}
          </Link>
        ))}
      </div>

      <FormError message={sp.error && ERRORS[sp.error]} />
      {sp.saved && <p role="status" className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">등록했습니다.</p>}

      {partner && (
        <>
          <form action={postSagub} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-wrap items-end gap-3">
            <input type="hidden" name="partnerId" value={partner.id} />
            <div>
              <label htmlFor="type" className={labelCls}>구분</label>
              <select id="type" name="type" className={`${inputCls} w-28`}>
                <option value="ISSUE">불출</option><option value="ADJUST">조정</option>
              </select>
            </div>
            <div className="min-w-[260px] flex-1">
              <label htmlFor="itemId" className={labelCls}>사급자재</label>
              <select id="itemId" name="itemId" required defaultValue={sp.item} className={inputCls}>
                {materials.map(m => <option key={m.id} value={m.id}>{m.code} · {m.name} ({m.sagubType}{m.sagubType === "유상" ? ` ${m.unitPrice.toLocaleString()}원/${m.unit}` : ""})</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="qty" className={labelCls}>수량</label>
              <input id="qty" name="qty" type="number" step="any" required className={`${inputCls} w-32`} />
            </div>
            <div>
              <label htmlFor="txnDate" className={labelCls}>일자</label>
              <input id="txnDate" name="txnDate" type="date" required defaultValue={todayYmd()} className={`${inputCls} w-40`} />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label htmlFor="note" className={labelCls}>비고</label>
              <input id="note" name="note" placeholder="예) 9월 2차 불출, 실사 차이 조정" className={inputCls} />
            </div>
            <button type="submit" className={btnPrimary}>{partner.name}에 등록</button>
          </form>

          <SagubView partnerId={partner.id} basePath="/admin/sagub" sp={{ ...sp, partner: partner.id }} />
        </>
      )}
    </div>
  );
}
