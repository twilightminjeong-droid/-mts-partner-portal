import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { toItems } from "@/lib/attachments";
import { ADMIN_ORDER_KINDS } from "@/lib/attachment-kinds";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumb, PageHeader, btnSm } from "@/components/ui/kit";
import { AttachmentList } from "@/components/attachments/AttachmentList";
import { AttachmentUploader } from "@/components/attachments/AttachmentUploader";
import { DELIVERY_STATUS_MAP, ORDER_STATUS_MAP, formatDate } from "@/lib/utils";

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    include: {
      partner: true,
      attachments: { orderBy: { createdAt: "asc" } },
      deliveries: { orderBy: { createdAt: "desc" }, include: { attachments: { orderBy: { createdAt: "asc" } } } },
    },
  });
  if (!order) notFound();

  const info: [string, string][] = [
    ["협력사", `${order.partner.name} (${order.partner.code})`],
    ["품목", `${order.itemCode} · ${order.itemName}`],
    ["규격", order.spec ?? "—"],
    ["수량 / 단가", `${order.quantity.toLocaleString()} ${order.unit} × ${order.unitPrice.toLocaleString()}원`],
    ["공급가액", `${order.totalPrice.toLocaleString()}원`],
    ["납기일", formatDate(order.dueDate)],
   ["요청사항", order.note ?? "—"],
  ];

  return (
    <div className="p-7 max-w-4xl space-y-5">
      <Breadcrumb href="/admin/orders" label="발주 관리" current={order.orderNo} />
      <PageHeader title={order.orderNo} sub={`${formatDate(order.createdAt)} 발행`} action={<Badge {...ORDER_STATUS_MAP[order.status]} />} />

      <div className="grid md:grid-cols-2 gap-5">
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">발주 정보</h2>
          <dl>
            {info.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5 border-b border-slate-50 last:border-0 text-sm">
                <dt className="text-slate-500">{k}</dt>
                <dd className="font-medium text-slate-900 text-right tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">발주 첨부</h2>
          <AttachmentList items={toItems(order.attachments, user, { order, delivery: null })} />
          <AttachmentUploader target="order" targetId={order.id} kinds={ADMIN_ORDER_KINDS} />
        </section>
      </div>

      {order.deliveries.length === 0 ? (
        <p className="text-sm text-slate-400">아직 납품 신청이 없습니다.</p>
      ) : order.deliveries.map(d => (
        <section key={d.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-semibold text-slate-900">
              <span className="font-mono text-xs text-slate-500 mr-2">{d.deliveryNo}</span>
              {d.deliveredQty.toLocaleString()} {order.unit} · {formatDate(d.deliveryDate)}
            </h2>
            <div className="flex items-center gap-2">
              <Badge {...DELIVERY_STATUS_MAP[d.status]} />
              <Link href={`/admin/deliveries/${d.id}`} className={btnSm}>검수 화면</Link>
            </div>
          </div>
          <AttachmentList items={toItems(d.attachments, user, { delivery: d, order: null })} />
        </section>
      ))}
    </div>
  );
}
