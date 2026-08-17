"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { addPaymentMethod } from "../actions";
import { PAYMENT_TYPES, CARD_PAYMENT_TYPES, type PaymentType } from "@/lib/api/schemas/checkout";

/**
 * Add a payment method — Figma nodes 651:7841 (card) and 651:7932 (STC Pay).
 *
 * The API accepts card, mada, stc_pay, apple_pay, tabby, tamara and paytabs.
 * Only the types whose details we can actually collect in a form are offered
 * here: cards (card/mada) and STC Pay (wallet phone). Apple Pay and the BNPL
 * providers need a provider SDK or a redirect flow, which is a separate piece of
 * work — offering them as a plain form would collect nothing usable.
 *
 * Card number and CVV are transient: the API tokenizes server-side and states
 * they're never stored. They are not logged or persisted client-side either.
 */
const FORM_TYPES: PaymentType[] = ["card", "mada", "stc_pay"];

export function PaymentMethodForm() {
  const t = useTranslations("Checkout");
  const [type, setType] = useState<PaymentType>("card");
  const isCard = CARD_PAYMENT_TYPES.includes(type);

  return (
    <form action={addPaymentMethod} className="flex flex-col gap-4">
      <input type="hidden" name="type" value={type} />

      <div className="bg-tint flex rounded-12 p-1">
        {FORM_TYPES.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setType(option)}
            aria-pressed={type === option}
            className={`text-caption h-10 flex-1 rounded-8 ${
              type === option ? "bg-base text-ink font-semibold" : "text-ink-secondary"
            }`}
          >
            {t(`paymentTypes.${option}`)}
          </button>
        ))}
      </div>

      {isCard ? (
        <>
          <Field
            name="cardNumber"
            label={t("fields.cardNumber")}
            required
            dir="ltr"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="4111 1111 1111 1111"
          />
          <Field
            name="cardholderName"
            label={t("fields.cardholderName")}
            required
            autoComplete="cc-name"
          />
          <div className="grid grid-cols-3 gap-4">
            <Field
              name="expiryMonth"
              label={t("fields.expiryMonth")}
              required
              dir="ltr"
              inputMode="numeric"
              autoComplete="cc-exp-month"
              placeholder="12"
            />
            <Field
              name="expiryYear"
              label={t("fields.expiryYear")}
              required
              dir="ltr"
              inputMode="numeric"
              autoComplete="cc-exp-year"
              placeholder="2028"
            />
            <Field
              name="cvv"
              label={t("fields.cvv")}
              required
              dir="ltr"
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="123"
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
          placeholder="+9665…"
        />
      )}

      <button
        type="submit"
        className="bg-aqua text-on-accent text-label flex h-12 items-center justify-center rounded-[24px] font-semibold"
      >
        {t("savePaymentMethod")}
      </button>

      <p className="text-caption text-ink-tertiary">{t("cardSecurityNote")}</p>
    </form>
  );
}

/** Not exported — the remaining PAYMENT_TYPES need a provider SDK, see above. */
void PAYMENT_TYPES;

function Field({
  name,
  label,
  required,
  type = "text",
  dir,
  placeholder,
  inputMode,
  autoComplete,
}: {
  name: string;
  label: string;
  required?: boolean;
  type?: string;
  dir?: "ltr" | "rtl";
  placeholder?: string;
  inputMode?: "numeric" | "text";
  autoComplete?: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-label">
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
        className="border-line bg-base text-body placeholder:text-ink-tertiary h-12 rounded-12 border px-4 outline-none focus:border-focus"
      />
    </label>
  );
}
