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
 *
 * The frame draws "+ Add payment method" as a button with no form behind it.
 * The form lives in a `<details>` under that button so it still submits with
 * JavaScript off, which is how every other disclosure in this codebase works.
 *
 * The frame's non-default rows offer only "Remove", which would leave no way to
 * change the default once one is set, so "Make default" sits beside it.
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
    <div className="mx-auto flex max-w-[1440px] flex-col px-4 pt-8 pb-14 lg:px-20">
      <h1 className="text-ink-900 pb-6 text-[28px] font-bold">
        {t("accountTitle")}
      </h1>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <AccountSidebar active="wallet" />

        <div className="flex min-w-0 flex-1 flex-col gap-6 lg:flex-row lg:items-start">
          <WalletNav active="paymentMethods" />

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <WalletError code={error} />

            {/* card — 651:10661 */}
            <section className="border-line bg-base flex flex-col gap-4 rounded-16 border p-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-[16px] font-semibold">
                  {t("methodsTitle")}
                </h2>
                <p className="text-caption text-ink-tertiary">
                  {t("methodsSubtitle")}
                </p>
              </div>

              {methods.length === 0 ? (
                <div className="py-8 text-center">
                  <CreditCard
                    className="text-ink-tertiary mx-auto size-8"
                    aria-hidden
                  />
                  <p className="text-body text-ink-tertiary mt-3">
                    {t("noMethodsBody")}
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col gap-4">
                  {methods.map((method) => (
                    /* pm — 651:10664 */
                    <li
                      key={method.id}
                      className="border-line flex flex-wrap items-center gap-3 rounded-12 border px-3.5 py-3.5"
                    >
                      <span
                        className="bg-tint text-ink-secondary flex h-[30px] w-11 shrink-0 items-center justify-center rounded-[6px]"
                        aria-hidden
                      >
                        <CreditCard className="size-4" />
                      </span>

                      <span className="flex min-w-0 flex-1 flex-col">
                        <span
                          className="truncate text-[14px] font-semibold"
                          dir="ltr"
                        >
                          {paymentMethodLabel(method)}
                        </span>
                        {method.expiryMonth && method.expiryYear && (
                          <span
                            className="text-ink-tertiary truncate text-[12px]"
                            dir="ltr"
                          >
                            {t("expires", {
                              date: `${String(method.expiryMonth).padStart(2, "0")}/${String(method.expiryYear).slice(-2)}`,
                            })}
                          </span>
                        )}
                      </span>

                      {method.isDefault ? (
                        /* badge — 651:10668 */
                        <span className="bg-aqua-tint text-success flex h-[22px] shrink-0 items-center rounded-[6px] px-2.5 text-[10px] font-bold tracking-[0.4px] uppercase">
                          {t("default")}
                        </span>
                      ) : (
                        <form action={setDefaultPaymentMethodAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="id" value={method.id} />
                          <button
                            type="submit"
                            className="text-action text-[12px] font-semibold"
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
                          className="text-error text-[12px] font-semibold"
                        >
                          {t("remove")}
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}

              {/* btn/secondary — 651:10680 */}
              <details className="group">
                <summary className="border-line bg-base flex h-12 cursor-pointer list-none items-center justify-center rounded-12 border text-[14px] font-semibold">
                  + {t("addPaymentMethod")}
                </summary>

                <form
                  action={addPaymentMethodAction}
                  className="mt-4 flex flex-col gap-4"
                >
                  <input type="hidden" name="locale" value={locale} />

                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="type"
                      className="text-caption text-ink-secondary"
                    >
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
                      <label
                        htmlFor="expiry"
                        className="text-caption text-ink-secondary"
                      >
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
                      <label
                        htmlFor="cvv"
                        className="text-caption text-ink-secondary"
                      >
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
                    className="bg-aqua text-on-accent h-11 w-fit rounded-[22px] px-5 text-[13px] font-semibold"
                  >
                    {t("save")}
                  </button>
                </form>
              </details>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
