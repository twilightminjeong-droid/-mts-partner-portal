import { ACCEPT_ATTR, MAX_FILE_MB } from "@/lib/attachment-kinds";

export function FileField({ name, label, hint, required, multiple = true }: {
  name: string; label: string; hint?: string; required?: boolean; multiple?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="text-[13px] font-medium text-slate-600 block mb-1.5">
        {label} {required ? <span className="text-red-500">*</span> : <span className="text-slate-400 font-normal">(선택)</span>}
      </label>
      <input id={name} name={name} type="file" accept={ACCEPT_ATTR} multiple={multiple} required={required}
        className="block w-full text-sm text-slate-600 rounded-lg border border-slate-200 bg-white p-1.5
          file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-slate-100 file:text-slate-700 file:text-xs file:font-semibold hover:file:bg-slate-200" />
      <p className="text-[11px] text-slate-400 mt-1">{hint ?? `파일당 ${MAX_FILE_MB}MB 이하`}</p>
    </div>
  );
}
