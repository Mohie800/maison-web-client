import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Landmark, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getWallet, getBankAccounts } from "@/lib/api/endpoints/wallet";
import { formatPrice } from "@/lib/format/money";
import { WITHDRAW_MIN } from "@/lib/api/schemas/wallet";
import { AccountSidebar } from "@/components/layout/account-sidebar";
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

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-8 lg:flex-row lg:px-20">
      <AccountSidebar active="wallet" />

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-h1">{t("withdrawTitle")}</h1>
          <p className="text-body text-ink-secondary">{t("withdrawSubtitle")}</p>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <WalletNav active="withdraw" />

          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <BalanceCard wallet={wallet} />
            <WalletError code={error} />

            {banks.length === 0 ? (
              <section className="border-line bg-base rounded-16 border p-8 text-center">
                <Landmark className="text-ink-tertiary mx-auto size-8" aria-hidden />
                <p className="text-label mt-3">{t("noBanksTitle")}</p>
                <p className="text-body text-ink-tertiary mt-1">
                  {t("noBanksBody")}
                </p>
                <Link
                  href="/account/wallet/banks"
                  className="bg-aqua text-on-accent text-label mt-5 inline-flex h-11 items-center gap-2 rounded-[22px] px-5 font-semibold"
                >
                  <Plus className="size-4" aria-hidden />
                  {t("addBank")}
                </Link>
              </section>
            ) : !canWithdraw ? (
              /* Below the server's minimum, the form could only ever 400. */
              <section className="border-line bg-base rounded-16 border p-8 text-center">
                <p className="text-label">{t("belowMinimumTitle")}</p>
                <p className="text-body text-ink-tertiary mt-1">
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

                <fieldset className="border-line bg-base flex min-w-0 flex-1 flex-col gap-5 rounded-16 border p-6">
                  <legend className="sr-only">{t("withdrawTitle")}</legend>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="amount" className="text-label">
                      {t("amount")}
                    </label>
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
                      placeholder={String(WITHDRAW_MIN)}
                      className="border-line bg-fill-50 focus:border-focus h-14 rounded-12 border px-4 text-[20px] font-semibold outline-none"
                    />
                    <p className="text-caption text-ink-tertiary">
                      {t("withdrawRange", {
                        min: formatPrice(WITHDRAW_MIN, currency),
                        max: formatPrice(wallet.balance, currency),
                      })}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-label">{t("withdrawTo")}</span>
                    <ul className="flex flex-col gap-2">
                      {banks.map((bank) => (
                        <li key={bank.id}>
                          <label className="border-line has-checked:border-action has-checked:bg-action-tint flex cursor-pointer items-center gap-3 rounded-12 border p-4">
                            <input
                              type="radio"
                              name="bankAccountId"
                              value={bank.id}
                              defaultChecked={bank.id === defaultBank?.id}
                              required
                              className="accent-action size-4"
                            />
                            <span className="flex min-w-0 flex-col">
                              <span className="text-label" dir="auto">
                                {bank.bankName}
                              </span>
                              <span className="text-caption text-ink-tertiary" dir="ltr">
                                {bankIbanLabel(bank)}
                              </span>
                            </span>
                            {bank.isDefault && (
                              <span className="bg-tint text-caption text-ink-secondary ms-auto rounded-[11px] px-2 py-0.5">
                                {t("default")}
                              </span>
                            )}
                          </label>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href="/account/wallet/banks"
                      className="text-caption text-action mt-1 inline-flex items-center gap-1.5"
                    >
                      <Plus className="size-3.5" aria-hidden />
                      {t("addBank")}
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
                    {t("withdrawSubmit")}
                  </button>
                  <p className="text-caption text-ink-tertiary text-center">
                    {t("arrivalNote")}
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
