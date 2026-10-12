import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { Breadcrumb, FormError, PageHeader, btnPrimary, btnSecondary, inputCls, labelCls } from "@/components/ui/kit";
import { daysFromToday, toDateInput } from "@/lib/utils";
import { createOrder } from "@/app/admin/actions";
import { FileField } from "@/components/attachments/FileField";
import { fileErrorFromQuery } from "@/lib/attachment-kinds";

const ERRORS: Record<string, string> = {
  partner: "사용 중인 협력사를 선택해 주세요.",
  item: "품목코드와 품목명을 입력해 주세요.",
  qty: "수량은 1 이상의 정수로 입력해 주세요.",
  price: "단가는 0 이상의 정수(원)로 입력해 주세요.",
  date: "납기일을 입력해 주세요.",
};

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const { error } = await searchParams;
  const partners = await db.partner.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  const defaultDue = daysFromToday(14);

  return (
    <div className="p-7 max-w-2xl">
      <Breadcrumb href="/admin/orders" label="발주 관리" current="발주 등록" />
      <PageHeader title="발주 등록" sub="등록하면 협력사 포털에 '검토중' 발주로 표시됩니다" />
      <FormError message={error && (ERRORS[error] ?? fileErrorFromQuery(error))} />

      <form action={createOrder} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div>
          <label htmlFor="partnerId" className={labelCls}>협력사</label>
          <select id="partnerId" name="partnerId" required className={inputCls}>
            {partners.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="itemCode" className={labelCls}>품목코드</label>
            <input id="itemCode" name="itemCode" required placeholder="VLV-GTV-100" className={`${inputCls} font-mono`} />
          </div>
          <div className="col-span-2">
            <label htmlFor="itemName" className={labelCls}>품목명</label>
            <input id="itemName" name="itemName" required placeholder="게이트 밸브 DN100" className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label htmlFor="spec" className={labelCls}>규격 (선택)</label>
            <input id="spec" name="spec" placeholder="PN16 플랜지 / SCS13" className={inputCls} />
          </div>
          <div>
            <label htmlFor="unit" className={labelCls}>단위</label>
            <select id="unit" name="unit" className={inputCls} defaultValue="EA">
              <option>EA</option><option>SET</option><option>M</option><option>KG</option><option>BOX</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="quantity" className={labelCls}>수량</label>
            <input id="quantity" name="quantity" type="number" min={1} required className={inputCls} />
          </div>
          <div>
            <label htmlFor="unitPrice" className={labelCls}>단가 (원, VAT 별도)</label>
            <input id="unitPrice" name="unitPrice" type="number" min={0} required className={inputCls} />
          </div>
          <div>
            <label htmlFor="dueDate" className={labelCls}>납기일</label>
            <input id="dueDate" name="dueDate" type="date" required defaultValue={toDateInput(defaultDue)} className={inputCls} />
          </div>
        </div>
        <div>
          <label htmlFor="note" className={labelCls}>요청사항 (선택)</label>
          <input id="note" name="note" placeholder="예) 밀시트 동봉, 오전 입고" className={inputCls} />
        </div>
        <fieldset className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-5">
          <legend className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">첨부 (협력사가 내려받을 수 있습니다)</legend>
          <FileField name="orderDoc" label="발주서" multiple={false} />
          <FileField name="drawing" label="도면·사양서" hint="DWG·PDF 등 여러 개 선택 가능" />
        </fieldset>
        <div className="flex gap-3 pt-2">
          <Link href="/admin/orders" className={`${btnSecondary} flex-1`}>취소</Link>
          <button type="submit" className={`${btnPrimary} flex-[2]`}>발주서 발행</button>
        </div>
      </form>
    </div>
  );
}
