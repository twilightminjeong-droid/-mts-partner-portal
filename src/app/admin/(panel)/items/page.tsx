import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { EmptyRow, FormError, PageHeader, Panel, Td, Th, btnPrimary } from "@/components/ui/kit";
import { createItem } from "@/app/admin/master-actions";
import { ITEM_ERRORS, ItemFields } from "./ItemFields";

export default async function ItemsPage({ searchParams }: { searchParams: Promise<{ kind?: string; q?: string; error?: string }> }) {
  await requireAdmin();
  const { kind, q, error } = await searchParams;
  const k = kind === "ASSY" || kind === "PART" ? kind : undefined;

  const [items, partners] = await Promise.all([
    db.item.findMany({
      where: {
        ...(k && { kind: k }),
        ...(q && { OR: [{ code: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] }),
      },
      include: { partner: { select: { name: true } }, _count: { select: { bomChildren: true, bomParents: true } } },
      orderBy: [{ kind: "asc" }, { code: "asc" }],
    }),
    db.partner.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="p-4 md:p-6 space-y-5">
      <PageHeader title="품목 · BOM" sub="ASSY(도번) = 협력사가 납품하는 품목 · PART(자도번) = 구성 부품·자재. 사급자재는 PART에 무상/유상을 지정합니다." />
      <FormError message={error && ITEM_ERRORS[error]} />

      <details className="bg-white rounded-xl border border-slate-200 shadow-sm" open={!!error}>
        <summary className="px-5 py-4 cursor-pointer font-bold text-[15px] text-slate-900">+ 품목 등록</summary>
        <form action={createItem} className="px-5 pb-5 space-y-4">
          <ItemFields partners={partners} />
          <button type="submit" className={btnPrimary}>등록</button>
        </form>
      </details>

      <Panel title={`품목 ${items.length}`} action={
        <form method="get" className="flex gap-2">
          <label className="sr-only" htmlFor="kind">구분</label>
          <select id="kind" name="kind" defaultValue={k ?? ""} className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-sm">
            <option value="">전체</option><option value="ASSY">ASSY</option><option value="PART">PART</option>
          </select>
          <label className="sr-only" htmlFor="q">검색</label>
          <input id="q" name="q" defaultValue={q} placeholder="P/No·품명" className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-sm w-40" />
          <button className="px-3 py-1.5 rounded-md bg-[#111A2E] text-white text-sm font-semibold">조회</button>
        </form>
      }>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr><Th>구분</Th><Th>P/No</Th><Th>품명</Th><Th>규격</Th><Th>모델</Th><Th right>단가</Th><Th>담당 협력사</Th><Th>사급</Th><Th right>BOM</Th><Th>사용</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? <EmptyRow cols={10} text="등록된 품목이 없습니다" /> : items.map(i => (
                <tr key={i.id} className={`hover:bg-slate-50 ${i.active ? "" : "opacity-50"}`}>
                  <td className="px-4 py-3 text-xs font-semibold"><span className={i.kind === "ASSY" ? "text-blue-700" : "text-slate-500"}>{i.kind}</span></td>
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">
                    <Link href={`/admin/items/${i.id}`} className="text-blue-600 hover:underline">{i.code}</Link>
                  </td>
                  <Td strong>{i.name}</Td>
                  <Td muted>{i.spec ?? "—"}</Td>
                  <Td muted>{i.model ?? "—"}</Td>
                  <Td right>{i.unitPrice.toLocaleString()}</Td>
                  <Td>{i.partner?.name ?? "—"}</Td>
                  <Td>{i.sagubType ? <span className="text-amber-700 font-semibold">{i.sagubType}</span> : "—"}</Td>
                  <Td right muted>{i.kind === "ASSY" ? `자도번 ${i._count.bomChildren}` : `사용처 ${i._count.bomParents}`}</Td>
                  <Td muted>{i.active ? "사용" : "중지"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
