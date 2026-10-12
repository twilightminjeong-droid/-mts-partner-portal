import { ATTACHMENT_KINDS, formatBytes, type AttachmentKind } from "@/lib/attachment-kinds";
import { deleteAttachment } from "@/lib/attachment-actions";
import { formatDate } from "@/lib/utils";

export type AttachmentItem = {
  id: string;
  kind: string;
  fileName: string;
  size: number;
  uploadedBy: string;
  createdAt: Date;
  deletable?: boolean;
};

export function AttachmentList({ items, empty = "첨부된 파일이 없습니다" }: { items: AttachmentItem[]; empty?: string }) {
  if (items.length === 0) return <p className="text-sm text-slate-400 py-2">{empty}</p>;

  return (
    <ul className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
      {items.map(a => (
        <li key={a.id} className="flex items-center gap-3 px-3 py-2.5">
          <FileIcon name={a.fileName} />
          <div className="min-w-0 flex-1">
            <a href={`/api/files/${a.id}`} className="block text-sm font-medium text-slate-900 hover:text-blue-600 truncate" title={a.fileName}>
              {a.fileName}
            </a>
            <div className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
              {ATTACHMENT_KINDS[a.kind as AttachmentKind] ?? a.kind} · {formatBytes(a.size)} · {a.uploadedBy} · {formatDate(a.createdAt)}
            </div>
          </div>
          <a href={`/api/files/${a.id}`} className="text-xs font-medium text-slate-500 hover:text-slate-800 px-2 py-1">받기</a>
          {a.deletable && (
            <form action={deleteAttachment.bind(null, a.id)}>
              <button className="text-xs font-medium text-red-500 hover:text-red-700 px-2 py-1" aria-label={`${a.fileName} 삭제`}>삭제</button>
            </form>
          )}
        </li>
      ))}
    </ul>
  );
}

function FileIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const tone =
    ext === "pdf" ? "bg-red-50 text-red-600" :
    ["xls", "xlsx"].includes(ext) ? "bg-emerald-50 text-emerald-700" :
    ["hwp", "hwpx", "doc", "docx"].includes(ext) ? "bg-blue-50 text-blue-700" :
    ["dwg", "dxf"].includes(ext) ? "bg-amber-50 text-amber-700" :
    "bg-slate-100 text-slate-600";
  return (
    <span className={`w-9 h-9 rounded-md flex items-center justify-center text-[10px] font-bold uppercase flex-shrink-0 ${tone}`}>
      {ext.slice(0, 4) || "file"}
    </span>
  );
}
