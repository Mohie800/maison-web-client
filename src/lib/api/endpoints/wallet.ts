import "server-only";
import { z } from "zod";
import { serverApiFetch } from "../server";
import { parseResponse } from "../parse";
import { ApiError } from "../errors";
import {
  bankAccountSchema,
  paymentMethodSchema,
  transferRecipientSchema,
  walletBalanceSchema,
  walletEarningsSchema,
  walletTransactionDetailSchema,
  walletTransactionsSchema,
  TRANSACTIONS_MAX_LIMIT,
  type TransactionGroup,
  type TransactionReason,
  type TransactionType,
} from "../schemas/wallet";

/**
 * Wallet reads. All require a session — `(account)` is gated by `proxy.ts`, so
 * a signed-out visitor never reaches these.
 */

export const TRANSACTIONS_PAGE_SIZE = 20;

export async function getWallet() {
  const data = await serverApiFetch<unknown>("/wallet");
  return parseResponse(walletBalanceSchema, data, "GET /wallet");
}

export async function getWalletEarnings() {
  const data = await serverApiFetch<unknown>("/wallet/earnings");
  return parseResponse(walletEarningsSchema, data, "GET /wallet/earnings");
}

export interface TransactionsQuery {
  page?: number;
  limit?: number;
  type?: TransactionType;
  /** One or more reasons, OR-ed. Sent comma-separated, as the API expects. */
  reason?: TransactionReason | TransactionReason[];
  /** A named set of reasons. Ignored when `reason` is sent — that wins. */
  group?: TransactionGroup;
}

export async function getWalletTransactions(query: TransactionsQuery = {}) {
  const { reason, ...rest } = query;
  const data = await serverApiFetch<unknown>("/wallet/transactions", {
    params: {
      ...rest,
      ...(reason
        ? { reason: Array.isArray(reason) ? reason.join(",") : reason }
        : {}),
      limit: Math.min(query.limit ?? TRANSACTIONS_PAGE_SIZE, TRANSACTIONS_MAX_LIMIT),
    },
  });
  return parseResponse(
    walletTransactionsSchema,
    data,
    "GET /wallet/transactions",
  );
}

/**
 * A single transaction — the list row plus the order and line items behind it.
 *
 * Worth the extra request only on the detail screen: `order` and `items` are
 * what the list row doesn't carry, and `order.id` is what the receipt link
 * needs.
 */
export async function getWalletTransaction(id: string) {
  try {
    const data = await serverApiFetch<unknown>(`/wallet/transactions/${id}`);
    return parseResponse(
      walletTransactionDetailSchema,
      data,
      `GET /wallet/transactions/${id}`,
    );
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null;
    throw error;
  }
}

/**
 * Resolves a `@handle` or phone number to the person who would receive a
 * transfer. Returns null when nobody matches, which is the form's "we don't
 * know that handle" state rather than an error.
 */
export async function resolveTransferRecipient(recipient: string) {
  try {
    const data = await serverApiFetch<unknown>("/wallet/transfers/resolve", {
      params: { recipient },
    });
    return parseResponse(
      transferRecipientSchema,
      data,
      "GET /wallet/transfers/resolve",
    );
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null;
    throw error;
  }
}

export async function getBankAccounts() {
  const data = await serverApiFetch<unknown>("/wallet/banks");
  return parseResponse(z.array(bankAccountSchema), data, "GET /wallet/banks");
}

export async function getPaymentMethods() {
  const data = await serverApiFetch<unknown>("/payment-methods");
  return parseResponse(
    z.array(paymentMethodSchema),
    data,
    "GET /payment-methods",
  );
}
