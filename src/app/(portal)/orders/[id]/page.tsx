import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePartner } from "@/lib/session";
import { toItems } from "@/lib/attachments";
import { DELIVERY_STATUS_MAP, ORDER_STATUS_MAP, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumb, PageHeader, btnPrimary, btnSm } from "@/components/ui/kit";
import { AttachmentList } from "@/components/attachments/AttachmentList";

const STEPS = ["발주", "명세서 발행", "입고", "검수완료", "정산"];
const STEP: Record<string, number> = { PENDING: 0, DELIVERING: 1, DELIVERED: 2, PASSED: 3, SETTLED: 4 };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePartner();
  const { id } = await params;

  const order = await db.order.findFirst({
    where: { id, partnerId: user.id },
    include: {
      attachments: { orderBy: { createdAt: "asc" } },
      deliveries: { orderBy: { createdAt: "desc" }, select: { id: true, deliveryNo: true, deliveredQty: true, deliveryDate: true, status: true } },
    },
  });
  if (!order) notFound();
  const current = STEP[order.status] ?? -1;

  const info: [string, string][] = [
    ["발주일", formatDate(order.createdAt)],
    ["품목", `${order.itemCode} · ${order.itemName}`],
    ["규격", order.spec ?? "—"],
    ["수량 / 단가", `${order.quantity.toLocaleString()} ${order.unit} × ${order.unitPrice.toLocaleString()}원`],
    ["공급가액", `${order.totalPrice.toLocaleString()}원`],
    ["납기일", formatDate(order.dueDate)],
    ["요청사항", order.note ?? "—"],
  ];

  return (
    <div className="p-4 md:p-6 max-w-5xl space-y-5">
      <Breadcrumb href="/orders" label="협력사 발주현황" current={order.orderNo} />
      <PageHeader title={order.orderNo} action={<div className="flex items-center gap-2">
        <Badge {...ORDER_STATUS_MAP[order.status]} />
        {order.status === "PENDING" && <Link href={`/statements/new?order=${order.id}`} className={btnPrimary}>거래명세서 발행</Link>}
      </div>} />

      {order.status !== "CANCELLED" && (
        <ol className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4 flex items-center">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center flex-1 last:flex-none">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold
                ${i < current ? "bg-emerald-500 text-white" : i === current ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                {i < current ? "✓" : i + 1}
              </span>
              <span className={`ml-2 text-xs font-medium whitespace-nowrap ${i === current ? "text-blue-700" : i < current ? "text-emerald-700" : "text-slate-400"}`}>{s}</span>
              {i < STEPS.length - 1 && <span className={`flex-1 h-0.5 mx-3 ${i < current ? "bg-emerald-400" : "bg-slate-200"}`} />}
            </li>
          ))}
        </ol>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">발주 정보</h2>
          <dl>
            {info.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5 border-b border-slate-50 last:border-0 text-sm">
                <dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-900 text-right tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">발주 첨부 (발주사 제공)</h2>
          <AttachmentList items={toItems(order.attachments, user, { order, delivery: null })} empty="발주사가 첨부한 파일이 없습니다" />
        </section>
      </div>

      {order.deliveries.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">발행한 명세서</h2>
          <ul className="divide-y divide-slate-100">
            {order.deliveries.map(d => (
              <li key={d.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="font-mono text-xs">{d.deliveryNo}</span>
                <span className="tabular-nums">{d.deliveredQty.toLocaleString()} {order.unit}</span>
                <span className="text-slate-500">{formatDate(d.deliveryDate)}</span>
                <span className="ml-auto"><Badge {...DELIVERY_STATUS_MAP[d.status]} /></span>
                <Link href={`/statements/${d.id}`} className={btnSm}>명세서</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
