import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import { formatPrice } from "@/lib/format/money";

/**
 * Coupons & Discounts — Figma `651:7932`.
 *
 * A GET form: the code lands in the URL and the page re-previews, so the
 * discount shown is the server's rather than a guess. The applied panel's
 * description comes from `POST /coupons/validate`, which is the only call that
 * returns the coupon's own name.
 */
export async function CouponCard({
  action,
  hiddenFields,
  code,
  discountAmount,
  description,
  currency = "SAR",
}: {
  action: string;
  hiddenFields: Record<string, string>;
  code?: string;
  discountAmount?: string | null;
  description?: string | null;
  currency?: string;
}) {
  const t = await getTranslations("Checkout");
  const applied = Number(discountAmount ?? 0) > 0;
  const rejected = Boolean(code) && !applied;

  return (
    <div className="border-line rounded-12 border p-4">
      <h3 className="text-label mb-3">{t("coupon")}</h3>

      <form action={action} className="flex gap-3">
        {Object.entries(hiddenFields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <input
          name="coupon"
          defaultValue={code}
          placeholder={t("couponPlaceholder")}
          dir="ltr"
          className={`text-body h-11 min-w-0 flex-1 rounded-8 border px-3 outline-none ${
            applied
              ? "border-action bg-base"
              : rejected
                ? "border-error bg-base"
                : "border-line bg-surface focus:border-focus"
          }`}
        />
        <button
          type="submit"
          className={`text-label h-11 shrink-0 rounded-[22px] px-5 font-semibold ${
            applied ? "bg-aqua text-on-accent" : "border-ink border"
          }`}
        >
          {applied ? t("couponAvailable") : t("apply")}
        </button>
      </form>

      {applied && (
        <div className="bg-warn-tint border-warning mt-3 rounded-8 border p-3">
          <p className="text-amber-deep text-label flex items-center gap-2">
            <Check className="size-4" aria-hidden />
            {t("couponAppliedTitle", { code: code ?? "" })}
          </p>
          {description && (
            <p className="text-amber-text text-caption mt-1">{description}</p>
          )}
          <p className="text-action text-caption mt-1 font-semibold">
            {t("couponSaving", {
              amount: formatPrice(discountAmount, currency),
            })}
          </p>
        </div>
      )}

      {rejected && (
        <p className="text-error text-caption mt-2">{t("couponInvalid")}</p>
      )}
    </div>
  );
}
