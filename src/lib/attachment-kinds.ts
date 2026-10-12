export const ATTACHMENT_KINDS = {
  ORDER_DOC: "발주서",
  DRAWING: "도면·사양서",
  STATEMENT: "거래명세서",
  QC_REPORT: "품질검사성적서",
  MILL_SHEET: "자재성적서(밀시트)",
  INSPECTION: "검수성적서",
  NOTICE: "공지 첨부",
  ETC: "기타",
} as const;

export type AttachmentKind = keyof typeof ATTACHMENT_KINDS;

export const PARTNER_DELIVERY_KINDS: AttachmentKind[] = ["STATEMENT", "QC_REPORT", "MILL_SHEET", "ETC"];
export const ADMIN_ORDER_KINDS: AttachmentKind[] = ["ORDER_DOC", "DRAWING", "ETC"];
export const ADMIN_DELIVERY_KINDS: AttachmentKind[] = ["INSPECTION", "ETC"];

// 확장자 → 다운로드 시 내려줄 Content-Type. 목록에 없는 확장자는 업로드 거부
export const ALLOWED_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  hwp: "application/x-hwp",
  hwpx: "application/hwp+zip",
  dwg: "image/vnd.dwg",
  dxf: "image/vnd.dxf",
  zip: "application/zip",
};

export const ACCEPT_ATTR = Object.keys(ALLOWED_TYPES).map(e => `.${e}`).join(",");
export const MAX_FILE_MB = 20;
export const MAX_FILES = 5;
export const MAX_TOTAL_MB = 50;

export type FileErrorCode = "count" | "kind" | "type" | "size" | "total";

export const FILE_ERROR_TEXT: Record<FileErrorCode, string> = {
  count: `파일은 한 번에 ${MAX_FILES}개까지 올릴 수 있습니다.`,
  kind: "첨부 종류가 올바르지 않습니다.",
  type: "올릴 수 없는 형식의 파일이 있습니다. PDF·이미지·엑셀·워드·한글·도면(DWG/DXF)·ZIP만 가능합니다.",
  size: `파일 하나의 크기는 ${MAX_FILE_MB}MB 이하여야 합니다.`,
  total: `한 번에 올리는 파일 합계는 ${MAX_TOTAL_MB}MB 이하여야 합니다.`,
};

/** 등록 폼이 ?error=file-<code> 로 돌아왔을 때 보여 줄 문장 */
export function fileErrorFromQuery(error?: string) {
  if (!error?.startsWith("file-")) return undefined;
  return FILE_ERROR_TEXT[error.slice(5) as FileErrorCode] ?? FILE_ERROR_TEXT.type;
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
