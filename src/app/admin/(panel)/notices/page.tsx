import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { Badge } from "@/components/ui/Badge";
import { EmptyRow, PageHeader, Panel, Td, Th, btnPrimary, btnSmDanger } from "@/components/ui/kit";
import { NOTICE_CATEGORY_COLOR, formatDate } from "@/lib/utils";
import { deleteNotice } from "@/app/admin/actions";

export default async function AdminNoticesPage() {
  await requireAdmin();
  const notices = await db.notice.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { attachments: true } } },
  });

  return (
    <div className="p-7">
      <PageHeader title="공지사항" sub="등록한 공지는 모든 협력사 포털에 바로 표시됩니다"
        action={<Link href="/admin/notices/new" className={btnPrimary}>+ 공지 작성</Link>} />
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr><Th>분류</Th><Th>제목</Th><Th>작성</Th><Th>등록일</Th><Th right>조회</Th><Th></Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {notices.length === 0 ? <EmptyRow cols={6} text="등록된 공지가 없습니다" /> : notices.map(n => (
                <tr key={n.id} className="hover:bg-slate-50">
                  <Td><Badge label={n.category} color={NOTICE_CATEGORY_COLOR[n.category] ?? "gray"} /></Td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {n.title}
                    {n._count.attachments > 0 && <span className="ml-1.5 text-[11px] font-normal text-slate-400">· 첨부 {n._count.attachments}</span>}
                  </td>
                  <Td muted>{n.author}</Td>
                  <Td muted>{formatDate(n.createdAt)}</Td>
                  <Td right muted>{n.views}</Td>
                  <Td right>
                    <form action={deleteNotice.bind(null, n.id)}>
                      <button className={btnSmDanger}>삭제</button>
                    </form>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
