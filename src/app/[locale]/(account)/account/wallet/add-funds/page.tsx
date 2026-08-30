import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CreditCard, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getWallet, getPaymentMethods } from "@/lib/api/endpoints/wallet";
import { formatPrice } from "@/lib/format/money";
import { TOPUP_MAX, TOPUP_MIN } from "@/lib/api/schemas/wallet";
import { AccountSidebar } from "@/components/layout/account-sidebar";
import { WalletNav } from "@/features/wallet/components/wallet-nav";
import { BalanceCard } from "@/features/wallet/components/balance-card";
import { WalletError } from "@/features/wallet/components/wallet-error";
import { paymentMethodLabel } from "@/features/wallet/labels";
import { topUpAction } from "@/features/wallet/actions";

/**
 * Add Funds — Figma `651:10285`.
 *
 * The design's summary card totals "Add amount / Processing fee / New balance".
 * The fee is genuinely zero — `POST /wallet/topup` charges the amount and
 * nothing else — so the row is shown as SAR 0 rather than dropped, since the
 * design uses it to promise there is no fee.
 *
 * New balance is deliberately **not** computed here. Money is never summed
 * client-side in this codebase; the row shows the amount being added and the
 * balance updates from the server's own `newBalance` after the redirect.
 *
 * A top-up requires a saved payment method — the endpoint takes a
 * `paymentMethodId`, not card details — so with none saved this page routes to
 * the payment-methods screen instead of showing an unusable form.
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function AddFundsPage({
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

  const [wallet, methods] = await Promise.all([
    getWallet(),
    getPaymentMethods(),
  ]);

  const currency = wallet.currency ?? "SAR";
  const defaultMethod = methods.find((m) => m.isDefault) ?? methods[0];

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-8 lg:flex-row lg:px-20">
      <AccountSidebar active="wallet" />

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-h1">{t("addFundsTitle")}</h1>
          <p className="text-body text-ink-secondary">{t("addFundsSubtitle")}</p>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <WalletNav active="addFunds" />

          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <BalanceCard wallet={wallet} />
            <WalletError code={error} />

            {methods.length === 0 ? (
              <section className="border-line bg-base rounded-16 border p-8 text-center">
                <CreditCard
                  className="text-ink-tertiary mx-auto size-8"
                  aria-hidden
                />
                <p className="text-label mt-3">{t("noMethodsTitle")}</p>
                <p className="text-body text-ink-tertiary mt-1">
                  {t("noMethodsBody")}
                </p>
                <Link
                  href="/account/wallet/payment-methods"
                  className="bg-aqua text-on-accent text-label mt-5 inline-flex h-11 items-center gap-2 rounded-[22px] px-5 font-semibold"
                >
                  <Plus className="size-4" aria-hidden />
                  {t("addPaymentMethod")}
                </Link>
              </section>
            ) : (
              <form
                action={topUpAction}
                className="flex flex-col gap-6 lg:flex-row lg:items-start"
              >
                <input type="hidden" name="locale" value={locale} />

                <fieldset className="border-line bg-base flex min-w-0 flex-1 flex-col gap-5 rounded-16 border p-6">
                  <legend className="sr-only">{t("addFundsTitle")}</legend>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="amount" className="text-label">
                      {t("amount")}
                    </label>
                    <input
                      id="amount"
                      name="amount"
                      type="number"
                      required
                      min={TOPUP_MIN}
                      max={TOPUP_MAX}
                      step="1"
                      inputMode="numeric"
                      dir="ltr"
                      placeholder={String(TOPUP_MIN)}
                      className="border-line bg-fill-50 focus:border-focus h-14 rounded-12 border px-4 text-[20px] font-semibold outline-none"
                    />
                    <p className="text-caption text-ink-tertiary">
                      {t("amountRange", {
                        min: formatPrice(TOPUP_MIN, currency),
                        max: formatPrice(TOPUP_MAX, currency),
                      })}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-label">{t("paymentMethod")}</span>
                    <ul className="flex flex-col gap-2">
                      {methods.map((method) => (
                        <li key={method.id}>
                          <label className="border-line has-checked:border-action has-checked:bg-action-tint flex cursor-pointer items-center gap-3 rounded-12 border p-4">
                            <input
                              type="radio"
                              name="paymentMethodId"
                              value={method.id}
                              defaultChecked={method.id === defaultMethod?.id}
                              required
                              className="accent-action size-4"
                            />
                            <span className="flex min-w-0 flex-col">
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
                          </label>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href="/account/wallet/payment-methods"
                      className="text-caption text-action mt-1 inline-flex items-center gap-1.5"
                    >
                      <Plus className="size-3.5" aria-hidden />
                      {t("addPaymentMethod")}
                    </Link>
                  </div>
                </fieldset>

                <aside className="border-line bg-base flex w-full shrink-0 flex-col gap-4 rounded-16 border p-6 lg:w-[340px]">
                  <h2 className="text-label">{t("summary")}</h2>
                  <dl className="flex flex-col gap-2">
                    <div className="flex justify-between">
                      <dt className="text-caption text-ink-secondary">
                        {t("processingFee")}
                      </dt>
                      <dd className="text-caption" dir="ltr">
                        {formatPrice(0, currency)}
                      </dd>
                    </div>
                  </dl>
                  <button
                    type="submit"
                    className="bg-aqua text-on-accent text-label h-12 rounded-[24px] font-semibold"
                  >
                    {t("addToWallet")}
                  </button>
                  <p className="text-caption text-ink-tertiary text-center">
                    {t("secured")}
                  </p>
                </aside>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
