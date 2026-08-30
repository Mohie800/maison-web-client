"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { serverApiFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/errors";
import {
  SEND_MIN,
  TOPUP_MAX,
  TOPUP_MIN,
  WITHDRAW_MIN,
} from "@/lib/api/schemas/wallet";

/**
 * Wallet mutations, as Server Actions posted from plain forms — so adding
 * funds, withdrawing and managing cards and banks all work without JavaScript,
 * like the rest of the account area.
 *
 * Errors come back as a `?error=` on the same URL rather than a thrown page.
 * These are money screens: a user who mistypes an amount should see the form
 * again with their mistake explained, not an error boundary.
 */

type Result = { ok: true } | { ok: false; error: string };

/** Every wallet screen shows a balance, so a mutation invalidates all of them. */
function revalidateWallet(locale: string) {
  for (const path of [
    "",
    "/add-funds",
    "/withdraw",
    "/send",
    "/history",
    "/earnings",
    "/payment-methods",
    "/banks",
  ]) {
    revalidatePath(`/${locale}/account/wallet${path}`);
  }
}

/**
 * Maps an ApiError to a short code the page turns into a message.
 *
 * The API's own text is good ("Insufficient balance. Available: 0 SAR") but it
 * is English-only, and these screens are bilingual — so the code is translated
 * client-side and the server's string is kept only when we have nothing better.
 */
function toErrorCode(error: unknown): string {
  if (error instanceof ApiError) {
    // `messages` is already normalised to an array by toApiError().
    const message = error.messages.join(" ");

    if (/insufficient/i.test(message)) return "insufficientBalance";
    if (/must not be less than/i.test(message)) return "amountTooSmall";
    if (/must not be greater than/i.test(message)) return "amountTooLarge";
    if (/yourself/i.test(message)) return "recipientSelf";
    if (error.isNotFound) return "recipientNotFound";
    if (error.isUnauthorized) return "unauthenticated";
    return "requestFailed";
  }
  return "requestFailed";
}

function amountFrom(formData: FormData): number | null {
  const raw = String(formData.get("amount") ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function run(fn: () => Promise<unknown>): Promise<Result> {
  try {
    await fn();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorCode(error) };
  }
}

/** POST /wallet/topup — needs an amount of 10–10,000 and a saved payment method. */
export async function topUpAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const base = `/${locale}/account/wallet/add-funds`;

  const amount = amountFrom(formData);
  const paymentMethodId = String(formData.get("paymentMethodId") ?? "");

  if (!amount) redirect(`${base}?error=amountRequired`);
  if (amount < TOPUP_MIN) redirect(`${base}?error=amountTooSmall`);
  if (amount > TOPUP_MAX) redirect(`${base}?error=amountTooLarge`);
  if (!paymentMethodId) redirect(`${base}?error=paymentMethodRequired`);

  const result = await run(() =>
    serverApiFetch("/wallet/topup", {
      method: "POST",
      body: { amount, paymentMethodId },
    }),
  );

  if (!result.ok) redirect(`${base}?error=${result.error}`);

  revalidateWallet(locale);
  redirect(`/${locale}/account/wallet?added=${amount}`);
}

/** POST /wallet/withdraw — minimum 50, and a bank account to pay out to. */
export async function withdrawAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const base = `/${locale}/account/wallet/withdraw`;

  const amount = amountFrom(formData);
  const bankAccountId = String(formData.get("bankAccountId") ?? "");

  if (!amount) redirect(`${base}?error=amountRequired`);
  if (amount < WITHDRAW_MIN) redirect(`${base}?error=amountTooSmall`);
  if (!bankAccountId) redirect(`${base}?error=bankRequired`);

  const result = await run(() =>
    serverApiFetch("/wallet/withdraw", {
      method: "POST",
      body: { amount, bankAccountId },
    }),
  );

  if (!result.ok) redirect(`${base}?error=${result.error}`);

  revalidateWallet(locale);
  redirect(`/${locale}/account/wallet?withdrew=${amount}`);
}

/**
 * POST /wallet/send — a wallet-to-wallet transfer.
 *
 * Two steps, both server-rendered so the flow works without JavaScript: the
 * first submit carries `confirm` unset and only resolves the recipient onto the
 * URL, the second sends. The design's "They receive" summary is the point of
 * the pause — the money moves on the second press, against a named person.
 */
