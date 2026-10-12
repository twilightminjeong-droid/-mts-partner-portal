"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePartner } from "@/lib/session";
import { getPlanStatus } from "@/lib/plan";
import { isYmd, todayYmd, ymdToDate } from "@/lib/dates";
import { nextDeliveryNos } from "@/lib/numbering";
import { discardFiles } from "@/lib/attachments";

const PLAN_WINDOW = 31;

/** 계획 기준 납품 한도 = 오늘부터 31일 안의 잔여 + 이월 잔여 */
async function planLimits(partnerId: string) {
  const { rows } = await getPlanStatus(partnerId, todayYmd(), PLAN_WINDOW);
  return new Map(rows.map(r => [r.item.id, { limit: r.carryOver + r.periodRemain, item: r.item }]));
}

const int = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s === "" ? null : Number(s);
};

export async function issueStatements(fd: FormData) {
  const user = await requirePartner();
  const back = (code: string) => redirect(`/statements/new?error=${code}`);

  const date = String(fd.get("deliveryDate"));
  if (!isYmd(date)) back("date");
  const vehicle = String(fd.get("vehicle") ?? "").trim() || null;

  type Line = {
    itemId: string | null; orderId: string | null; itemCode: string; itemName: string; spec: string | null;
    unit: string; unitPrice: number; qty: number; pack: number | null;
  };
  const lines: Line[] = [];

  const limits = await planLimits(user.id);
  for (const [key, value] of fd.entries()) {
    if (!key.startsWith("qty_item_")) continue;
    const qty = int(value);
    if (qty === null || qty === 0) continue;
    const itemId = key.slice("qty_item_".length);
    const l = limits.get(itemId);
    if (!l || !Number.isInteger(qty) || qty < 1 || qty > l.limit) back("qty");
    const pack = int(fd.get(`pack_item_${itemId}`));
    lines.push({
      itemId, orderId: null, itemCode: l!.item.code, itemName: l!.item.name, spec: l!.item.spec,
      unit: l!.item.unit, unitPrice: l!.item.unitPrice, qty: qty!, pack: pack && pack > 0 ? pack : null,
    });
  }

  const orderIds = [...fd.keys()].filter(k => k.startsWith("qty_order_")).map(k => k.slice("qty_order_".length));
  const orders = orderIds.length
    ? await db.order.findMany({ where: { id: { in: orderIds }, partnerId: user.id, status: "PENDING" } })
    : [];
  for (const id of orderIds) {
    const qty = int(fd.get(`qty_order_${id}`));
    if (qty === null || qty === 0) continue;
    const o = orders.find(x => x.id === id);
    if (!o || !Number.isInteger(qty) || qty < 1 || qty > o.quantity) back("qty");
    const pack = int(fd.get(`pack_order_${id}`));
    lines.push({
      itemId: null, orderId: id, itemCode: o!.itemCode, itemName: o!.itemName, spec: o!.spec,
      unit: o!.unit, unitPrice: o!.unitPrice, qty: qty!, pack: pack && pack > 0 ? pack : null,
    });
  }

  if (lines.length === 0) back("none");

  const nos = await nextDeliveryNos(lines.length);
  await db.$transaction([
    ...lines.map((l, i) => db.delivery.create({
      data: {
        deliveryNo: nos[i],
        partnerId: user.id,
        itemId: l.itemId,
        orderId: l.orderId,
        itemCode: l.itemCode,
        itemName: l.itemName,
        spec: l.spec,
        unit: l.unit,
        unitPrice: l.unitPrice,
        deliveredQty: l.qty,
        packQty: l.pack,
        deliveryDate: ymdToDate(date),
        vehicle,
      },
    })),
    ...lines.filter(l => l.orderId).map(l => db.order.update({ where: { id: l.orderId! }, data: { status: "DELIVERING" } })),
  ]);

  redirect(`/statements?issued=${nos.join(",")}`);
}

async function ownSubmitted(partnerId: string, id: string) {
  return db.delivery.findFirst({ where: { id, partnerId, status: "SUBMITTED" } });
}

export async function updateStatement(fd: FormData) {
  const user = await requirePartner();
  const id = String(fd.get("id"));
  const back = (code: string) => redirect(`/statements/${id}?error=${code}`);

  const d = await ownSubmitted(user.id, id);
  if (!d) back("locked");

  const qty = Number(fd.get("deliveredQty"));
  const date = String(fd.get("deliveryDate"));
  const pack = int(fd.get("packQty"));
  if (!isYmd(date)) back("date");

  let limit: number;
  if (d!.orderId) {
    limit = (await db.order.findUnique({ where: { id: d!.orderId } }))!.quantity;
  } else {
    // 지금 이 명세서 수량도 잔여 계산에 이미 들어가 있으므로 더해서 본다
    limit = (await planLimits(user.id)).get(d!.itemId!)?.limit ?? 0;
    limit += d!.deliveredQty;
  }
  if (!Number.isInteger(qty) || qty < 1 || qty > limit) back("qty");

  await db.delivery.update({
    where: { id },
    data: {
      deliveredQty: qty,
      deliveryDate: ymdToDate(date),
      vehicle: String(fd.get("vehicle") ?? "").trim() || null,
      packQty: pack && pack > 0 ? pack : null,
    },
  });
  redirect(`/statements/${id}?saved=1`);
}

export async function cancelStatement(id: string) {
  const user = await requirePartner();
  const d = await ownSubmitted(user.id, id);
  if (!d) return;
  const files = await db.attachment.findMany({ where: { deliveryId: id }, select: { storageKey: true } });
  await db.$transaction([
    db.delivery.delete({ where: { id } }),
    ...(d.orderId ? [db.order.update({ where: { id: d.orderId }, data: { status: "PENDING" } })] : []),
  ]);
  await discardFiles(files);
  revalidatePath("/statements");
  redirect("/statements?cancelled=" + encodeURIComponent(d.deliveryNo));
}
