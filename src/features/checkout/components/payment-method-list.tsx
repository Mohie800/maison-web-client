import { getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { setDefaultPaymentMethod } from "../actions";
import { paymentMethodLabel } from "@/features/wallet/labels";
import type { PaymentMethod } from "@/lib/api/schemas/checkout";

/**
 * Saved payment methods — Figma `651:7740`.
 *
 * The design's row shows brand, last four, cardholder and expiry; all four are
 * on `GET /payment-methods` and were previously unused. Choosing a row is
 * `PATCH /payment-methods/{id}/default`, which is also what the design's
 * "Change" button does.
 *
 * Deleting a card is deliberately not offered here — it lives on the wallet's
 * payment-methods screen. A destructive control inside checkout is a misclick
 * away from losing the method you were about to pay with.
 */
export async function PaymentMethodList({
  methods,
  selectedId,
  addCardHref,
}: {
  methods: PaymentMethod[];
  selectedId?: string;
  addCardHref: string;
}) {
  const t = await getTranslations("Checkout");

  return (
    <>
      {methods.length === 0 ? (
        <p className="text-body text-ink-secondary mb-3">
          {t("noPaymentMethods")}
        </p>
      ) : (
        <ul className="mb-3 flex flex-col gap-3">
          {methods.map((method) => {
            const active = method.id === selectedId;
            const expiry =
              method.expiryMonth && method.expiryYear
                ? `${String(method.expiryMonth).padStart(2, "0")}/${String(
                    method.expiryYear,
                  ).slice(-2)}`
                : null;
            const sub = [method.cardholderName?.toUpperCase(), expiry]
              .filter(Boolean)
              .join(" · ");

            return (
              <li key={method.id}>
                <form action={setDefaultPaymentMethod}>
                  <input type="hidden" name="id" value={method.id} />
                  <button
                    type="submit"
                    aria-pressed={active}
                    className={`flex w-full items-center gap-3 rounded-12 border p-4 text-start ${
                      active ? "border-action bg-action-tint" : "border-line"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`flex size-4 shrink-0 items-center justify-center rounded-full ${
                        active ? "bg-action" : "bg-tint"
                      }`}
                    >
                      {active && <span className="size-1.5 rounded-full bg-white" />}
                    </span>

                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex flex-wrap items-center gap-2">
                        {method.isDefault && (
                          <span className="bg-action rounded-[4px] px-1.5 py-0.5 text-[10px] font-bold tracking-[0.06em] text-white uppercase">
                            {t("defaultAddress")}
                          </span>
                        )}
                        {/* "Visa •••• 4242" — direction-locked, see wallet/labels. */}
                        <span className="text-label" dir="ltr">
                          {paymentMethodLabel(method)}
                        </span>
                      </span>
                      {sub && (
                        <span className="text-caption text-ink-tertiary" dir="ltr">
                          {sub}
                        </span>
                      )}
                    </span>

                    <span className="border-line text-caption bg-base flex h-8 shrink-0 items-center rounded-8 border px-3">
                      {active ? t("selected") : t("change")}
                    </span>
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href={addCardHref}
        className="border-line text-label text-action inline-flex h-10 items-center gap-2 rounded-8 border px-4"
      >
        <Plus className="size-4" aria-hidden />
        {t("addNewCard")}
      </Link>
    </>
  );
}
