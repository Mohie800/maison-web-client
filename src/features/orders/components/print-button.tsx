"use client";

import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * The design's "Download PDF" — Figma `651:8446`.
 *
 * There is no PDF endpoint, and the browser's own print dialog saves one. So
 * this prints rather than pretending to download; the label says so.
 */
export function PrintButton() {
  const t = useTranslations("Orders");

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="border-line bg-base text-label flex h-10 shrink-0 items-center gap-2 rounded-[20px] border px-5 print:hidden"
    >
      <Printer className="size-4" aria-hidden />
      {t("printInvoice")}
    </button>
  );
}
