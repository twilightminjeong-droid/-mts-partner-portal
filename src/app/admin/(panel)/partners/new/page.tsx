import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { Breadcrumb, FormError, PageHeader, btnPrimary, btnSecondary, inputCls, labelCls } from "@/components/ui/kit";
import { createPartner } from "../../../actions";

const ERRORS: Record<string, string> = {
  code: "아이디는 영문 소문자·숫자·-·_ 3~20자로 입력해 주세요.",
  name: "업체명을 입력해 주세요.",
  password: "초기 비밀번호는 8자 이상이어야 합니다.",
  duplicate: "이미 사용 중인 아이디입니다. 다른 아이디를 입력해 주세요.",
};

export default async function NewPartnerPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const { error } = await searchParams;

  return (
    <div className="p-7 max-w-2xl">
      <Breadcrumb href="/admin/partners" label="협력사 관리" current="협력사 등록" />
      <PageHeader title="협력사 등록" sub="등록한 아이디와 초기 비밀번호를 협력사 담당자에게 전달하세요" />
      <FormError message={error && ERRORS[error]} />

      <form action={createPartner} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="code" className={labelCls}>로그인 아이디</label>
            <input id="code" name="code" required placeholder="예) p2101" className={inputCls} />
          </div>
          <div>
            <label htmlFor="grade" className={labelCls}>협력사 등급</label>
            <select id="grade" name="grade" className={inputCls} defaultValue="1차">
              <option>1차</option><option>2차</option><option>3차</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="name" className={labelCls}>업체명</label>
          <input id="name" name="name" required placeholder="예) 대성정밀 주식회사" className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="phone" className={labelCls}>대표 연락처 (선택)</label>
            <input id="phone" name="phone" placeholder="031-000-0000" className={inputCls} />
          </div>
          <div>
            <label htmlFor="email" className={labelCls}>이메일 (선택)</label>
            <input id="email" name="email" type="email" className={inputCls} />
          </div>
        </div>
        <div>
          <label htmlFor="password" className={labelCls}>초기 비밀번호</label>
          <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
        </div>
        <div className="flex gap-3 pt-2">
          <Link href="/admin/partners" className={`${btnSecondary} flex-1`}>취소</Link>
          <button type="submit" className={`${btnPrimary} flex-[2]`}>협력사 등록</button>
        </div>
      </form>
    </div>
  );
}
