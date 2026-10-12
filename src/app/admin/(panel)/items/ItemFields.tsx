import { inputCls, labelCls } from "@/components/ui/kit";

type ItemValues = {
  code?: string; name?: string; spec?: string | null; unit?: string; kind?: string; model?: string | null;
  unitPrice?: number; sagubType?: string | null; partnerId?: string | null; stdPack?: number | null;
};

/** 품목 등록·수정 폼 공통 입력칸 */
export function ItemFields({ v = {}, partners }: { v?: ItemValues; partners: { id: string; name: string }[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div>
        <label htmlFor="kind" className={labelCls}>구분</label>
        <select id="kind" name="kind" defaultValue={v.kind ?? "ASSY"} className={inputCls}>
          <option value="ASSY">ASSY (도번·납품품)</option>
          <option value="PART">PART (자도번·자재)</option>
        </select>
      </div>
      <div>
        <label htmlFor="code" className={labelCls}>P/No</label>
        <input id="code" name="code" required defaultValue={v.code} placeholder="MJU66478801" className={`${inputCls} font-mono uppercase`} />
      </div>
      <div className="col-span-2">
        <label htmlFor="name" className={labelCls}>품명</label>
        <input id="name" name="name" required defaultValue={v.name} className={inputCls} />
      </div>
      <div>
        <label htmlFor="spec" className={labelCls}>규격</label>
        <input id="spec" name="spec" defaultValue={v.spec ?? ""} className={inputCls} />
      </div>
      <div>
        <label htmlFor="model" className={labelCls}>모델</label>
        <input id="model" name="model" defaultValue={v.model ?? ""} className={inputCls} />
      </div>
      <div>
        <label htmlFor="unit" className={labelCls}>단위</label>
        <select id="unit" name="unit" defaultValue={v.unit ?? "EA"} className={inputCls}>
          {["EA", "SET", "KG", "M", "BOX"].map(u => <option key={u}>{u}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="unitPrice" className={labelCls}>단가 (원)</label>
        <input id="unitPrice" name="unitPrice" type="number" min={0} defaultValue={v.unitPrice ?? 0} className={inputCls} />
      </div>
      <div>
        <label htmlFor="partnerId" className={labelCls}>담당 협력사 (ASSY)</label>
        <select id="partnerId" name="partnerId" defaultValue={v.partnerId ?? ""} className={inputCls}>
          <option value="">—</option>
          {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="stdPack" className={labelCls}>표준포장수</label>
        <input id="stdPack" name="stdPack" type="number" min={1} defaultValue={v.stdPack ?? ""} className={inputCls} />
      </div>
      <div>
        <label htmlFor="sagubType" className={labelCls}>사급 (PART)</label>
        <select id="sagubType" name="sagubType" defaultValue={v.sagubType ?? ""} className={inputCls}>
          <option value="">자체조달</option><option value="무상">무상사급</option><option value="유상">유상사급</option>
        </select>
      </div>
      <p className="col-span-2 self-end text-[11px] text-slate-400 pb-2">단가: ASSY는 협력사 납품(매입) 단가, 유상사급 PART는 협력사에 파는 단가입니다.</p>
    </div>
  );
}

export const ITEM_ERRORS: Record<string, string> = {
  code: "P/No는 영문 대문자·숫자·-·_·. 2~40자로 입력해 주세요.",
  name: "품명을 입력해 주세요.",
  price: "단가는 0 이상의 정수로 입력해 주세요.",
  pack: "표준포장수는 1 이상의 정수로 입력해 주세요.",
  duplicate: "이미 등록된 P/No입니다.",
  bomparent: "BOM은 ASSY 품목에만 넣을 수 있습니다.",
  bomchild: "자도번은 등록된 PART 품목의 P/No여야 합니다.",
  bomqty: "사용수량은 0보다 커야 합니다.",
};
