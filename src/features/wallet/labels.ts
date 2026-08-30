import type { BankAccount, PaymentMethod } from "@/lib/api/schemas/wallet";

/**
 * Display labels for saved payment methods and banks.
 *
 * Both are deliberately Latin-script and direction-locked wherever they're
 * rendered: a masked IBAN or a card number reordered by the bidi algorithm in
 * Arabic is not just ugly, it's wrong.
 */

const TYPE_NAMES: Record<string, string> = {
  card: "Card",
  mada: "Mada",
  stc_pay: "STC Pay",
  apple_pay: "Apple Pay",
  tabby: "Tabby",
  tamara: "Tamara",
  paytabs: "PayTabs",
};

/**
 * "Visa •••• 1111" for cards, "STC Pay · +9665…" for wallets.
 *
 * `cardBrand` is derived server-side from the number, so it's more accurate
 * than the `type` the user picked — a `card` submission comes back as
 * `cardBrand: "visa"`. Brand wins when present.
 */
export function paymentMethodLabel(method: PaymentMethod): string {
  const brand = method.cardBrand
    ? method.cardBrand.charAt(0).toUpperCase() + method.cardBrand.slice(1)
    : (TYPE_NAMES[method.type] ?? method.type);

  if (method.cardLast4) return `${brand} •••• ${method.cardLast4}`;
  if (method.walletPhone) return `${brand} · ${method.walletPhone}`;
  return brand;
}

/**
 * The bank's own masked IBAN when it sends one, otherwise a mask built from the
 * full value. Never renders an unmasked IBAN.
 */
export function bankIbanLabel(bank: BankAccount): string {
  if (bank.ibanMasked) return bank.ibanMasked;
  if (!bank.iban) return "";
  const iban = bank.iban.replace(/\s+/g, "");
  return `${iban.slice(0, 4)}••••${iban.slice(-4)}`;
}
