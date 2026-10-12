import "server-only";
import type { Session } from "next-auth";
import { deleteObject, putObject } from "@/lib/storage";
import {
  ALLOWED_TYPES, ATTACHMENT_KINDS, FILE_ERROR_TEXT, MAX_FILE_MB, MAX_FILES, MAX_TOTAL_MB,
  type AttachmentKind, type FileErrorCode,
} from "@/lib/attachment-kinds";

type User = Session["user"];
export type FileEntry = { file: File; kind: AttachmentKind };

export function filesFrom(fd: FormData, field: string): File[] {
  return fd.getAll(field).filter((f): f is File => f instanceof File && f.size > 0 && f.name !== "");
}

function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i < 0 ? "" : name.slice(i + 1).toLowerCase();
}

function cleanName(name: string) {
  const base = name.split(/[\\/]/).pop() ?? "file";
  return base.replace(/[\u0000-\u001f\u007f]/g, "").slice(-200) || "file";
}

/** 문제가 있으면 오류 코드와 화면용 문장을, 없으면 null을 돌려준다 */
export function validateFiles(entries: FileEntry[]): { code: FileErrorCode; message: string } | null {
  const fail = (code: FileErrorCode, file?: File) => ({
    code,
    message: file ? `'${cleanName(file.name)}': ${FILE_ERROR_TEXT[code]}` : FILE_ERROR_TEXT[code],
  });
  if (entries.length > MAX_FILES) return fail("count");
  let total = 0;
  for (const { file, kind } of entries) {
    if (!(kind in ATTACHMENT_KINDS)) return fail("kind");
    if (!ALLOWED_TYPES[extOf(file.name)]) return fail("type", file);
    if (file.size > MAX_FILE_MB * 1024 * 1024) return fail("size", file);
    total += file.size;
  }
  if (total > MAX_TOTAL_MB * 1024 * 1024) return fail("total");
  return null;
}

export type StoredFile = {
  kind: AttachmentKind; fileName: string; mimeType: string; size: number; storageKey: string;
  uploaderRole: string; uploaderId: string; uploadedBy: string;
};

/** 디스크에 먼저 저장한다. 이어지는 DB 저장이 실패하면 discardFiles로 지워야 한다 */
export async function storeFiles(entries: FileEntry[], user: User): Promise<StoredFile[]> {
  const stored: StoredFile[] = [];
  try {
    for (const { file, kind } of entries) {
      const storageKey = await putObject(Buffer.from(await file.arrayBuffer()));
      stored.push({
        kind,
        fileName: cleanName(file.name),
        mimeType: ALLOWED_TYPES[extOf(file.name)],
        size: file.size,
        storageKey,
        uploaderRole: user.role,
        uploaderId: user.id,
        uploadedBy: user.name ?? user.code,
      });
    }
    return stored;
  } catch (e) {
    await discardFiles(stored);
    throw e;
  }
}

export async function discardFiles(stored: { storageKey: string }[]) {
  await Promise.all(stored.map(s => deleteObject(s.storageKey).catch(() => {})));
}

/** 파일 저장 → DB 기록을 한 묶음으로 처리. DB 단계가 실패하면 저장한 파일을 지운다 */
export async function withStoredFiles<T>(entries: FileEntry[], user: User, run: (stored: StoredFile[]) => Promise<T>) {
  const stored = await storeFiles(entries, user);
  try {
    return await run(stored);
  } catch (e) {
    await discardFiles(stored);
    throw e;
  }
}

type AttachmentScope = {
  uploaderRole: string;
  uploaderId: string;
  noticeId: string | null;
  order: { partnerId: string } | null;
  delivery: { partnerId: string; status: string } | null;
};

export function canDownload(user: User, a: AttachmentScope) {
  if (user.role === "admin") return true;
  if (a.noticeId) return true;
  return a.order?.partnerId === user.id || a.delivery?.partnerId === user.id;
}

/** 한 대상(발주·납품·공지)에 달린 첨부를 목록 표시용으로 바꾸고, 지울 수 있는지 표시한다 */
export function toItems(
  list: { id: string; kind: string; fileName: string; size: number; uploadedBy: string; createdAt: Date; uploaderRole: string; uploaderId: string }[],
  user: User,
  scope: Pick<AttachmentScope, "order" | "delivery"> & { noticeId?: string | null },
) {
  return list.map(a => ({
    ...a,
    deletable: canDelete(user, { ...a, noticeId: scope.noticeId ?? null, order: scope.order, delivery: scope.delivery }),
  }));
}

// 협력사 파일은 입고 접수 전까지만 본인이 지울 수 있다(이후엔 검수 증빙). 관리자는 관리자가 올린 파일만 지운다
export function canDelete(user: User, a: AttachmentScope) {
  if (user.role === "admin") return a.uploaderRole === "admin";
  return a.uploaderRole === "partner" && a.uploaderId === user.id && a.delivery?.status === "SUBMITTED";
}
