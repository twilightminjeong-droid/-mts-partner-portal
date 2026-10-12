"use client";

import { useActionState } from "react";
import { uploadAttachments, type UploadState } from "@/lib/attachment-actions";
import { ACCEPT_ATTR, ATTACHMENT_KINDS, MAX_FILE_MB, MAX_FILES, type AttachmentKind } from "@/lib/attachment-kinds";

export function AttachmentUploader({ target, targetId, kinds }: {
  target: "order" | "delivery";
  targetId: string;
  kinds: AttachmentKind[];
}) {
  const [state, action, pending] = useActionState<UploadState, FormData>(uploadAttachments, { seq: 0 });

  return (
    <form action={action} className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-3">
      <input type="hidden" name="target" value={target} />
      <input type="hidden" name="targetId" value={targetId} />
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`kind-${targetId}`}>첨부 종류</label>
        <select id={`kind-${targetId}`} name="kind" className="px-2.5 py-2 rounded-md border border-slate-200 bg-white text-sm">
          {kinds.map(k => <option key={k} value={k}>{ATTACHMENT_KINDS[k]}</option>)}
        </select>
        <label className="sr-only" htmlFor={`files-${targetId}`}>파일 선택</label>
        {/* 업로드가 끝날 때마다 key를 바꿔 선택한 파일을 비운다 */}
        <input key={state.seq} id={`files-${targetId}`} name="files" type="file" multiple accept={ACCEPT_ATTR}
          className="flex-1 min-w-0 text-sm text-slate-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-white file:text-slate-700 file:text-xs file:font-semibold file:shadow-sm file:ring-1 file:ring-slate-200" />
        <button disabled={pending}
          className="text-xs font-semibold px-3 py-2 rounded-md bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50">
          {pending ? "올리는 중…" : "업로드"}
        </button>
      </div>
      <p className="text-[11px] text-slate-400 mt-2">파일당 {MAX_FILE_MB}MB, 한 번에 {MAX_FILES}개까지 · PDF·이미지·엑셀·워드·한글·DWG·ZIP</p>
      {state.error && <p role="alert" className="text-xs text-red-600 mt-2">{state.error}</p>}
      {state.ok && !pending && <p role="status" className="text-xs text-emerald-700 mt-2">{state.ok}개 파일을 올렸습니다.</p>}
    </form>
  );
}
