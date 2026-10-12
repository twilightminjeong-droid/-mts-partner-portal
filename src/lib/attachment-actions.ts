"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { canDelete, filesFrom, validateFiles, withStoredFiles } from "@/lib/attachments";
import { deleteObject } from "@/lib/storage";
import {
  ADMIN_DELIVERY_KINDS, ADMIN_ORDER_KINDS, PARTNER_DELIVERY_KINDS, type AttachmentKind,
} from "@/lib/attachment-kinds";

export type UploadState = { error?: string; ok?: number; seq: number };

function revalidateTargets(orderId: string | null, deliveryId?: string) {
  if (orderId) {
    revalidatePath(`/orders/${orderId}`);
    revalidatePath(`/admin/orders/${orderId}`);
  }
  revalidatePath("/statements");
  revalidatePath("/admin/deliveries");
  if (deliveryId) {
    revalidatePath(`/statements/${deliveryId}`);
    revalidatePath(`/admin/deliveries/${deliveryId}`);
  }
}

export async function uploadAttachments(prev: UploadState, fd: FormData): Promise<UploadState> {
  const seq = prev.seq + 1;
  const session = await auth();
  const user = session?.user;
  if (!user) return { seq, error: "로그인이 만료됐습니다. 다시 로그인해 주세요." };

  const target = String(fd.get("target"));
  const targetId = String(fd.get("targetId"));
  const kind = String(fd.get("kind")) as AttachmentKind;
  const files = filesFrom(fd, "files");
  if (files.length === 0) return { seq, error: "올릴 파일을 선택해 주세요." };

  let link: { orderId: string } | { deliveryId: string };
  let orderId: string | null;
  let deliveryId: string | undefined;

  if (target === "order") {
    if (user.role !== "admin" || !ADMIN_ORDER_KINDS.includes(kind)) return { seq, error: "이 발주에는 파일을 올릴 권한이 없습니다." };
    const order = await db.order.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!order) return { seq, error: "발주를 찾을 수 없습니다." };
    link = { orderId: order.id };
    orderId = order.id;
  } else if (target === "delivery") {
    const d = await db.delivery.findUnique({ where: { id: targetId }, select: { id: true, orderId: true, partnerId: true, status: true } });
    if (!d) return { seq, error: "명세서를 찾을 수 없습니다." };
    const allowed = user.role === "admin"
      ? ADMIN_DELIVERY_KINDS.includes(kind)
      : d.partnerId === user.id && PARTNER_DELIVERY_KINDS.includes(kind) && (d.status === "SUBMITTED" || d.status === "INSPECTING");
    if (!allowed) return { seq, error: "검수가 끝난 명세서에는 서류를 추가할 수 없습니다." };
    link = { deliveryId: d.id };
    orderId = d.orderId;
    deliveryId = d.id;
  } else {
    return { seq, error: "잘못된 요청입니다." };
  }

  const entries = files.map(file => ({ file, kind }));
  const problem = validateFiles(entries);
  if (problem) return { seq, error: problem.message };

  await withStoredFiles(entries, user, stored =>
    db.attachment.createMany({ data: stored.map(s => ({ ...s, ...link })) }),
  );
  revalidateTargets(orderId, deliveryId);
  return { seq, ok: files.length };
}

export async function deleteAttachment(id: string) {
  const session = await auth();
  const user = session?.user;
  if (!user) return;

  const a = await db.attachment.findUnique({
    where: { id },
    include: { order: { select: { partnerId: true } }, delivery: { select: { partnerId: true, status: true, orderId: true } } },
  });
  if (!a || !canDelete(user, a)) return;

  await db.attachment.delete({ where: { id } });
  await deleteObject(a.storageKey).catch(() => {});

  const orderId = a.orderId ?? a.delivery?.orderId;
  revalidateTargets(orderId ?? null, a.deliveryId ?? undefined);
  if (a.noticeId) revalidatePath("/admin/notices");
}
