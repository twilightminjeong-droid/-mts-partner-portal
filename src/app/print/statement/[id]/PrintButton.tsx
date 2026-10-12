"use client";

export function PrintButton() {
  return (
    <button onClick={() => window.print()}
      className="px-4 py-2 rounded-lg bg-[#1B2E57] text-white text-sm font-semibold hover:opacity-90">
      인쇄
    </button>
  );
}
