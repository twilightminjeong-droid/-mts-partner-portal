"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { nextOrderNo } from "@/lib/numbering";
import { discardFiles, filesFrom, validateFiles, withStoredFiles, type FileEntry } from "@/lib/attachments";
import { consumeForDelivery } from "@/lib/sagub";

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

/* ── 협력사 ── */

export async function createPartner(fd: FormData) {
  await requireAdmin();
  const code = str(fd, "code").toLowerCase();
  const name = str(fd, "name");
  const password = str(fd, "password");

  if (!/^[a-z0-9_-]{3,20}$/.test(code)) redirect("/admin/partners/new?error=code");
  if (!name) redirect("/admin/partners/new?error=name");
  if (password.length < 8) redirect("/admin/partners/new?error=password");
  if (await db.partner.findUnique({ where: { code } })) redirect("/admin/partners/new?error=duplicate");

  await db.partner.create({
    data: {
      code,
      name,
      grade: str(fd, "grade") || "1차",
      phone: str(fd, "phone") || null,
      email: str(fd, "email") || null,
      passwordHash: await bcrypt.hash(password, 12),
    },
  });
  redirect("/admin/partners");
}

export async function togglePartner(id: string) {
  await requireAdmin();
  const p = await db.partner.findUnique({ where: { id } });
  if (p) await db.partner.update({ where: { id }, data: { active: !p.active } });
  revalidatePath("/admin/partners");
}

/* ── 발주 ── */

export async function createOrder(fd: FormData) {
  const admin = await requireAdmin();
  const partnerId = str(fd, "partnerId");
  const quantity = Number(fd.get("quantity"));
  const unitPrice = Number(fd.get("unitPrice"));
  const dueDate = new Date(str(fd, "dueDate"));
  const itemCode = str(fd, "itemCode");
  const itemName = str(fd, "itemName");

  const partner = await db.partner.findFirst({ where: { id: partnerId, active: true } });
  if (!partner) redirect("/admin/orders/new?error=partner");
  if (!itemCode || !itemName) redirect("/admin/orders/new?error=item");
  if (!Number.isInteger(quantity) || quantity < 1) redirect("/admin/orders/new?error=qty");
  if (!Number.isInteger(unitPrice) || unitPrice < 0) redirect("/admin/orders/new?error=price");
  if (Number.isNaN(dueDate.getTime())) redirect("/admin/orders/new?error=date");

  const entries: FileEntry[] = [
    ...filesFrom(fd, "orderDoc").map(file => ({ file, kind: "ORDER_DOC" as const })),
    ...filesFrom(fd, "drawing").map(file => ({ file, kind: "DRAWING" as const })),
  ];
  const problem = validateFiles(entries);
  if (problem) redirect(`/admin/orders/new?error=file-${problem.code}`);

  const orderNo = await nextOrderNo();
  await withStoredFiles(entries, admin, stored => db.order.create({
    data: {
      orderNo,
      attachments: { create: stored },
      partnerId,
      itemCode,
      itemName,
      spec: str(fd, "spec") || null,
      unit: str(fd, "unit") || "EA",
      quantity,
      unitPrice,
      totalPrice: quantity * unitPrice,
      dueDate,
      note: str(fd, "note") || null,
      status: "PENDING",
    },
  }));
  redirect("/admin/orders");
}

export async function cancelOrder(id: string) {
  await requireAdmin();
  // 명세서가 나간 발주는 협력사가 명세서를 먼저 취소해야 한다
  await db.order.updateMany({ where: { id, status: "PENDING" }, data: { status: "CANCELLED" } });
  revalidatePath("/admin/orders");
}

/* ── 입고 / 검수 ── */

/** 입고 접수: 검수 대기로 넘기고, 생산계획 납품이면 BOM 기준으로 사급자재를 소진 처리 */
async function receive(id: string, by: string) {
  return db.$transaction(async tx => {
    const d = await tx.delivery.findFirst({ where: { id, status: "SUBMITTED" } });
    if (!d) return null;
    await tx.delivery.update({ where: { id }, data: { status: "INSPECTING", receivedAt: new Date() } });
    if (d.orderId) await tx.order.update({ where: { id: d.orderId }, data: { status: "DELIVERED" } });
    await consumeForDelivery(tx, d, by);
    return d;
  });
}

export async function receiveDelivery(id: string) {
  const admin = await requireAdmin();
  await receive(id, admin.name ?? admin.code);
  revalidatePath("/admin/deliveries");
}

export type ScanState = { seq: number; ok?: string; error?: string };

