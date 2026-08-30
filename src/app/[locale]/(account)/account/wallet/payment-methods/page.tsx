import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CreditCard } from "lucide-react";
import { getPaymentMethods } from "@/lib/api/endpoints/wallet";
import { AccountSidebar } from "@/components/layout/account-sidebar";
import { WalletNav } from "@/features/wallet/components/wallet-nav";
import { WalletError } from "@/features/wallet/components/wallet-error";
import { paymentMethodLabel } from "@/features/wallet/labels";
import {
  addPaymentMethodAction,
  removePaymentMethodAction,
  setDefaultPaymentMethodAction,
} from "@/features/wallet/actions";

/**
 * Payment methods — Figma `651:10636`.
 *
 * Card number and CVV are transient: the API accepts them, stores only the
 * brand and last four, and never returns them. The form posts them straight to
 * a Server Action, so they are never written to the URL or into client state.
 *
 * The design shows Mada, Visa and STC Pay rows. The API's type enum is wider —
 * `card, mada, stc_pay, apple_pay, tabby, tamara, paytabs` — but the wallet
 * types beyond STC Pay have no credential to collect beyond a phone number, and
 * Apple Pay needs a native sheet we can't drive from a form. So the form offers
 * the three the design shows and the API can actually complete.
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function PaymentMethodsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Wallet");
  const query = await searchParams;
  const error = typeof query.error === "string" ? query.error : null;

  const methods = await getPaymentMethods();

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-8 lg:flex-row lg:px-20">
      <AccountSidebar active="wallet" />

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-h1">{t("methodsTitle")}</h1>
          <p className="text-body text-ink-secondary">{t("methodsSubtitle")}</p>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <WalletNav active="paymentMethods" />

          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <WalletError code={error} />

            <section className="border-line bg-base overflow-hidden rounded-16 border">
              {methods.length === 0 ? (
                <div className="p-10 text-center">
                  <CreditCard
                    className="text-ink-tertiary mx-auto size-8"
                    aria-hidden
                  />
                  <p className="text-body text-ink-tertiary mt-3">
                    {t("noMethodsBody")}
                  </p>
                </div>
              ) : (
                <ul className="divide-line divide-y">
                  {methods.map((method) => (
                    <li
                      key={method.id}
                      className="flex flex-wrap items-center gap-3 px-4 py-4"
                    >
                      <span
                        className="bg-tint text-ink-secondary flex h-8 w-11 shrink-0 items-center justify-center rounded-[6px]"
                        aria-hidden
                      >
                        <CreditCard className="size-4" />
                      </span>

                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-label" dir="ltr">
                          {paymentMethodLabel(method)}
                        </span>
                        {method.expiryMonth && method.expiryYear && (
                          <span className="text-caption text-ink-tertiary" dir="ltr">
                            {t("expires", {
                              date: `${String(method.expiryMonth).padStart(2, "0")}/${String(method.expiryYear).slice(-2)}`,
                            })}
                          </span>
                        )}
                      </span>

                      {method.isDefault ? (
                        <span className="bg-action-tint text-action text-caption rounded-[11px] px-2.5 py-1 font-semibold">
                          {t("default")}
                        </span>
                      ) : (
                        <form action={setDefaultPaymentMethodAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="id" value={method.id} />
                          <button
                            type="submit"
                            className="text-caption text-action"
                          >
                            {t("makeDefault")}
                          </button>
                        </form>
                      )}

                      <form action={removePaymentMethodAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="id" value={method.id} />
                        <button
                          type="submit"
                          className="text-caption text-ink-tertiary hover:text-ink"
                        >
                          {t("remove")}
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Add form — a plain POST, so it works without JavaScript. */}
            <form
              action={addPaymentMethodAction}
              className="border-line bg-base flex flex-col gap-4 rounded-16 border p-6"
            >
              <input type="hidden" name="locale" value={locale} />
              <h2 className="text-label">{t("addPaymentMethod")}</h2>

              <div className="flex flex-col gap-2">
                <label htmlFor="type" className="text-caption text-ink-secondary">
                  {t("methodType")}
                </label>
                <select
                  id="type"
                  name="type"
                  defaultValue="card"
                  className="border-line bg-fill-50 text-body focus:border-focus h-11 rounded-10 border px-3 outline-none"
                >
                  <option value="card">{t("types.card")}</option>
                  <option value="mada">{t("types.mada")}</option>
                  <option value="stc_pay">{t("types.stc_pay")}</option>
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="cardNumber"
                    className="text-caption text-ink-secondary"
                  >
                    {t("cardNumber")}
                  </label>
                  <input
                    id="cardNumber"
                    name="cardNumber"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    dir="ltr"
                    placeholder="4111 1111 1111 1111"
                    className="border-line bg-fill-50 text-body focus:border-focus h-11 rounded-10 border px-3 outline-none"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="cardholderName"
                    className="text-caption text-ink-secondary"
                  >
                    {t("cardholderName")}
                  </label>
                  <input
                    id="cardholderName"
                    name="cardholderName"
                    autoComplete="cc-name"
                    className="border-line bg-fill-50 text-body focus:border-focus h-11 rounded-10 border px-3 outline-none"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="expiry" className="text-caption text-ink-secondary">
                    {t("expiry")}
                  </label>
                  <input
                    id="expiry"
                    name="expiry"
                    autoComplete="cc-exp"
                    dir="ltr"
                    placeholder="12/28"
                    className="border-line bg-fill-50 text-body focus:border-focus h-11 rounded-10 border px-3 outline-none"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="cvv" className="text-caption text-ink-secondary">
                    {t("cvv")}
                  </label>
                  <input
                    id="cvv"
                    name="cvv"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    dir="ltr"
                    maxLength={4}
                    className="border-line bg-fill-50 text-body focus:border-focus h-11 rounded-10 border px-3 outline-none"
                  />
                </div>

                <div className="flex flex-col gap-2 sm:col-span-2">
                  <label
                    htmlFor="walletPhone"
                    className="text-caption text-ink-secondary"
                  >
                    {t("walletPhone")}
                  </label>
                  <input
                    id="walletPhone"
                    name="walletPhone"
                    type="tel"
                    dir="ltr"
                    placeholder="+9665XXXXXXXX"
                    className="border-line bg-fill-50 text-body focus:border-focus h-11 rounded-10 border px-3 outline-none"
                  />
                  <p className="text-caption text-ink-tertiary">
                    {t("walletPhoneHint")}
                  </p>
                </div>
              </div>

              <button
                type="submit"
                className="border-ink text-label h-11 w-fit rounded-[22px] border px-5 font-semibold"
              >
                {t("save")}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
