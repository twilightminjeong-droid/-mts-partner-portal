import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumb, FormError, PageHeader, btnPrimary, btnSecondary, inputCls, labelCls } from "@/components/ui/kit";
import { DELIVERY_STATUS_MAP, formatDate, formatQty } from "@/lib/utils";
import { inspectDelivery } from "@/app/admin/actions";
import { toItems } from "@/lib/attachments";
import { ADMIN_DELIVERY_KINDS, fileErrorFromQuery } from "@/lib/attachment-kinds";
import { AttachmentList } from "@/components/attachments/AttachmentList";
import { AttachmentUploader } from "@/components/attachments/AttachmentUploader";
import { FileField } from "@/components/attachments/FileField";

export default async function InspectPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireAdmin();
  const { id } = await params;
  const { error } = await searchParams;

  const d = await db.delivery.findUnique({
    where: { id },
    include: {
      order: { select: { orderNo: true, quantity: true } },
      partner: true,
      attachments: { orderBy: { createdAt: "asc" } },
      sagubTxns: { include: { item: { select: { code: true, name: true, unit: true } } } },
    },
  });
  if (!d) notFound();

  const info: [string, string][] = [
    ["명세서번호", d.deliveryNo],
    ["협력사", `${d.partner.name} (${d.partner.code})`],
    ["근거", d.order ? `발주서 ${d.order.orderNo} (발주 ${d.order.quantity.toLocaleString()} ${d.unit})` : "생산계획"],
    ["품목", `${d.itemCode} · ${d.itemName}${d.spec ? ` · ${d.spec}` : ""}`],
    ["납품 수량 / 포장", `${d.deliveredQty.toLocaleString()} ${d.unit} / ${d.packQty ?? "—"}`],
    ["단가", `${d.unitPrice.toLocaleString()}원`],
    ["납품일", formatDate(d.deliveryDate)],
    ["차량번호", d.vehicle ?? "—"],
  ];
  if (d.receivedAt) info.push(["입고일시", d.receivedAt.toLocaleString("ko-KR")]);

  return (
    <div className="p-4 md:p-6 max-w-5xl">
      <Breadcrumb href="/admin/deliveries" label="입고 / 검수" current={d.deliveryNo} />
      <PageHeader title="수입검사" sub="합격 수량을 입력하면 불합격 수량은 자동 계산됩니다"
        action={<div className="flex items-center gap-2">
          <Badge {...DELIVERY_STATUS_MAP[d.status]} />
          <a href={`/print/statement/${d.id}`} target="_blank" rel="noopener" className={btnSecondary}>명세서 인쇄</a>
        </div>} />
      <FormError message={error === "qty" ? `합격 수량은 0 이상 ${d.deliveredQty.toLocaleString()} 이하로 입력해 주세요.` : fileErrorFromQuery(error)} />

      <div className="grid md:grid-cols-2 gap-5">
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">납품 정보</h2>
          <dl>
            {info.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5 border-b border-slate-50 last:border-0 text-sm">
                <dt className="text-slate-500">{k}</dt>
                <dd className="font-medium text-slate-900 text-right tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        {d.status === "INSPECTING" ? (
          <form action={inspectDelivery} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
            <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">검사 결과</h2>
            <input type="hidden" name="deliveryId" value={d.id} />
            <div>
              <label htmlFor="passQty" className={labelCls}>합격 수량</label>
              <div className="flex items-center gap-2">
                <input id="passQty" name="passQty" type="number" min={0} max={d.deliveredQty} required
                  defaultValue={d.deliveredQty} className={inputCls} />
                <span className="text-sm text-slate-500 whitespace-nowrap">/ {d.deliveredQty.toLocaleString()} {d.unit}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">0을 입력하면 전량 불합격 처리되고, 발주는 재납품 대기로 돌아갑니다.</p>
            </div>
            <div>
              <label htmlFor="inspectNote" className={labelCls}>검사 의견</label>
              <textarea id="inspectNote" name="inspectNote" rows={4}
                placeholder="예) 샘플검사 AQL 1.0, 외관·치수 이상 없음" className={inputCls} />
            </div>
            <FileField name="inspectionReport" label="검수성적서" hint="검사 결과와 함께 저장됩니다" />
            <div className="flex gap-3">
              <Link href="/admin/deliveries" className={`${btnSecondary} flex-1`}>취소</Link>
              <button type="submit" className={`${btnPrimary} flex-[2]`}>검수 결과 저장</button>
            </div>
          </form>
        ) : (
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">검사 결과</h2>
            {d.inspectedAt ? (
              <dl className="text-sm">
                {([
                  ["합격 / 불합격", `${d.passQty?.toLocaleString()} / ${d.failQty?.toLocaleString()} ${d.unit}`],
                  ["검수일", formatDate(d.inspectedAt)],
                  ["검수자", d.inspectedBy ?? "—"],
                  ["의견", d.inspectNote ?? "—"],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-2.5 border-b border-slate-50 last:border-0">
                    <dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-900 text-right">{v}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-slate-500">입고 접수 후 검수를 입력할 수 있습니다.</p>
            )}
          </section>
        )}
      </div>

      {d.sagubTxns.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mt-5">
          <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">입고로 소진된 사급자재</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {d.sagubTxns.map(t => (
              <li key={t.id} className="flex justify-between py-2">
                <span><span className="font-mono text-xs mr-2">{t.item.code}</span>{t.item.name}</span>
                <span className="tabular-nums font-semibold">{formatQty(t.qty)} {t.item.unit}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mt-5">
        <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">납품·검수 서류</h2>
        <AttachmentList items={toItems(d.attachments, user, { delivery: d, order: null })} />
        {d.status !== "SUBMITTED" && d.status !== "INSPECTING" && (
          <AttachmentUploader target="delivery" targetId={d.id} kinds={ADMIN_DELIVERY_KINDS} />
        )}
      </section>
    </div>
  );
}
