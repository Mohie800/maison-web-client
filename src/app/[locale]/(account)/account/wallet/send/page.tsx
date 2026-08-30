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
import { WalletError } from "@/features/wallet/components/wallet-error";
import { sendMoneyAction } from "@/features/wallet/actions";

/**
 * Send money — Figma `651:10468` (Web_Wallet_Send). One card holding all three
 * fields, the "They receive" panel and a full-width button; the balance is the
 * 12px line under the title, not the dark card the other wallet screens use.
 *
 * This frame is on the older token family (`border/default`, `bg/surface`,
 * `text/primary`), so the utilities here are the older names on purpose.
 *
 * Two server-rendered steps rather than the frame's one: enter a handle and an
 * amount, then confirm against the resolved person.
 * `GET /wallet/transfers/resolve` is what makes "They receive" honest — it
 * names the recipient before the money moves, rather than posting a string and
 * hoping (plans/09 C38).
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

  const label = "text-label font-semibold";
  const field =
    "border-line bg-base focus-within:border-focus h-12 w-full rounded-12 border px-4 text-[14px] outline-none";

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col px-4 pt-8 pb-14 lg:px-20">
      <h1 className="text-ink-900 pb-6 text-[28px] font-bold">
        {t("accountTitle")}
      </h1>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <AccountSidebar active="wallet" />

        <div className="flex min-w-0 flex-1 flex-col gap-6 lg:flex-row lg:items-start">
          <WalletNav active="send" />

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <WalletError code={error} />

            {/* card — 651:10493 */}
            <form
              action={sendMoneyAction}
              className="border-line bg-base flex flex-col gap-5 rounded-16 border p-6"
            >
              <input type="hidden" name="locale" value={locale} />

              <div className="flex flex-col gap-1">
                <h2 className="text-[16px] font-semibold">{t("sendTitle")}</h2>
                <p className="text-caption text-ink-tertiary" dir="auto">
                  {t("walletBalanceLine", {
                    amount: formatPrice(wallet.balance, currency),
                  })}
                </p>
              </div>

              {confirming ? (
                /* Step 2 — who the money is going to, by name. */
                <div className="flex flex-col gap-2">
                  <span className={label}>{t("sendingTo")}</span>
                  <div className="border-line bg-surface flex items-center gap-3 rounded-12 border p-4">
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
                /* Step 1 — the handle, the amount and the note. */
                <>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="recipient" className={label}>
                      {t("recipientLabel")}
                    </label>
                    <div className="border-line bg-base focus-within:border-focus flex h-12 items-center gap-2 rounded-12 border px-4">
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
                        className="min-w-0 flex-1 bg-transparent text-[14px] outline-none"
                      />
                    </div>
                    <p className="text-caption text-ink-tertiary">
                      {t("recipientHint")}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="amount" className={label}>
                      {t("amountLabel", { currency })}
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
                      className={field}
                    />
                    <p className="text-caption text-ink-tertiary">
                      {t("sendRange", {
                        min: formatPrice(SEND_MIN, currency),
                        max: formatPrice(wallet.balance, currency),
                      })}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="note" className={label}>
                      {t("noteOptional")}
                    </label>
                    <input
                      id="note"
                      name="note"
                      type="text"
                      maxLength={140}
                      defaultValue={note ?? ""}
                      dir="auto"
                      className={field}
                    />
                  </div>
                </>
              )}

              {/* sum — 651:10505 */}
              <div className="bg-surface flex flex-col gap-1.5 rounded-12 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-body text-ink-secondary">
                    {t("theyReceive")}
                  </span>
                  <span className="text-[16px] font-bold" dir="ltr">
                    {formatPrice(amount ?? 0, currency)}
                  </span>
                </div>
                <p className="text-caption text-ink-tertiary">
                  {fee > 0
                    ? t("transferFeeLine", {
                        amount: formatPrice(fee, currency),
                      })
                    : t("feeNote")}
                </p>
              </div>

              {/* btn/primary — 651:10509 */}
              <button
                type="submit"
                className="bg-aqua text-on-accent h-[50px] w-full rounded-12 text-[14px] font-semibold"
              >
                {confirming
                  ? t("sendSubmitAmount", {
                      amount: formatPrice(amount, currency),
                    })
                  : t("continue")}
              </button>

              <p className="text-caption text-ink-tertiary text-center">
                {confirming ? t("sendFinal") : t("sendReview")}
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
