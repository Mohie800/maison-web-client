import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CreditCard, Lock, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getWallet, getPaymentMethods } from "@/lib/api/endpoints/wallet";
import { formatPrice } from "@/lib/format/money";
import { TOPUP_MAX, TOPUP_MIN } from "@/lib/api/schemas/wallet";
import { AccountSidebar } from "@/components/layout/account-sidebar";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
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
 * The quick chips (`651:10332`) are links that set `?amount=`, so picking one
 * works without JavaScript; the same query drives the field's value and the
 * summary. New balance is a preview of `balance + amount` — the authority is
 * still the server's own `newBalance` after the redirect.
 *
 * A top-up requires a saved payment method — the endpoint takes a
 * `paymentMethodId`, not card details — so with none saved this page routes to
 * the payment-methods screen instead of showing an unusable form.
 */
export const metadata: Metadata = { robots: { index: false } };

/** `651:10333`–`651:10342`. */
const QUICK = [50, 100, 250, 500, 1000];

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

  const typed = Number(typeof query.amount === "string" ? query.amount : "");
  const amount =
    Number.isFinite(typed) && typed >= TOPUP_MIN && typed <= TOPUP_MAX
      ? typed
      : null;

  const [wallet, methods] = await Promise.all([
    getWallet(),
    getPaymentMethods(),
  ]);

  const currency = wallet.currency ?? "SAR";
  const defaultMethod = methods.find((m) => m.isDefault) ?? methods[0];

  const field =
    "text-ink-900 h-full min-w-0 flex-1 bg-transparent text-[22px] font-bold outline-none";

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col px-4 pt-8 pb-16 lg:px-20">
      <h1 className="text-ink-900 pb-6 text-[28px] font-bold">
        {t("accountTitle")}
      </h1>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <AccountSidebar active="wallet" />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {/* R — 651:10311 */}
          <Breadcrumbs
            items={[
              { label: t("walletCrumb"), href: "/account/wallet" },
              { label: t("addFundsTitle") },
            ]}
          />

          {/* C — 651:10315 */}
          <div className="flex flex-col gap-1">
            <h2 className="text-ink-900 text-[24px] font-bold">
              {t("addFundsTitle")}
            </h2>
            <p className="text-ink-500 text-[13px]">{t("addFundsSubtitle")}</p>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <WalletNav active="addFunds" />

            <div className="flex min-w-0 flex-1 flex-col gap-6">
              <BalanceCard wallet={wallet} compact />
              <WalletError code={error} />

              {methods.length === 0 ? (
                <section className="border-line-200 bg-base rounded-[14px] border p-8 text-center">
                  <CreditCard
                    className="text-ink-400 mx-auto size-8"
                    aria-hidden
                  />
                  <p className="text-ink-900 mt-3 text-[15px] font-semibold">
                    {t("noMethodsTitle")}
                  </p>
                  <p className="text-ink-500 mt-1 text-[13px]">
                    {t("noMethodsBody")}
                  </p>
                  <Link
                    href="/account/wallet/payment-methods"
                    className="bg-aqua text-on-accent mt-5 inline-flex h-11 items-center gap-2 rounded-[22px] px-5 text-[13px] font-bold"
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

                  {/* FormCard1 — 651:10324 */}
                  <fieldset className="border-line-200 bg-base flex min-w-0 flex-1 flex-col gap-5 rounded-[14px] border p-6">
                    <legend className="sr-only">{t("addFundsTitle")}</legend>

                    <p className="text-ink-900 text-[15px] font-semibold">
                      {t("enterAmount")}
                    </p>

                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="amount"
                        className="text-ink-700 text-[12px] font-medium"
                      >
                        {t("amount")}
                      </label>
                      {/* AmtField — 651:10328 */}
                      <div className="bg-fill-50 border-line-200 focus-within:border-action flex h-14 items-center gap-2.5 rounded-10 border-[1.5px] px-3.5">
                        <span className="text-ink-500 shrink-0 text-[13px] font-bold">
                          {currency}
                        </span>
                        <span
                          className="bg-line-200 h-8 w-px shrink-0"
                          aria-hidden
                        />
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
                          defaultValue={amount ?? ""}
                          placeholder={String(TOPUP_MIN)}
                          className={field}
                        />
                      </div>

                      {/* R — 651:10332 */}
                      <ul className="mt-1 flex flex-wrap gap-2.5">
                        {QUICK.map((value) => {
                          const on = value === amount;
                          return (
                            <li key={value}>
                              <Link
                                href={`/account/wallet/add-funds?amount=${value}`}
                                aria-current={on ? "true" : undefined}
                                className={`flex h-[34px] items-center rounded-[17px] px-3.5 text-[11px] ${
                                  on
                                    ? "bg-action-tint border-action text-action border-[1.5px] font-bold"
                                    : "bg-surface border-line-200 text-ink-500 border"
                                }`}
                                dir="ltr"
                              >
                                {formatPrice(value, currency)}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>

                      <p className="text-ink-400 mt-1 text-[11px]">
                        {t("amountRange", {
                          min: formatPrice(TOPUP_MIN, currency),
                          max: formatPrice(TOPUP_MAX, currency),
                        })}
                      </p>
                    </div>

                    <span className="bg-line-200 h-px w-full" aria-hidden />

                    <p className="text-ink-900 text-[15px] font-semibold">
                      {t("paymentMethod")}
                    </p>

                    <ul className="flex flex-col gap-3">
                      {methods.map((method) => (
                        <li key={method.id}>
                          {/* PMRow — 651:10345 */}
                          <label className="border-line-200 has-checked:border-action has-checked:bg-action-tint flex cursor-pointer items-center gap-3 rounded-10 border p-3.5 has-checked:border-[1.5px]">
                            <span
                              className="bg-fill-100 text-ink-500 flex size-9 shrink-0 items-center justify-center rounded-[18px]"
                              aria-hidden
                            >
                              <CreditCard className="size-4" />
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                              <span
                                className="text-ink-900 truncate text-[13px] font-semibold"
                                dir="ltr"
                              >
                                {paymentMethodLabel(method)}
                              </span>
                              {method.expiryMonth && method.expiryYear && (
                                <span
                                  className="text-ink-500 text-[11px]"
                                  dir="ltr"
                                >
                                  {t("expires", {
                                    date: `${String(method.expiryMonth).padStart(2, "0")}/${String(method.expiryYear).slice(-2)}`,
                                  })}
                                </span>
                              )}
                            </span>
                            <input
                              type="radio"
                              name="paymentMethodId"
                              value={method.id}
                              defaultChecked={method.id === defaultMethod?.id}
                              required
                              className="accent-action size-5 shrink-0"
                            />
                          </label>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href="/account/wallet/payment-methods"
                      className="text-action inline-flex items-center gap-2 text-[13px] font-medium"
                    >
                      <Plus className="size-3.5" aria-hidden />
                      {t("addPaymentMethod")}
                    </Link>
                  </fieldset>

                  {/* SumCard1 — 651:10367 */}
                  <aside className="border-line-200 bg-base flex w-full shrink-0 flex-col gap-3.5 rounded-[14px] border p-5 lg:w-[400px]">
                    <h2 className="text-ink-900 text-[16px] font-semibold">
                      {t("summary")}
                    </h2>
                    <span className="bg-line-200 h-px w-full" aria-hidden />
                    <dl className="flex flex-col gap-3.5 text-[13px]">
                      <div className="flex justify-between">
                        <dt className="text-ink-500">{t("addAmount")}</dt>
                        <dd className="text-ink-900 font-bold" dir="ltr">
                          {formatPrice(amount ?? 0, currency)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-ink-500">{t("processingFee")}</dt>
                        <dd className="text-ink-900 font-bold" dir="ltr">
                          {formatPrice(0, currency)}
                        </dd>
                      </div>
                      <div className="flex justify-between font-bold">
                        <dt className="text-ink-900">{t("newBalance")}</dt>
                        <dd className="text-action" dir="ltr">
                          {formatPrice(wallet.balance + (amount ?? 0), currency)}
                        </dd>
                      </div>
                    </dl>
                    <span className="bg-line-200 h-px w-full" aria-hidden />
                    <button
                      type="submit"
                      className="bg-action text-base flex h-13 items-center justify-center rounded-[26px] text-[14px] font-bold"
                    >
                      {amount
                        ? t("addToWalletAmount", {
                            amount: formatPrice(amount, currency),
                          })
                        : t("addToWallet")}
                    </button>
                    <p className="text-ink-400 flex items-center justify-center gap-1.5 text-[11px]">
                      <Lock className="text-ink-500 size-3" aria-hidden />
                      {t("secured")}
                    </p>
                  </aside>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
