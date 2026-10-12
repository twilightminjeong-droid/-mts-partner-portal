import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePartner } from "@/lib/session";
import { toItems } from "@/lib/attachments";
import { PARTNER_DELIVERY_KINDS } from "@/lib/attachment-kinds";
import { dateToYmd } from "@/lib/dates";
import { DELIVERY_STATUS_MAP, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumb, FormError, PageHeader, btnPrimary, btnSecondary, btnSmDanger, inputCls, labelCls } from "@/components/ui/kit";
import { AttachmentList } from "@/components/attachments/AttachmentList";
import { AttachmentUploader } from "@/components/attachments/AttachmentUploader";
import { cancelStatement, updateStatement } from "../actions";

const ERRORS: Record<string, string> = {
  locked: "입고가 시작된 명세서는 고칠 수 없습니다. 발주사 구매팀에 문의해 주세요.",
  qty: "수량은 1 이상, 남은 계획(또는 발주수량) 이하로 입력해 주세요.",
  date: "납품일을 입력해 주세요.",
};

export default async function StatementDetail({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const user = await requirePartner();
  const { id } = await params;
  const { error, saved } = await searchParams;

  const d = await db.delivery.findFirst({
    where: { id, partnerId: user.id },
    include: { order: { select: { id: true, orderNo: true } }, attachments: { orderBy: { createdAt: "asc" } } },
  });
  if (!d) notFound();
  const editable = d.status === "SUBMITTED";
  const open = editable || d.status === "INSPECTING";

  const info: [string, string][] = [
    ["근거", d.order ? `발주서 ${d.order.orderNo}` : "생산계획"],
    ["품번 / 품명", `${d.itemCode} · ${d.itemName}`],
    ["규격", d.spec ?? "—"],
    ["단가", `${d.unitPrice.toLocaleString()}원`],
    ["공급가액", `${(d.deliveredQty * d.unitPrice).toLocaleString()}원`],
    ["발행일시", d.createdAt.toLocaleString("ko-KR")],
  ];
  if (d.receivedAt) info.push(["입고일시", d.receivedAt.toLocaleString("ko-KR")]);
  if (d.inspectedAt) {
    info.push(["검수", `합격 ${d.passQty?.toLocaleString()} / 불합격 ${d.failQty?.toLocaleString()} ${d.unit} · ${formatDate(d.inspectedAt)}`]);
    if (d.inspectNote) info.push(["검수 의견", d.inspectNote]);
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl space-y-5">
      <Breadcrumb href="/statements" label="거래명세표 수정" current={d.deliveryNo} />
      <PageHeader title={d.deliveryNo} sub={`${formatDate(d.deliveryDate)} 납품`}
        action={<div className="flex items-center gap-2">
          <Badge {...DELIVERY_STATUS_MAP[d.status]} />
          <a href={`/print/statement/${d.id}`} target="_blank" rel="noopener" className={btnSecondary}>인쇄</a>
        </div>} />
      <FormError message={error && ERRORS[error]} />
      {saved && <p role="status" className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">저장했습니다.</p>}

      <div className="grid md:grid-cols-2 gap-5">
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">명세서 정보</h2>
          <dl>
            {info.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5 border-b border-slate-50 last:border-0 text-sm">
                <dt className="text-slate-500 whitespace-nowrap">{k}</dt>
                <dd className="font-medium text-slate-900 text-right tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        {editable ? (
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-4">수정</h2>
            <form action={updateStatement} className="space-y-4">
              <input type="hidden" name="id" value={d.id} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="deliveredQty" className={labelCls}>납품수량 ({d.unit})</label>
                  <input id="deliveredQty" name="deliveredQty" type="number" min={1} required defaultValue={d.deliveredQty} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="packQty" className={labelCls}>포장수</label>
                  <input id="packQty" name="packQty" type="number" min={0} defaultValue={d.packQty ?? ""} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="deliveryDate" className={labelCls}>납품일</label>
                  <input id="deliveryDate" name="deliveryDate" type="date" required defaultValue={dateToYmd(d.deliveryDate)} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="vehicle" className={labelCls}>차량번호</label>
                  <input id="vehicle" name="vehicle" defaultValue={d.vehicle ?? ""} className={inputCls} />
                </div>
              </div>
              <button type="submit" className={`${btnPrimary} w-full`}>변경 저장</button>
            </form>
            <form action={cancelStatement.bind(null, d.id)} className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400">취소하면 명세서 번호와 첨부 서류가 함께 삭제됩니다.</p>
              <button className={btnSmDanger}>명세서 취소</button>
            </form>
          </section>
        ) : (
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-sm text-slate-600">
            <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">수량 · 일자</h2>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{d.deliveredQty.toLocaleString()} <span className="text-sm font-medium text-slate-500">{d.unit}</span></p>
            <p className="mt-1">포장 {d.packQty ?? "—"} · 차량 {d.vehicle ?? "—"}</p>
            <p className="mt-4 text-xs text-slate-400">입고가 시작되어 수정할 수 없습니다.</p>
          </section>
        )}
      </div>

      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">첨부 서류</h2>
        <AttachmentList items={toItems(d.attachments, user, { delivery: d, order: null })} />
        {open && <AttachmentUploader target="delivery" targetId={d.id} kinds={PARTNER_DELIVERY_KINDS.filter(k => k !== "STATEMENT")} />}
        {d.order && <p className="text-xs text-slate-400 mt-3">발주서 첨부(도면 등)는 <Link href={`/orders/${d.order.id}`} className="text-blue-600 hover:underline">{d.order.orderNo}</Link>에서 받을 수 있습니다.</p>}
      </section>
    </div>
  );
}
