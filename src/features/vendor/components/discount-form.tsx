"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  DISCOUNT_TYPES,
  type DiscountType,
  type VendorDiscount,
} from "@/lib/api/schemas/vendor";

/**
 * Create / edit a discount — `651:15983`.
 *
 * Client-side so the Preview card updates as you type, which is the whole point
 * of the frame's right column.
 *
 * **A Name field the frame does not draw.** `name` is required by the API — the
 * validator rejects a body without it — and it is what the list row shows as its
 * description line. The frame has Code and Value but no Name, so it is added
 * rather than sending a placeholder (plans/09 C78).
 *
 * **Two toggles the frame does draw are omitted:** "One per Customer" and "New
 * Customers Only" have no fields in the create contract (GAP-105).
 */
const LABEL = "text-ink-700 text-[12px] font-medium";
const FIELD =
  "bg-fill-50 dark:bg-fill-50 border-line-200 text-ink-900 rounded-8 h-11 w-full border ps-3.5 text-[13px]";

export function DiscountForm({
  action,
  locale,
  discount,
}: {
  action: (formData: FormData) => void;
  locale: string;
  /** Present when editing. */
  discount?: VendorDiscount;
}) {
  const t = useTranslations("Vendor.discounts");

  const [type, setType] = useState<DiscountType>(
    (discount?.discountType as DiscountType) ?? "percentage",
  );
  const [code, setCode] = useState(discount?.code ?? "");
  const [value, setValue] = useState(String(discount?.discountValue ?? ""));
  const [minOrder, setMinOrder] = useState(
    discount?.minOrderAmount ? String(discount.minOrderAmount) : "",
  );
  const [limit, setLimit] = useState(
    discount?.usageLimit ? String(discount.usageLimit) : "",
  );

  const headline =
    type === "free_shipping"
      ? t("freeShipping")
      : type === "percentage"
        ? t("percentOff", { value: value || "0" })
        : t("amountOff", { value: value || "0" });

  return (
    <form action={action} className="flex flex-col gap-6 xl:flex-row">
      <input type="hidden" name="locale" value={locale} />
      {discount && <input type="hidden" name="id" value={discount.id} />}
      <input type="hidden" name="discountType" value={type} />

      {/* Form18 — 651:15994 */}
      <div className="bg-base dark:bg-tint border-line-200 flex flex-col gap-[18px] rounded-[14px] border p-6 xl:w-[647px]">
        <h2 className="text-ink-900 text-[15px] font-semibold">
          {t("details")}
        </h2>

        {/* TW18 — 651:15996 */}
        <div className="flex flex-col gap-2">
          <span className={LABEL}>{t("type")}</span>
          <div className="flex gap-2.5">
            {DISCOUNT_TYPES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setType(option)}
                aria-pressed={option === type}
                className={`rounded-10 flex h-10 flex-1 items-center justify-center text-[12px] ${
                  option === type
                    ? "bg-vp-action border-action text-action dark:text-aqua border-[1.5px] font-bold"
                    : "bg-surface border-line-200 text-ink-500 dark:text-ink-450 border"
                }`}
              >
                {t(`types.${option}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 md:flex-row">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className={LABEL}>{t("code")}</span>
            <input
              name="code"
              required
              maxLength={32}
              dir="ltr"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className={FIELD}
            />
          </label>
          {type !== "free_shipping" && (
            <label className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className={LABEL}>
                {type === "percentage" ? t("valuePercent") : t("valueAmount")}
              </span>
              <input
                name="discountValue"
                required
                type="number"
                min={0}
                step="0.01"
                dir="ltr"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className={FIELD}
              />
            </label>
          )}
        </div>

        {/* Not in the frame; the API requires it and the list row shows it. */}
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>{t("name")}</span>
          <input
            name="name"
            required
            maxLength={120}
            dir="auto"
            defaultValue={discount?.name ?? ""}
            placeholder={t("namePlaceholder")}
            className={FIELD}
          />
        </label>

        {/* DR18 — 651:16014 */}
        <div className="flex flex-col gap-4 md:flex-row">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className={LABEL}>{t("startDate")}</span>
            <input
              name="startsAt"
              type="date"
              defaultValue={discount?.startsAt?.slice(0, 10) ?? ""}
              className={FIELD}
            />
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className={LABEL}>{t("endDate")}</span>
            <input
              name="expiresAt"
              type="date"
              defaultValue={discount?.expiresAt?.slice(0, 10) ?? ""}
              className={FIELD}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>{t("minOrder")}</span>
          <input
            name="minOrderAmount"
            type="number"
            min={0}
            step="0.01"
            dir="ltr"
            value={minOrder}
            onChange={(e) => setMinOrder(e.target.value)}
            className={FIELD}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>{t("usageLimit")}</span>
          <input
            name="usageLimit"
            type="number"
            min={0}
            step={1}
            dir="ltr"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            className={FIELD}
          />
        </label>
      </div>

      {/* RC18 — 651:16044 */}
      <div className="flex flex-col gap-4 xl:w-[445px]">
        <div className="bg-base dark:bg-tint border-line-200 flex flex-col gap-3 rounded-[14px] border p-4">
          <h2 className="text-ink-900 text-[13px] font-semibold">
            {t("preview")}
          </h2>
          {/* PD18 — 651:16047 */}
          <div className="bg-vp-action border-action rounded-12 flex h-20 flex-col items-center justify-center gap-1 border">
            <p className="text-action dark:text-aqua text-[28px] font-bold" dir="ltr">
              {headline}
            </p>
            <p className="text-ink-500 dark:text-ink-450 text-[11px]" dir="ltr">
              {t("useCode", { code: code || "—" })}
            </p>
          </div>
          <span className="bg-line-200 h-px w-full" aria-hidden />
          <PreviewRow label={t("previewType")} value={t(`types.${type}`)} />
          {type !== "free_shipping" && (
            <PreviewRow
              label={t("previewValue")}
              value={type === "percentage" ? `${value || 0}%` : `SAR ${value || 0}`}
            />
          )}
          <PreviewRow label={t("code")} value={code || "—"} />
          <PreviewRow
            label={t("previewMinOrder")}
            value={minOrder ? `SAR ${minOrder}` : "—"}
          />
          <PreviewRow
            label={t("previewLimit")}
            value={limit ? t("uses", { count: Number(limit) }) : t("unlimited")}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="bg-action text-base flex h-[33px] items-center justify-center rounded-[24px] px-5 text-[14px] font-bold"
          >
            {t("save")}
          </button>
          <Link
            href="/vendor/discounts"
            className="border-line-200 text-ink-900 flex h-[33px] items-center rounded-[20px] border px-5 text-[13px]"
          >
            {t("cancel")}
          </Link>
        </div>
      </div>
    </form>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between py-1 text-[11px]">
      <span className="text-ink-500 dark:text-ink-450">{label}</span>
      <span className="text-ink-900 font-semibold" dir="auto">
        {value}
      </span>
    </div>
  );
}
