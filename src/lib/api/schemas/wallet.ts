import { z } from "zod";

/**
 * Wallet shapes, derived from live responses — the spec documents request DTOs
 * only (API-05).
 *
 * The whole of Flow 14 was blocked until the Round 2 migration: `reports`,
 * `blocks` and `bank_accounts` had no migration file, and the
 * `wallet_transactions.reason` enum was missing `topup`, `withdrawal`,
 * `sale_earnings` and `refund_received`. All verified working 2026-08-25.
 *
 * Money here comes back as **numbers**, not the decimal strings `/listings`
 * uses. It is never summed client-side — every total on these screens is one
 * the server computed.
 */

/** `GET /wallet` */
export const walletBalanceSchema = z.object({
  balance: z.number(),
  currency: z.string().nullish(),
  pendingBalance: z.number().nullish(),
  totalEarnings: z.number().nullish(),
});

export type WalletBalance = z.infer<typeof walletBalanceSchema>;

/** `GET /wallet/earnings` */
export const walletEarningsSchema = z.object({
  totalEarnings: z.number().nullish(),
  totalWithdrawn: z.number().nullish(),
  thisMonthEarnings: z.number().nullish(),
  totalItemsSold: z.number().nullish(),
  currency: z.string().nullish(),
});

export type WalletEarnings = z.infer<typeof walletEarningsSchema>;

/** Every `reason` the API accepts as a filter and returns on a row. */
export const TRANSACTION_REASONS = [
  "topup",
  "withdrawal",
  "sale_earnings",
  "refund_received",
  "referral_bonus_referrer",
  "referral_bonus_referee",
  "auction_entry_fee_refund",
  "auction_non_payment_penalty",
  "admin_adjustment",
  "transfer_sent",
  "transfer_received",
  "trade_settlement",
] as const;

export type TransactionReason = (typeof TRANSACTION_REASONS)[number];

/**
 * `?group=` — named sets of reasons, resolved server-side (GAP-39).
 *
 * Prefer these over listing reasons: "what counts as auction activity" is then
 * decided once, and a chip keeps working when a reason joins the group.
 */
export const TRANSACTION_GROUPS = [
  "all",
  "sales",
  "trades",
  "auctions",
  "transfers",
] as const;

export type TransactionGroup = (typeof TRANSACTION_GROUPS)[number];