/** 명세서 바코드(번호) 스캔 입고 */
export async function receiveByNo(prev: ScanState, fd: FormData): Promise<ScanState> {
  const admin = await requireAdmin();
  const seq = prev.seq + 1;
  const no = str(fd, "deliveryNo").toUpperCase();
  if (!no) return { seq, error: "명세서 번호를 스캔하거나 입력해 주세요." };

  const d = await db.delivery.findUnique({ where: { deliveryNo: no }, include: { partner: { select: { name: true } } } });
  if (!d) return { seq, error: `${no}: 없는 명세서 번호입니다.` };
  if (d.status !== "SUBMITTED") return { seq, error: `${no}: 이미 입고된 명세서입니다.` };

  await receive(d.id, admin.name ?? admin.code);
  revalidatePath("/admin/deliveries");
  return { seq, ok: `${no} 입고 완료 — ${d.partner.name} · ${d.itemName} ${d.deliveredQty.toLocaleString()}${d.unit}` };
}

export async function inspectDelivery(fd: FormData) {
  const admin = await requireAdmin();
  const id = str(fd, "deliveryId");
  const passQty = Number(fd.get("passQty"));
  const inspectNote = str(fd, "inspectNote") || null;

  const d = await db.delivery.findFirst({ where: { id, status: "INSPECTING" } });
  if (!d) redirect("/admin/deliveries");
  if (!Number.isInteger(passQty) || passQty < 0 || passQty > d.deliveredQty) {
    redirect(`/admin/deliveries/${id}?error=qty`);
  }

  const entries: FileEntry[] = filesFrom(fd, "inspectionReport").map(file => ({ file, kind: "INSPECTION" as const }));
  const problem = validateFiles(entries);
  if (problem) redirect(`/admin/deliveries/${id}?error=file-${problem.code}`);

  const failQty = d.deliveredQty - passQty;
  const passed = passQty > 0;

  await withStoredFiles(entries, admin, stored => db.$transaction([
    db.delivery.update({
      where: { id },
      data: {
        status: passed ? "PASSED" : "FAILED",
        inspectResult: failQty === 0 ? "PASS" : passed ? "PARTIAL" : "FAIL",
        passQty,
        failQty,
        inspectNote,
        inspectedAt: new Date(),
        inspectedBy: admin.name ?? admin.code,
        attachments: { create: stored },
      },
    }),
    // 전량 불합격이면 협력사가 다시 납품할 수 있도록 발주를 납품대기로 되돌린다
    ...(d.orderId ? [db.order.update({ where: { id: d.orderId }, data: { status: passed ? "PASSED" : "PENDING" } })] : []),
  ]));
  redirect("/admin/deliveries");
}

/* ── 세금계산서 / 지급 ── */

const INVOICE_NEXT = { ISSUED: "REVIEWING", REVIEWING: "APPROVED", APPROVED: "PAID" } as const;

export async function advanceInvoice(id: string) {
  await requireAdmin();
  const inv = await db.invoice.findUnique({ where: { id }, include: { delivery: true } });
  if (!inv || !(inv.status in INVOICE_NEXT)) return;

  const next = INVOICE_NEXT[inv.status as keyof typeof INVOICE_NEXT];
  if (next === "PAID") {
    await db.$transaction([
      db.invoice.update({ where: { id }, data: { status: "PAID", paidAt: new Date() } }),
      ...(inv.delivery.orderId ? [db.order.update({ where: { id: inv.delivery.orderId }, data: { status: "SETTLED" } })] : []),
    ]);
  } else {
    await db.invoice.update({ where: { id }, data: { status: next } });
  }
  revalidatePath("/admin/invoices");
}

/* ── 공지사항 ── */

export async function createNotice(fd: FormData) {
  const admin = await requireAdmin();
  const title = str(fd, "title");
  const content = str(fd, "content");
  const category = ["중요", "공지", "일반"].includes(str(fd, "category")) ? str(fd, "category") : "일반";
  if (!title || !content) redirect("/admin/notices/new?error=empty");

  const entries: FileEntry[] = filesFrom(fd, "noticeFiles").map(file => ({ file, kind: "NOTICE" as const }));
  const problem = validateFiles(entries);
  if (problem) redirect(`/admin/notices/new?error=file-${problem.code}`);

  await withStoredFiles(entries, admin, stored => db.notice.create({
    data: { title, content, category, author: admin.grade, attachments: { create: stored } },
  }));
  redirect("/admin/notices");
}

export async function deleteNotice(id: string) {
  await requireAdmin();
  const files = await db.attachment.findMany({ where: { noticeId: id }, select: { storageKey: true } });
  await db.notice.deleteMany({ where: { id } });
  await discardFiles(files);
  revalidatePath("/admin/notices");
}
