import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePartner } from "@/lib/session";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumb } from "@/components/ui/kit";
import { AttachmentList } from "@/components/attachments/AttachmentList";
import { toItems } from "@/lib/attachments";
import { formatDate, NOTICE_CATEGORY_COLOR } from "@/lib/utils";

export default async function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePartner();
  const { id } = await params;

  const notice = await db.notice.update({
    where: { id },
    data: { views: { increment: 1 } },
    include: { attachments: { orderBy: { createdAt: "asc" } } },
  }).catch(() => null);
  if (!notice) notFound();

  return (
    <div className="p-7 max-w-3xl">
      <Breadcrumb href="/notices" label="공지사항" current="상세" />
      <article className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <header className="px-6 py-5 border-b border-slate-100">
          <Badge label={notice.category} color={NOTICE_CATEGORY_COLOR[notice.category] ?? "gray"} />
          <h1 className="text-lg font-bold text-slate-900 mt-2 text-balance">{notice.title}</h1>
          <p className="text-xs text-slate-400 mt-1.5">{notice.author} · {formatDate(notice.createdAt)} · 조회 {notice.views}</p>
        </header>
        <div className="px-6 py-6 text-sm leading-7 text-slate-700 whitespace-pre-wrap max-w-[65ch]">{notice.content}</div>
        {notice.attachments.length > 0 && (
          <footer className="px-6 pb-6">
            <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">첨부파일</h2>
            <AttachmentList items={toItems(notice.attachments, user, { order: null, delivery: null, noticeId: notice.id })} />
          </footer>
        )}
      </article>
    </div>
  );
}
