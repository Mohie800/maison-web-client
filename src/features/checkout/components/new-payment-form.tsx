import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/format/money";
import { placeOrder } from "../actions";
import { primaryCta } from "./checkout-shell";
import { Toggle } from "./toggle";
import { CARD_PAYMENT_TYPES, type PaymentType } from "@/lib/api/schemas/checkout";
import type { CheckoutPreview, ShipmentSelection } from "@/lib/api/schemas/checkout";

/**
 * Add New Card — Figma `651:7841`, and the STC Pay panel of `651:7932`.
 *
 * The design's CTA is "Pay SAR 162", not "Save card": adding a method and paying
 * are one action. `CheckoutDto.newPaymentMethod` is built for exactly that, and
 * `NewPaymentMethodDto.saveForFuture` is the design's "Save card for future
 * orders" toggle — so this follows the API rather than working around it.
 *
 * Card number and CVV are transient: the API tokenizes server-side and states
 * they're never stored. They are not logged or persisted client-side either.
 *
 * Not rendered: the design's Billing Country field (no such field on
 * `NewPaymentMethodDto`) and the STC Pay "Send OTP" step (no endpoint). See
 * plans/09 C24.
 */
export async function NewPaymentForm({
  type,
  preview,
  addressId,
  shipments,
  couponCode,
  charityId,
  donationAmount,
  cancelHref,
  breakdown,
}: {
  type: PaymentType;
  preview: CheckoutPreview;
  addressId: string;
  shipments: ShipmentSelection[];
  couponCode?: string;
  charityId?: string;
  donationAmount?: number;
  cancelHref: string;
  /** ORDER BREAKDOWN, rendered above the CTA as the design has it. */
  breakdown?: React.ReactNode;
}) {
  const t = await getTranslations("Checkout");
  const isCard = CARD_PAYMENT_TYPES.includes(type);
  const currency = preview.currency ?? "SAR";

  return (
    <form action={placeOrder} className="flex flex-col gap-4">
      <input type="hidden" name="addressId" value={addressId} />
      <input type="hidden" name="shipments" value={JSON.stringify(shipments)} />
      <input type="hidden" name="newPaymentType" value={type} />
      {couponCode && <input type="hidden" name="couponCode" value={couponCode} />}
      {charityId && donationAmount ? (
        <>
          <input type="hidden" name="charityId" value={charityId} />
          <input
            type="hidden"
            name="donationAmount"
            value={String(donationAmount)}
          />
        </>
      ) : null}

      {isCard ? (
        <>
          <Field
            name="cardNumber"
            label={t("fields.cardNumber")}
            required
            dir="ltr"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="4242 4242 4242 4242"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              name="cardholderName"
              label={t("fields.cardholderName")}
              required
              autoComplete="cc-name"
              placeholder={t("fields.cardholderPlaceholder")}
            />
            <Field
              name="expiry"
              label={t("fields.expiry")}
              required
              dir="ltr"
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM / YY"
              pattern="\s*\d{2}\s*/?\s*\d{2,4}\s*"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              name="cvv"
              label={t("fields.cvv")}
              required
              dir="ltr"
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="•••"
            />
          </div>
        </>
      ) : (
        <Field
          name="walletPhone"
          label={t("fields.walletPhone")}
          required
          type="tel"
          dir="ltr"
          autoComplete="tel"
          placeholder="+966 5X XXX XXXX"
        />
      )}

      <Toggle
        name="saveForFuture"
        title={t("saveForFuture")}
        hint={t("saveForFutureHint")}
        defaultChecked
      />

      {breakdown}

      <button type="submit" className={primaryCta("mt-2")}>
        {t("payAmount", {
          amount: formatPrice(preview.totalAmount, currency),
        })}
      </button>
      <Link
        href={cancelHref}
        className="border-line text-label flex h-12 items-center justify-center rounded-[24px] border"
      >
        {t("cancel")}
      </Link>
    </form>
  );
}

function Field({
  name,
  label,
  required,
  type = "text",
  dir,
  placeholder,
  inputMode,
  autoComplete,
  pattern,
}: {
  name: string;
  label: string;
  required?: boolean;
  type?: string;
  dir?: "ltr" | "rtl";
  placeholder?: string;
  inputMode?: "numeric" | "text";
  autoComplete?: string;
  pattern?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-caption text-ink-secondary">
        {label}
        {required && <span className="text-error ms-1">*</span>}
      </span>
      <input
        name={name}
        type={type}
        dir={dir}
        required={required}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        pattern={pattern}
        className="border-line bg-surface text-body placeholder:text-ink-tertiary focus:border-focus h-11 rounded-8 border px-3 outline-none"
      />
    </label>
  );
}
