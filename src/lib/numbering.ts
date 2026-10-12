import { db } from "@/lib/db";

async function next(prefix: string, latest: (p: string) => Promise<string | undefined>) {
  const p = `${prefix}-${new Date().getFullYear()}-`;
  const last = await latest(p);
  const seq = last ? parseInt(last.slice(p.length), 10) + 1 : 1;
  return p + String(seq).padStart(4, "0");
}

export const nextOrderNo = () =>
  next("PO", p => db.order.findFirst({
    where: { orderNo: { startsWith: p } }, orderBy: { orderNo: "desc" }, select: { orderNo: true },
  }).then(r => r?.orderNo));

export const nextDeliveryNo = () =>
  next("DN", p => db.delivery.findFirst({
    where: { deliveryNo: { startsWith: p } }, orderBy: { deliveryNo: "desc" }, select: { deliveryNo: true },
  }).then(r => r?.deliveryNo));

/** 한 번에 여러 장 발행할 때 연속 번호 */
export async function nextDeliveryNos(count: number) {
  const first = await nextDeliveryNo();
  const prefix = first.slice(0, first.lastIndexOf("-") + 1);
  const start = parseInt(first.slice(prefix.length), 10);
  return Array.from({ length: count }, (_, i) => prefix + String(start + i).padStart(4, "0"));
}

export const nextInvoiceNo = () =>
  next("INV", p => db.invoice.findFirst({
    where: { invoiceNo: { startsWith: p } }, orderBy: { invoiceNo: "desc" }, select: { invoiceNo: true },
  }).then(r => r?.invoiceNo));
