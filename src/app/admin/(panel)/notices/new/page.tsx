import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { Breadcrumb, FormError, PageHeader, btnPrimary, btnSecondary, inputCls, labelCls } from "@/components/ui/kit";
import { createNotice } from "@/app/admin/actions";
import { FileField } from "@/components/attachments/FileField";
import { fileErrorFromQuery } from "@/lib/attachment-kinds";

export default async function NewNoticePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const admin = await requireAdmin();
  const { error } = await searchParams;

  return (
    <div className="p-7 max-w-2xl">
      <Breadcrumb href="/admin/notices" label="공지사항" current="공지 작성" />
      <PageHeader title="공지 작성" sub={`작성자는 '${admin.grade}'으로 표시됩니다`} />
      <FormError message={error === "empty" ? "제목과 내용을 모두 입력해 주세요." : fileErrorFromQuery(error)} />

      <form action={createNotice} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label htmlFor="category" className={labelCls}>분류</label>
            <select id="category" name="category" className={inputCls} defaultValue="일반">
              <option>중요</option><option>공지</option><option>일반</option>
            </select>
          </div>
          <div className="col-span-3">
            <label htmlFor="title" className={labelCls}>제목</label>
            <input id="title" name="title" required className={inputCls} />
          </div>
        </div>
        <div>
          <label htmlFor="content" className={labelCls}>내용</label>
          <textarea id="content" name="content" rows={10} required className={inputCls} />
        </div>
        <FileField name="noticeFiles" label="첨부파일" hint="양식·안내문 등, 여러 개 선택 가능" />
        <div className="flex gap-3">
          <Link href="/admin/notices" className={`${btnSecondary} flex-1`}>취소</Link>
          <button type="submit" className={`${btnPrimary} flex-[2]`}>공지 등록</button>
        </div>
      </form>
    </div>
  );
}
