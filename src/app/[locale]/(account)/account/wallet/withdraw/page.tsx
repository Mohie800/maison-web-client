import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clock, Landmark, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getWallet, getBankAccounts } from "@/lib/api/endpoints/wallet";
import { formatPrice } from "@/lib/format/money";
import { WITHDRAW_MIN } from "@/lib/api/schemas/wallet";
import { AccountSidebar } from "@/components/layout/account-sidebar";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { WalletNav } from "@/features/wallet/components/wallet-nav";
import { BalanceCard } from "@/features/wallet/components/balance-card";
import { WalletError } from "@/features/wallet/components/wallet-error";
import { bankIbanLabel } from "@/features/wallet/labels";
import { withdrawAction } from "@/features/wallet/actions";

/**
 * Withdraw Funds — Figma `651:10385`.
 *
 * The design promises "Estimated arrival: 1-2 business days". The API returns a
 * real `estimatedArrival` on the response — about three days out — but only
 * *after* the withdrawal is submitted, so there is nothing to show beforehand.
 * The copy here says 1–3 business days, which matches both the API's behaviour
 * and the banks screen's own footnote, rather than repeating a promise the
 * backend doesn't make.
 *
 * "Withdraw Max" (`651:10434`) is a link to `?amount=`, like the Add Funds
 * chips, so it works without JavaScript and drives the summary on the way back.
 *
 * The maximum is the available balance; the server rejects anything above it
 * with "Insufficient balance", which surfaces as a translated error.
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function WithdrawPage({
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

  const [wallet, banks] = await Promise.all([getWallet(), getBankAccounts()]);

  const currency = wallet.currency ?? "SAR";
  const defaultBank = banks.find((b) => b.isDefault) ?? banks[0];
  const canWithdraw = wallet.balance >= WITHDRAW_MIN;

  const typed = Number(typeof query.amount === "string" ? query.amount : "");
  const amount =
    Number.isFinite(typed) && typed >= WITHDRAW_MIN && typed <= wallet.balance
      ? typed
      : null;

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col px-4 pt-8 pb-16 lg:px-20">
      <h1 className="text-ink-900 pb-6 text-[28px] font-bold">
        {t("accountTitle")}
      </h1>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <AccountSidebar active="wallet" />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {/* R — 651:10411 */}
          <Breadcrumbs
            items={[
              { label: t("walletCrumb"), href: "/account/wallet" },
              { label: t("withdrawTitle") },
            ]}
          />

          {/* C — 651:10415 */}
          <div className="flex flex-col gap-1">
            <h2 className="text-ink-900 text-[24px] font-bold">
              {t("withdrawTitle")}
            </h2>
            <p className="text-ink-500 text-[13px]">{t("withdrawSubtitle")}</p>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <WalletNav active="withdraw" />

            <div className="flex min-w-0 flex-1 flex-col gap-6">
              <BalanceCard wallet={wallet} compact />
              <WalletError code={error} />

              {banks.length === 0 ? (
                <section className="border-line-200 bg-base rounded-[14px] border p-8 text-center">
                  <Landmark className="text-ink-400 mx-auto size-8" aria-hidden />
                  <p className="text-ink-900 mt-3 text-[15px] font-semibold">
                    {t("noBanksTitle")}
                  </p>
                  <p className="text-ink-500 mt-1 text-[13px]">
                    {t("noBanksBody")}
                  </p>
                  <Link
                    href="/account/wallet/banks"
                    className="bg-aqua text-on-accent mt-5 inline-flex h-11 items-center gap-2 rounded-[22px] px-5 text-[13px] font-bold"
                  >
                    <Plus className="size-4" aria-hidden />
                    {t("addBank")}
                  </Link>
                </section>
              ) : !canWithdraw ? (
                /* Below the server's minimum, the form could only ever 400. */
                <section className="border-line-200 bg-base rounded-[14px] border p-8 text-center">
                  <p className="text-ink-900 text-[15px] font-semibold">
                    {t("belowMinimumTitle")}
                  </p>
                  <p className="text-ink-500 mt-1 text-[13px]">
                    {t("belowMinimumBody", {
                      min: formatPrice(WITHDRAW_MIN, currency),
                    })}
                  </p>
                </section>
              ) : (
                <form
                  action={withdrawAction}
                  className="flex flex-col gap-6 lg:flex-row lg:items-start"
                >
                  <input type="hidden" name="locale" value={locale} />

                  {/* FormCard2 — 651:10424 */}
                  <fieldset className="border-line-200 bg-base flex min-w-0 flex-1 flex-col gap-5 rounded-[14px] border p-6">
                    <legend className="sr-only">{t("withdrawTitle")}</legend>

                    <p className="text-ink-900 text-[15px] font-semibold">
                      {t("withdrawAmount")}
                    </p>

                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="amount"
                        className="text-ink-700 text-[12px] font-medium"
                      >
                        {t("amount")}
                      </label>
                      {/* AmtField2 — 651:10428 */}
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
                          min={WITHDRAW_MIN}
                          max={wallet.balance}
                          step="1"
                          inputMode="numeric"
                          dir="ltr"
                          defaultValue={amount ?? ""}
                          placeholder={String(WITHDRAW_MIN)}
                          className="text-ink-900 h-full min-w-0 flex-1 bg-transparent text-[22px] font-bold outline-none"
                        />
                      </div>

                      {/* R — 651:10432 */}
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <p className="text-ink-400 text-[11px]">
                          {t("minimumNote", {
                            min: formatPrice(WITHDRAW_MIN, currency),
                          })}
                        </p>
                        <Link
                          href={`/account/wallet/withdraw?amount=${wallet.balance}`}
                          className="bg-action-tint text-action flex h-6 items-center rounded-12 px-2.5 text-[10px] font-bold"
                        >
                          {t("withdrawMax", {
                            max: formatPrice(wallet.balance, currency),
                          })}
                        </Link>
                      </div>
                    </div>

                    <span className="bg-line-200 h-px w-full" aria-hidden />

                    <p className="text-ink-900 text-[15px] font-semibold">
                      {t("withdrawTo")}
                    </p>

                    <ul className="flex flex-col gap-3">
                      {banks.map((bank) => (
                        <li key={bank.id}>
                          {/* BankCard — 651:10438 */}
                          <label className="border-line-200 has-checked:border-action has-checked:bg-action-tint flex cursor-pointer items-center gap-3 rounded-12 border p-3.5">
                            <span
                              className="bg-base text-ink-500 flex size-10 shrink-0 items-center justify-center rounded-[20px]"
                              aria-hidden
                            >
                              <Landmark className="size-5" />
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                              <span
                                className="text-ink-900 truncate text-[14px] font-semibold"
                                dir="auto"
                              >
                                {bank.bankName}
                              </span>
                              <span
                                className="text-ink-500 truncate text-[11px]"
                                dir="ltr"
                              >
                                {bankIbanLabel(bank)}
                              </span>
                            </span>
                            {bank.isDefault && (
                              <span className="bg-action text-base flex h-[22px] shrink-0 items-center rounded-[11px] px-2 text-[8px] font-bold uppercase">
                                {t("default")}
                              </span>
                            )}
                            <input
                              type="radio"
                              name="bankAccountId"
                              value={bank.id}
                              defaultChecked={bank.id === defaultBank?.id}
                              required
                              className="accent-action size-5 shrink-0"
                            />
                          </label>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href="/account/wallet/banks"
                      className="text-action inline-flex items-center gap-2 text-[13px] font-medium"
                    >
                      <Plus className="size-3.5" aria-hidden />
                      {t("addBank")}
                    </Link>

                    <span className="bg-line-200 h-px w-full" aria-hidden />

                    <p className="text-ink-400 text-[12px]">
                      {t("estimatedArrival")}
                    </p>
                  </fieldset>

                  {/* SumCard2 — 651:10450 */}
                  <aside className="border-line-200 bg-base flex w-full shrink-0 flex-col gap-3.5 rounded-[14px] border p-5 lg:w-[400px]">
                    <h2 className="text-ink-900 text-[16px] font-semibold">
                      {t("summary")}
                    </h2>
                    <span className="bg-line-200 h-px w-full" aria-hidden />
                    <dl className="flex flex-col gap-3.5 text-[13px]">
                      <div className="flex justify-between">
                        <dt className="text-ink-500">{t("withdrawAmountRow")}</dt>
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
                      <div className="flex justify-between">
                        <dt className="text-ink-500">{t("remainingBalance")}</dt>
                        <dd className="text-ink-900 font-bold" dir="ltr">
                          {formatPrice(wallet.balance - (amount ?? 0), currency)}
                        </dd>
                      </div>
                    </dl>
                    <span className="bg-line-200 h-px w-full" aria-hidden />
                    <button
                      type="submit"
                      className="bg-action text-base flex h-13 items-center justify-center rounded-[26px] text-[14px] font-bold"
                    >
                      {amount
                        ? t("withdrawSubmitAmount", {
                            amount: formatPrice(amount, currency),
                          })
                        : t("withdrawSubmit")}
                    </button>
                    <p className="text-ink-400 flex items-center justify-center gap-1.5 text-[11px]">
                      <Clock className="text-ink-500 size-3" aria-hidden />
                      {t("arrivalNote")}
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
