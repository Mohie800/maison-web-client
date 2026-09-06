import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getVendorDiscounts } from "@/lib/api/endpoints/vendor";
import { updateDiscountAction } from "@/features/vendor/actions";
import { DiscountForm } from "@/features/vendor/components/discount-form";

/**
 * Edit — the same form as create, which is what `651:15933` draws.
 *
 * There is still no `GET /vendor-portal/discounts/{id}`, so the row is found in
 * the list — which since Round 9 returns scheduled discounts too (GAP-104), so
 * every discount is now editable.
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function EditDiscountPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Vendor.discounts");

  const list = await getVendorDiscounts({ limit: 100, tab: "all" }).catch(
    () => null,
  );
  const discount = (list?.items ?? []).find((d) => d.id === id);

  return (
    <>
      <h1 className="text-ink-900 text-[24px] leading-[29px] font-bold">
        {t("editTitle")}
      </h1>
      {discount ? (
        <DiscountForm
          action={updateDiscountAction}
          locale={locale}
          discount={discount}
        />
      ) : (
        <p className="bg-vp-warn text-amber-text rounded-10 px-4 py-3 text-[12px]">
          {t("notFound")}
        </p>
      )}
    </>
  );
}
