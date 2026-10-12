import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { formatQty } from "@/lib/utils";
import { Breadcrumb, EmptyRow, FormError, PageHeader, Panel, Td, Th, btnPrimary, btnSmDanger, inputCls, labelCls } from "@/components/ui/kit";
import { addBomLine, removeBomLine, updateItem } from "@/app/admin/master-actions";
import { ITEM_ERRORS, ItemFields } from "../ItemFields";

export default async function ItemDetail({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { error, saved } = await searchParams;

  const [item, partners, parts] = await Promise.all([
    db.item.findUnique({
      where: { id },
      include: {
        bomChildren: { include: { child: true }, orderBy: { child: { code: "asc" } } },
        bomParents: { include: { parent: { include: { partner: { select: { name: true } } } } } },
      },
    }),
    db.partner.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.item.findMany({ where: { kind: "PART", active: true }, orderBy: { code: "asc" }, select: { code: true, name: true } }),
  ]);
  if (!item) notFound();

  return (
    <div className="p-4 md:p-6 max-w-5xl space-y-5">
      <Breadcrumb href="/admin/items" label="품목 · BOM" current={item.code} />
      <PageHeader title={`${item.code} · ${item.name}`} sub={item.kind === "ASSY" ? "ASSY (도번)" : `PART (자도번)${item.sagubType ? ` · ${item.sagubType}사급` : ""}`} />
      <FormError message={error && ITEM_ERRORS[error]} />
      {saved && <p role="status" className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">저장했습니다.</p>}

      <form action={updateItem} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <input type="hidden" name="id" value={item.id} />
        <ItemFields v={item} partners={partners} />
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="active" defaultChecked={item.active} className="w-4 h-4" /> 사용
          </label>
          <button type="submit" className={btnPrimary}>저장</button>
        </div>
      </form>

      {item.kind === "ASSY" ? (
        <Panel title={`BOM — 자도번 ${item.bomChildren.length}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><Th>자도번</Th><Th>품명</Th><Th right>사용수량</Th><Th>사급</Th><Th right>단가</Th><Th></Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {item.bomChildren.length === 0 ? <EmptyRow cols={6} text="등록된 자도번이 없습니다" /> : item.bomChildren.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">
                      <Link href={`/admin/items/${b.childId}`} className="text-blue-600 hover:underline">{b.child.code}</Link>
                    </td>
                    <Td strong>{b.child.name}</Td>
                    <Td right>{formatQty(b.qtyPer)} {b.child.unit}</Td>
                    <Td>{b.child.sagubType ? <span className="text-amber-700 font-semibold">{b.child.sagubType}</span> : "자체"}</Td>
                    <Td right muted>{b.child.unitPrice.toLocaleString()}</Td>
                    <Td right>
                      <form action={removeBomLine.bind(null, b.id)}><button className={btnSmDanger}>빼기</button></form>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form action={addBomLine} className="flex flex-wrap items-end gap-3 px-5 py-4 bg-slate-50 border-t border-slate-100">
            <input type="hidden" name="parentId" value={item.id} />
            <div>
              <label htmlFor="childCode" className={labelCls}>자도번 P/No</label>
              <input id="childCode" name="childCode" list="parts" required className={`${inputCls} font-mono w-56 uppercase`} />
              <datalist id="parts">{parts.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}</datalist>
            </div>
            <div>
              <label htmlFor="qtyPer" className={labelCls}>사용수량 (도번 1개당)</label>
              <input id="qtyPer" name="qtyPer" type="number" step="any" min="0" required className={`${inputCls} w-36`} />
            </div>
            <button type="submit" className={btnPrimary}>BOM에 추가</button>
            <p className="text-[11px] text-slate-400 w-full">같은 자도번을 다시 넣으면 사용수량만 바뀝니다.</p>
          </form>
        </Panel>
      ) : (
        <Panel title={`사용처 — 도번 ${item.bomParents.length}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><Th>도번</Th><Th>품명</Th><Th>담당 협력사</Th><Th right>사용수량</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {item.bomParents.length === 0 ? <EmptyRow cols={4} text="이 자도번을 쓰는 도번이 없습니다" /> : item.bomParents.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">
                      <Link href={`/admin/items/${b.parentId}`} className="text-blue-600 hover:underline">{b.parent.code}</Link>
                    </td>
                    <Td strong>{b.parent.name}</Td>
                    <Td>{b.parent.partner?.name ?? "—"}</Td>
                    <Td right>{formatQty(b.qtyPer)}</Td>
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
