import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Landmark, BadgeCheck } from "lucide-react";
import { getBankAccounts } from "@/lib/api/endpoints/wallet";
import { AccountSidebar } from "@/components/layout/account-sidebar";
import { WalletNav } from "@/features/wallet/components/wallet-nav";
import { WalletError } from "@/features/wallet/components/wallet-error";
import { bankIbanLabel } from "@/features/wallet/labels";
import {
  addBankAction,
  removeBankAction,
  setDefaultBankAction,
} from "@/features/wallet/actions";

/**
 * Payout banks — Figma `651:10682`.
 *
 * The design's subtitle reads "Verified with SAMA". The API does return
 * `isVerified` per account, but every account created through it comes back
 * `false` and there is no endpoint to trigger or complete verification — so the
 * badge renders from the real flag and the SAMA claim is left out of the copy
 * rather than asserted on the platform's behalf.
 *
 * The first account added becomes the default automatically; after that,
 * `PATCH /wallet/banks/{id}/default` moves it.
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function BanksPage({
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

  const banks = await getBankAccounts();

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-8 lg:flex-row lg:px-20">
      <AccountSidebar active="wallet" />

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-h1">{t("banksTitle")}</h1>
          <p className="text-body text-ink-secondary">{t("banksSubtitle")}</p>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <WalletNav active="banks" />

          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <WalletError code={error} />

            <section className="border-line bg-base overflow-hidden rounded-16 border">
              {banks.length === 0 ? (
                <div className="p-10 text-center">
                  <Landmark className="text-ink-tertiary mx-auto size-8" aria-hidden />
                  <p className="text-body text-ink-tertiary mt-3">
                    {t("noBanksBody")}
                  </p>
                </div>
              ) : (
                <ul className="divide-line divide-y">
                  {banks.map((bank) => (
                    <li
                      key={bank.id}
                      className="flex flex-wrap items-center gap-3 px-4 py-4"
                    >
                      <span
                        className="bg-tint text-ink-secondary flex size-9 shrink-0 items-center justify-center rounded-full"
                        aria-hidden
                      >
                        <Landmark className="size-4" />
                      </span>

                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-label flex items-center gap-1.5" dir="auto">
                          {bank.bankName}
                          {bank.isVerified && (
                            <BadgeCheck className="text-action size-4" aria-hidden />
                          )}
                        </span>
                        <span className="text-caption text-ink-tertiary" dir="ltr">
                          {bankIbanLabel(bank)}
                        </span>
                      </span>

                      {bank.isDefault ? (
                        <span className="bg-action-tint text-action text-caption rounded-[11px] px-2.5 py-1 font-semibold">
                          {t("default")}
                        </span>
                      ) : (
                        <form action={setDefaultBankAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="id" value={bank.id} />
                          <button type="submit" className="text-caption text-action">
                            {t("makeDefault")}
                          </button>
                        </form>
                      )}

                      <form action={removeBankAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="id" value={bank.id} />
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

            <form
              action={addBankAction}
              className="border-line bg-base flex flex-col gap-4 rounded-16 border p-6"
            >
              <input type="hidden" name="locale" value={locale} />
              <h2 className="text-label">{t("addBank")}</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <label htmlFor="iban" className="text-caption text-ink-secondary">
                    {t("iban")}
                  </label>
                  <input
                    id="iban"
                    name="iban"
                    required
                    minLength={15}
                    maxLength={34}
                    dir="ltr"
                    placeholder="SA0380000000608010167519"
                    className="border-line bg-fill-50 text-body focus:border-focus h-11 rounded-10 border px-3 outline-none"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="accountHolder"
                    className="text-caption text-ink-secondary"
                  >
                    {t("accountHolder")}
                  </label>
                  <input
                    id="accountHolder"
                    name="accountHolder"
                    required
                    minLength={2}
                    maxLength={120}
                    className="border-line bg-fill-50 text-body focus:border-focus h-11 rounded-10 border px-3 outline-none"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="bankName" className="text-caption text-ink-secondary">
                    {t("bankName")}
                  </label>
                  <input
                    id="bankName"
                    name="bankName"
                    required
                    minLength={2}
                    maxLength={80}
                    className="border-line bg-fill-50 text-body focus:border-focus h-11 rounded-10 border px-3 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="border-ink text-label h-11 w-fit rounded-[22px] border px-5 font-semibold"
              >
                {t("save")}
              </button>

              <p className="text-caption text-ink-tertiary">{t("withdrawalNote")}</p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