/** `?type=` — `all` is the default and means "no filter". */
export const TRANSACTION_TYPES = ["all", "credit", "debit"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

/**
 * The money split behind a payout. Reconciles since GAP-45:
 * `grossAmount − platformFeeAmount − shippingAmount = netAmount`, in all three
 * `shippingPayer` modes — verified end to end on dev on 2026-08-29.
 *
 * The two shipping numbers answer different questions and only one is a
 * deduction:
 *
 * - `shippingAmount` is what came **out of the payout**. Non-zero only on
 *   `included_in_price`, where the seller absorbed the parcel.
 * - `shippingChargedToBuyer` is informational and never subtracted. It exists
 *   so a receipt can say "free shipping, covered by you" instead of a bare 0.
 *
 * `null` on rows with no split (a top-up is just an amount), so branch on it.
 */
export const transactionBreakdownSchema = z.object({
  grossAmount: z.number().nullish(),
  platformFeeAmount: z.number().nullish(),
  shippingAmount: z.number().nullish(),
  netAmount: z.number().nullish(),
  shippingPayer: z.string().nullish(),
  shippingChargedToBuyer: z.number().nullish(),
});

export const walletTransactionSchema = z.object({
  id: z.string(),
  /** `credit` adds to the balance, `debit` removes from it. */
  type: z.string(),
  /**
   * `completed | pending | failed | reversed`. Every row reads `completed`
   * today — the ledger only holds settled movements — but the badge is the
   * field rather than a constant, so it is right on the day that changes.
   */
  status: z.string().nullish(),
  reason: z.string().nullish(),
  /** Always the net. `breakdown` explains it rather than replacing it. */
  amount: z.number(),
  /** Server-authored, already localised-ish: "Wallet top-up via card". */
  note: z.string().nullish(),
  listingId: z.string().nullish(),
  createdAt: z.string().nullish(),
  currency: z.string().nullish(),
  /** English display text for `reason`, so every client says the same words. */
  label: z.string().nullish(),
  listing: z
    .object({
      id: z.string(),
      title: z.string().nullish(),
      currency: z.string().nullish(),
      coverPhotoUrl: z.string().nullish(),
    })
    .nullish(),
  /** The other party: the buyer on a sale, the recipient on a transfer. */
  counterparty: z
    .object({
      id: z.string(),
      handle: z.string().nullish(),
      profilePic: z.string().nullish(),
    })
    .nullish(),
  orderShipmentId: z.string().nullish(),
  breakdown: transactionBreakdownSchema.nullish(),
});

export type WalletTransaction = z.infer<typeof walletTransactionSchema>;

/**
 * `GET /wallet/transactions/{id}` — the list row plus the order behind it.
 *
 * `order.id` is what the design's "Download Receipt" needs: the invoice lives
 * at `GET /orders/{id}/invoice`, which both parties can read.
 */
export const walletTransactionDetailSchema = walletTransactionSchema.extend({
  order: z
    .object({
      id: z.string(),
      orderNumber: z.string().nullish(),
      invoiceNumber: z.string().nullish(),
      currency: z.string().nullish(),
      placedAt: z.string().nullish(),
    })
    .nullish(),
  items: z
    .array(
      z.object({
        id: z.string(),
        listingId: z.string().nullish(),
        title: z.string().nullish(),
        price: z.number().nullish(),
      }),
    )
    .nullish(),
});

export type WalletTransactionDetail = z.infer<
  typeof walletTransactionDetailSchema
>;

export const walletTransactionsSchema = z.object({
  items: z.array(walletTransactionSchema),
  total: z.number(),
  page: z.number().nullish(),
  limit: z.number().nullish(),
});

/** The endpoint caps `limit` at 50 and 400s above it. */
export const TRANSACTIONS_MAX_LIMIT = 50;

/** `GET /wallet/banks` — an array, not an envelope. */
export const bankAccountSchema = z.object({
  id: z.string(),
  iban: z.string().nullish(),
  /** "SA03****7519" — prefer this for display over the full `iban`. */
  ibanMasked: z.string().nullish(),
  accountHolder: z.string().nullish(),
  bankName: z.string().nullish(),
  bankCode: z.string().nullish(),
  isDefault: z.boolean().nullish(),
  isVerified: z.boolean().nullish(),
  createdAt: z.string().nullish(),
});

export type BankAccount = z.infer<typeof bankAccountSchema>;

export const PAYMENT_METHOD_TYPES = [
  "card",
  "mada",
  "stc_pay",
  "apple_pay",
  "tabby",
  "tamara",
  "paytabs",
] as const;

export type PaymentMethodType = (typeof PAYMENT_METHOD_TYPES)[number];

/**
 * `GET /payment-methods` — an array.
 *
 * `cardNumber` and `cvv` are accepted on create and never returned; the stored
 * record keeps only `cardBrand` and `cardLast4`. Wallet types (`stc_pay`) use
 * `walletPhone` instead and leave every card field null.
 */
export const paymentMethodSchema = z.object({
  id: z.string(),
  type: z.string(),
  cardBrand: z.string().nullish(),
  cardLast4: z.string().nullish(),
  cardholderName: z.string().nullish(),
  expiryMonth: z.number().nullish(),
  expiryYear: z.number().nullish(),
  walletPhone: z.string().nullish(),
  isDefault: z.boolean().nullish(),
  createdAt: z.string().nullish(),
});

export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

/** `POST /wallet/topup` and `/wallet/withdraw` both return this. */
export const walletMutationResultSchema = z.object({
  success: z.boolean().nullish(),
  newBalance: z.number().nullish(),
  transaction: z
    .object({
      id: z.string(),
      amount: z.number().nullish(),
      createdAt: z.string().nullish(),
    })
    .nullish(),
  /** Withdrawals only — a real date, roughly three days out. */
  estimatedArrival: z.string().nullish(),
});

/**
 * Server-side validation limits, mirrored here so the forms reject bad input
 * before a round trip rather than surfacing a 400.
 *
 * Confirmed by probing: top-up under 10 or over 10,000 is rejected, as is a
 * withdrawal under 50. Both amounts are required, as are `paymentMethodId` and
 * `bankAccountId` respectively.
 */
export const TOPUP_MIN = 10;
export const TOPUP_MAX = 10_000;
export const WITHDRAW_MIN = 50;

/** True when the row increases the balance. */
export function isCredit(transaction: { type: string }): boolean {
  return transaction.type === "credit";
}

/* ------------------------------------------------------------- transfers */

/**
 * `GET /wallet/transfers/resolve?recipient=` — who the money would go to.
 *
 * The design confirms the recipient before the money moves, which is the whole
 * point of this call: it 404s on an unknown handle, so the send form can name
 * the person rather than posting a string and hoping.
 */
export const transferRecipientSchema = z.object({
  id: z.string(),
  handle: z.string().nullish(),
  fullName: z.string().nullish(),
  profilePic: z.string().nullish(),
  isSelf: z.boolean().nullish(),
  canReceive: z.boolean().nullish(),
  fee: z.number().nullish(),
  currency: z.string().nullish(),
});

export type TransferRecipient = z.infer<typeof transferRecipientSchema>;

/** `POST /wallet/send`. */
export const walletSendResultSchema = z.object({
  success: z.boolean().nullish(),
  newBalance: z.number().nullish(),
  fee: z.number().nullish(),
  amountReceived: z.number().nullish(),
  currency: z.string().nullish(),
  recipient: z
    .object({
      id: z.string(),
      handle: z.string().nullish(),
      profilePic: z.string().nullish(),
    })
    .nullish(),
  transaction: z
    .object({
      id: z.string(),
      amount: z.number().nullish(),
      createdAt: z.string().nullish(),
    })
    .nullish(),
});

/**
 * Recipient is a `@handle` (with or without the `@`) or an E.164 phone.
 * The minimum is 1 — probed, like the top-up and withdrawal limits above.
 */
export const SEND_MIN = 1;
