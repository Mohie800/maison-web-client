import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createDiscountAction } from "@/features/vendor/actions";
import { DiscountForm } from "@/features/vendor/components/discount-form";

/** Create New Discount — `651:15933` light / `651:13350` dark. */
export const metadata: Metadata = { robots: { index: false } };

export default async function NewDiscountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Vendor.discounts");

  return (
    <>
      <h1 className="text-ink-900 text-[24px] leading-[29px] font-bold">
        {t("createTitle")}
      </h1>
      <DiscountForm action={createDiscountAction} locale={locale} />
    </>
  );
}
