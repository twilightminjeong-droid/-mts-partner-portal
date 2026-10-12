import { auth } from "@/auth";
import { db } from "@/lib/db";
import { canDownload } from "@/lib/attachments";
import { getObject } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new Response("로그인이 필요합니다.", { status: 401 });

  const { id } = await params;
  const a = await db.attachment.findUnique({
    where: { id },
    include: { order: { select: { partnerId: true } }, delivery: { select: { partnerId: true, status: true } } },
  });
  // 권한이 없는 파일도 존재 여부를 드러내지 않도록 404로 응답
  if (!a || !canDownload(session.user, a)) return new Response("파일을 찾을 수 없습니다.", { status: 404 });

  const data = await getObject(a.storageKey).catch(() => null);
  if (!data) return new Response("파일을 찾을 수 없습니다.", { status: 404 });

  const ascii = a.fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": a.mimeType,
      "Content-Length": String(data.length),
      "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(a.fileName)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
