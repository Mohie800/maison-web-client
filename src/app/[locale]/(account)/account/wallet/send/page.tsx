import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AtSign, Pencil, UserRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getWallet, resolveTransferRecipient } from "@/lib/api/endpoints/wallet";
import { formatPrice } from "@/lib/format/money";
import { SEND_MIN } from "@/lib/api/schemas/wallet";
import { resolveMediaUrl } from "@/lib/api/media";
import { AccountSidebar } from "@/components/layout/account-sidebar";
import { WalletNav } from "@/features/wallet/components/wallet-nav";
import { BalanceCard } from "@/features/wallet/components/balance-card";
import { WalletError } from "@/features/wallet/components/wallet-error";
import { sendMoneyAction } from "@/features/wallet/actions";

/**
 * Send money — Figma `651:10468` (Web_Wallet_Send).
 *
 * Two server-rendered steps: enter a handle and an amount, then confirm against
 * the resolved person. `GET /wallet/transfers/resolve` is what makes the
 * design's "They receive" summary honest — it names the recipient before the
 * money moves, rather than posting a string and hoping.
 *
 * The fee is genuinely zero, matching the design's copy, and is read from the
 * resolve response rather than hardcoded.
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function WalletSendPage({
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
  const one = (v: string | string[] | undefined) =>
    typeof v === "string" ? v : null;

  const recipientInput = one(query.recipient);
  const amountInput = Number(one(query.amount) ?? NaN);
  const amount = Number.isFinite(amountInput) ? amountInput : null;
  const note = one(query.note);

  const [wallet, recipient] = await Promise.all([
    getWallet(),
    recipientInput ? resolveTransferRecipient(recipientInput) : null,
  ]);

  const currency = recipient?.currency ?? wallet.currency ?? "SAR";
  const fee = recipient?.fee ?? 0;

  /* Errors the page decides itself, ahead of the ones an action redirects with. */
  const error =
    one(query.error) ??
    (recipientInput && !recipient ? "recipientNotFound" : null) ??
    (recipient?.isSelf ? "recipientSelf" : null) ??
    (recipient && recipient.canReceive === false
      ? "recipientCannotReceive"
      : null);

  const avatar = resolveMediaUrl(recipient?.profilePic);

  const confirming =
    recipient != null &&
    amount != null &&
    !recipient.isSelf &&
    recipient.canReceive !== false;

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-8 lg:flex-row lg:px-20">
      <AccountSidebar active="wallet" />

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-h1">{t("sendTitle")}</h1>
          <p className="text-body text-ink-secondary">{t("sendSubtitle")}</p>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <WalletNav active="send" />

          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <BalanceCard wallet={wallet} />
            <WalletError code={error} />

            <form
              action={sendMoneyAction}
              className="flex flex-col gap-6 lg:flex-row lg:items-start"
            >
              <input type="hidden" name="locale" value={locale} />

              <fieldset className="border-line bg-base flex min-w-0 flex-1 flex-col gap-5 rounded-16 border p-6">
                <legend className="sr-only">{t("sendTitle")}</legend>

                {confirming ? (
                  /* Step 2 — who the money is going to, by name. */
                  <div className="flex flex-col gap-3">
                    <span className="text-label">{t("sendingTo")}</span>
                    <div className="border-line bg-fill-50 flex items-center gap-3 rounded-12 border p-4">
                      {avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                        <img
                          src={avatar}
                          alt=""
                          className="size-11 rounded-full object-cover"
                        />
                      ) : (
                        <span
                          className="bg-tint text-ink-tertiary flex size-11 items-center justify-center rounded-full"
                          aria-hidden
                        >
                          <UserRound className="size-5" />
                        </span>
                      )}
                      <span className="flex min-w-0 flex-col">
                        {recipient.fullName && (
                          <span className="text-label truncate" dir="auto">
                            {recipient.fullName}
                          </span>
                        )}
                        <span
                          className="text-caption text-ink-tertiary truncate"
                          dir="ltr"
                        >
                          @{recipient.handle}
                        </span>
                      </span>
                      <Link
                        href="/account/wallet/send"
                        className="text-caption text-action ms-auto inline-flex items-center gap-1.5"
                      >
                        <Pencil className="size-3.5" aria-hidden />
                        {t("editRecipient")}
                      </Link>
                    </div>

                    <input
                      type="hidden"
                      name="recipient"
                      value={recipientInput ?? ""}
                    />
                    <input type="hidden" name="amount" value={String(amount)} />
                    {note && <input type="hidden" name="note" value={note} />}
                    <input type="hidden" name="confirm" value="1" />
                  </div>
                ) : (
                  /* Step 1 — the handle and the amount. */
                  <>
                    <div className="flex flex-col gap-2">
                      <label htmlFor="recipient" className="text-label">
                        {t("recipient")}
                      </label>
                      <div className="border-line bg-fill-50 focus-within:border-focus flex h-14 items-center gap-2 rounded-12 border px-4">
                        <AtSign
                          className="text-ink-tertiary size-4 shrink-0"
                          aria-hidden
                        />
                        <input
                          id="recipient"
                          name="recipient"
                          type="text"
                          required
                          defaultValue={recipientInput ?? ""}
                          dir="ltr"
                          autoComplete="off"
                          placeholder="handle"
                          className="min-w-0 flex-1 bg-transparent text-[16px] outline-none"
                        />
                      </div>
                      <p className="text-caption text-ink-tertiary">
                        {t("recipientHint")}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label htmlFor="amount" className="text-label">
                        {t("amount")}
                      </label>
                      <input
                        id="amount"
                        name="amount"
                        type="number"
                        required
                        min={SEND_MIN}
                        max={wallet.balance}
                        step="1"
                        inputMode="numeric"
                        dir="ltr"
                        defaultValue={amount ?? ""}
                        placeholder={String(SEND_MIN)}
                        className="border-line bg-fill-50 focus:border-focus h-14 rounded-12 border px-4 text-[20px] font-semibold outline-none"
                      />
                      <p className="text-caption text-ink-tertiary">
                        {t("sendRange", {
                          min: formatPrice(SEND_MIN, currency),
                          max: formatPrice(wallet.balance, currency),
                        })}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label htmlFor="note" className="text-label">
                        {t("noteOptional")}
                      </label>
                      <input
                        id="note"
                        name="note"
                        type="text"
                        maxLength={140}
                        defaultValue={note ?? ""}
                        dir="auto"
                        className="border-line bg-fill-50 focus:border-focus h-12 rounded-12 border px-4 outline-none"
                      />
                    </div>
                  </>
                )}
              </fieldset>

              <aside className="border-line bg-base flex w-full shrink-0 flex-col gap-4 rounded-16 border p-6 lg:w-[340px]">
                <h2 className="text-label">{t("summary")}</h2>
                <dl className="flex flex-col gap-2">
                  <div className="flex justify-between">
                    <dt className="text-caption text-ink-secondary">
                      {t("transferFee")}
                    </dt>
                    <dd className="text-caption" dir="ltr">
                      {formatPrice(fee, currency)}
                    </dd>
                  </div>
                  {confirming && (
                    <div className="flex justify-between">
                      <dt className="text-label">{t("theyReceive")}</dt>
                      <dd className="text-label font-semibold" dir="ltr">
                        {formatPrice(amount, currency)}
                      </dd>
                    </div>
                  )}
                </dl>
                <button
                  type="submit"
                  className="bg-aqua text-on-accent text-label h-12 rounded-[24px] font-semibold"
                >
                  {confirming ? t("confirmSend") : t("continue")}
                </button>
                <p className="text-caption text-ink-tertiary text-center">
                  {confirming ? t("sendFinal") : t("sendReview")}
                </p>
              </aside>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
