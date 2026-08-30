import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Landmark } from "lucide-react";
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
    <div className="mx-auto flex max-w-[1440px] flex-col px-4 pt-8 pb-14 lg:px-20">
      <h1 className="text-ink-900 pb-6 text-[28px] font-bold">
        {t("accountTitle")}
      </h1>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <AccountSidebar active="wallet" />

        <div className="flex min-w-0 flex-1 flex-col gap-6 lg:flex-row lg:items-start">
          <WalletNav active="banks" />

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <WalletError code={error} />

            {/* card — 651:10707 */}
            <section className="border-line bg-base flex flex-col gap-4 rounded-16 border p-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-[16px] font-semibold">{t("banksTitle")}</h2>
                <p className="text-caption text-ink-tertiary">
                  {t("banksSubtitle")}
                </p>
              </div>

              {banks.length === 0 ? (
                <div className="py-8 text-center">
                  <Landmark
                    className="text-ink-tertiary mx-auto size-8"
                    aria-hidden
                  />
                  <p className="text-body text-ink-tertiary mt-3">
                    {t("noBanksBody")}
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col gap-4">
                  {banks.map((bank) => (
                    /* bank — 651:10710 */
                    <li
                      key={bank.id}
                      className="border-line flex flex-wrap items-center gap-3 rounded-12 border px-3.5 py-4"
                    >
                      <span
                        className="bg-tint text-ink-secondary flex size-9 shrink-0 items-center justify-center rounded-full"
                        aria-hidden
                      >
                        <Landmark className="size-4" />
                      </span>

                      <span className="flex min-w-0 flex-1 flex-col">
                        <span
                          className="truncate text-[14px] font-semibold"
                          dir="auto"
                        >
                          {bank.bankName}
                        </span>
                        <span
                          className="text-ink-tertiary truncate text-[12px]"
                          dir="ltr"
                        >
                          {bankIbanLabel(bank)}
                        </span>
                      </span>

                      {/* badge — 651:10715 / 651:10721 */}
                      {bank.isDefault ? (
                        <span className="bg-aqua-tint text-success flex h-[22px] shrink-0 items-center rounded-[6px] px-2.5 text-[10px] font-bold tracking-[0.4px] uppercase">
                          {t("default")}
                        </span>
                      ) : (
                        <form action={setDefaultBankAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="id" value={bank.id} />
                          <button
                            type="submit"
                            className="text-action text-[12px] font-semibold"
                          >
                            {t("makeDefault")}
                          </button>
                        </form>
                      )}

                      {bank.isVerified && !bank.isDefault && (
                        <span className="bg-aqua-tint2 text-azure flex h-[22px] shrink-0 items-center rounded-[6px] px-2.5 text-[10px] font-bold tracking-[0.4px] uppercase">
                          {t("verified")}
                        </span>
                      )}

                      <form action={removeBankAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="id" value={bank.id} />
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

              {/* btn/secondary — 651:10723 */}
              <details className="group">
                <summary className="border-line bg-base flex h-12 cursor-pointer list-none items-center justify-center rounded-12 border text-[14px] font-semibold">
                  + {t("addBank")}
                </summary>

                <form
                  action={addBankAction}
                  className="mt-4 flex flex-col gap-4"
                >
                  <input type="hidden" name="locale" value={locale} />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2 sm:col-span-2">
                      <label
                        htmlFor="iban"
                        className="text-caption text-ink-secondary"
                      >
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
                      <label
                        htmlFor="bankName"
                        className="text-caption text-ink-secondary"
                      >
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
                    className="bg-aqua text-on-accent h-11 w-fit rounded-[22px] px-5 text-[13px] font-semibold"
                  >
                    {t("save")}
                  </button>
                </form>
              </details>

              <p className="text-ink-tertiary text-[11px]">
                {t("withdrawalNote")}
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