export async function sendMoneyAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const base = `/${locale}/account/wallet/send`;

  const recipient = String(formData.get("recipient") ?? "").trim();
  const amount = amountFrom(formData);
  const note = String(formData.get("note") ?? "").trim();
  const confirmed = formData.get("confirm") === "1";

  if (!recipient) redirect(`${base}?error=recipientRequired`);
  if (!amount) redirect(`${base}?error=amountRequired`);
  if (amount < SEND_MIN) redirect(`${base}?error=amountTooSmall`);

  const params = new URLSearchParams({ recipient, amount: String(amount) });
  if (note) params.set("note", note);

  // First pass: hand the recipient back to the page to resolve and confirm.
  if (!confirmed) redirect(`${base}?${params.toString()}`);

  const result = await run(() =>
    serverApiFetch("/wallet/send", {
      method: "POST",
      body: { recipient, amount, ...(note ? { note } : {}) },
    }),
  );

  if (!result.ok) {
    params.set("error", result.error);
    redirect(`${base}?${params.toString()}`);
  }

  revalidateWallet(locale);
  redirect(
    `/${locale}/account/wallet?sent=${amount}&to=${encodeURIComponent(recipient)}`,
  );
}

/* ------------------------------------------------------------------ banks */

export async function addBankAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const base = `/${locale}/account/wallet/banks`;

  const iban = String(formData.get("iban") ?? "").replace(/\s+/g, "").toUpperCase();
  const accountHolder = String(formData.get("accountHolder") ?? "").trim();
  const bankName = String(formData.get("bankName") ?? "").trim();

  // Mirrors the server's own constraints: iban 15–34, holder 2–120, bank 2–80.
  if (iban.length < 15 || iban.length > 34) redirect(`${base}?error=ibanInvalid`);
  if (accountHolder.length < 2) redirect(`${base}?error=holderRequired`);
  if (bankName.length < 2) redirect(`${base}?error=bankNameRequired`);

  const result = await run(() =>
    serverApiFetch("/wallet/banks", {
      method: "POST",
      body: { iban, accountHolder, bankName },
    }),
  );

  if (!result.ok) redirect(`${base}?error=${result.error}`);
  revalidateWallet(locale);
  redirect(base);
}

export async function removeBankAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  if (id) {
    await run(() => serverApiFetch(`/wallet/banks/${id}`, { method: "DELETE" }));
    revalidateWallet(locale);
  }
  redirect(`/${locale}/account/wallet/banks`);
}

export async function setDefaultBankAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  if (id) {
    await run(() =>
      serverApiFetch(`/wallet/banks/${id}/default`, { method: "PATCH" }),
    );
    revalidateWallet(locale);
  }
  redirect(`/${locale}/account/wallet/banks`);
}

/* --------------------------------------------------------- payment methods */

export async function addPaymentMethodAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const base = `/${locale}/account/wallet/payment-methods`;

  const type = String(formData.get("type") ?? "card");

  /*
   * Card number and CVV are transient — the API takes them and stores only the
   * brand and last four. They are never persisted here either: the form posts
   * straight to this action and nothing is written to the URL.
   */
  const body: Record<string, unknown> = { type };

  if (type === "card" || type === "mada") {
    const cardNumber = String(formData.get("cardNumber") ?? "").replace(/\s+/g, "");
    const expiry = String(formData.get("expiry") ?? "");
    const [monthRaw, yearRaw] = expiry.split("/").map((s) => s.trim());

    if (cardNumber.length < 12) redirect(`${base}?error=cardInvalid`);

    const month = Number(monthRaw);
    const year = Number(yearRaw?.length === 2 ? `20${yearRaw}` : yearRaw);
    if (!(month >= 1 && month <= 12) || !(year >= 2020)) {
      redirect(`${base}?error=expiryInvalid`);
    }

    body.cardNumber = cardNumber;
    body.cardholderName = String(formData.get("cardholderName") ?? "").trim();
    body.expiryMonth = month;
    body.expiryYear = year;
    body.cvv = String(formData.get("cvv") ?? "");
  } else {
    const walletPhone = String(formData.get("walletPhone") ?? "").trim();
    if (!walletPhone) redirect(`${base}?error=phoneRequired`);
    body.walletPhone = walletPhone;
  }

  const result = await run(() =>
    serverApiFetch("/payment-methods", { method: "POST", body }),
  );

  if (!result.ok) redirect(`${base}?error=${result.error}`);
  revalidateWallet(locale);
  redirect(base);
}

export async function removePaymentMethodAction(
  formData: FormData,
): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  if (id) {
    await run(() =>
      serverApiFetch(`/payment-methods/${id}`, { method: "DELETE" }),
    );
    revalidateWallet(locale);
  }
  redirect(`/${locale}/account/wallet/payment-methods`);
}

export async function setDefaultPaymentMethodAction(
  formData: FormData,
): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  if (id) {
    await run(() =>
      serverApiFetch(`/payment-methods/${id}/default`, { method: "PATCH" }),
    );
    revalidateWallet(locale);
  }
  redirect(`/${locale}/account/wallet/payment-methods`);
}
