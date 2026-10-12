"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[13px] shadow-sm transition-all active:scale-95 cursor-pointer"
    >
      <Printer size={15} />
      <span>طباعة الآن / حفظ PDF</span>
    </button>
  );
}
