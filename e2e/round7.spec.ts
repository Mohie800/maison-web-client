import { test, expect } from "@playwright/test";
import { signIn, apiToken, apiGet, expectNoErrorBoundary } from "./fixtures";

/**
 * The Round 7 fixes, pinned: projected trade totals, the notification payload
 * table, a picture on a trending term, and the return detail's photo and
 * refund split.
 *
 * Three of the four are assertions about the payload rather than the page,
 * because that is where each of them went wrong — a stored column, a
 * description, and a missing field. The pages are checked where the fix is
 * something the frame draws.
 */

interface TradeRow {
  id: string;
  tradeNumber?: string;
  status: string;
  requesterId: string;
  responderId?: string;
  payerId?: string | null;
  counterAmount?: string | number | null;
  requesterTotal?: string | number;
  responderTotal?: string | number;
  viewerTotal?: string | number;
}

const num = (value: string | number | null | undefined) => Number(value ?? 0);

async function trades(
  request: Parameters<typeof apiGet>[0],
  who: "a" | "b",
  role: "sent" | "received",
): Promise<TradeRow[]> {
  const token = await apiToken(request, who);
  const list = await apiGet(request, `/trade-requests?role=${role}&limit=50`, token!);
  return ((list.body as { items?: TradeRow[] })?.items ?? []) as TradeRow[];
}

/**
 * GAP-95 — the totals are computed on read now, so every row obeys the rule,
 * not just the ones priced since the deploy.
 *
 * The row that proved the bug (`TRD-6396`) is `expired` and can never be
 * re-priced, which is exactly why this is worth pinning: if the projection is
 * ever reverted to a stored column, that row goes wrong again on its own.
 */
test("every trade row carries the signed pair, however old it is", async ({
  request,
}) => {
  const sent = await trades(request, "a", "sent");
  const received = await trades(request, "b", "received");
  test.skip(sent.length === 0, "no trades on the probe accounts");

  for (const row of sent) {
    const mirror = received.find((other) => other.id === row.id);
    const label = `${row.tradeNumber ?? row.id} (${row.status})`;

    // The requester's viewer total is their own side of the measurement.
    expect(num(row.viewerTotal), `${label}: viewerTotal is not the requester's`)
      .toBeCloseTo(num(row.requesterTotal), 2);
    if (mirror) {
      expect(
        num(mirror.viewerTotal),
        `${label}: viewerTotal is not the responder's`,
      ).toBeCloseTo(num(mirror.responderTotal), 2);
    }

    // One measurement, so with cash on the row the two sides face opposite ways.
    if (num(row.counterAmount) !== 0) {
      expect(
        Math.sign(num(row.requesterTotal)),
        `${label}: both totals point the same way`,
      ).toBe(-Math.sign(num(row.responderTotal)));
      // GAP-86's null payer is projected too — nothing left for us to infer.
      expect(row.payerId, `${label}: cash on the row and no payer named`).toBeTruthy();
    }
  }
});

/**
 * GAP-96 — the payload description is now a per-type table, and this is that
 * table. A key that appears here and not in the payload is what broke the trade
 * rows' action button; a key in the payload and not here is a new one to read.
 */
const PAYLOAD_KEYS: Record<string, string[]> = {
  ORDER_PLACED: ["orderId", "orderNumber"],
  ORDER_SHIPPED: ["orderId", "orderNumber", "shipmentId"],
  ORDER_DELIVERED: ["orderId", "orderNumber", "shipmentId"],
  LISTING_SOLD: ["orderId", "orderNumber", "shipmentId"],
  AUCTION_OUTBID: ["listingId"],
  AUCTION_WON: ["listingId", "dueAt"],
  TRADE_RECEIVED: ["tradeRequestId", "tradeNumber"],
  TRADE_ACCEPTED: ["tradeRequestId", "tradeNumber"],
  NEW_MESSAGE: ["conversationId", "messageId"],
  NEW_FOLLOWER: ["userId"],
  NEW_REVIEW: ["reviewId", "listingId"],
};

test("every notification payload matches the documented table", async ({
  request,
}) => {
  const seen = new Set<string>();

  for (const who of ["a", "b"] as const) {
    const token = await apiToken(request, who);
    const rows = await apiGet(request, "/notifications?limit=50", token!);
    const items =
      ((rows.body as { items?: { type: string; payload?: Record<string, unknown> }[] })
        ?.items ?? []);

    for (const row of items) {
      const documented = PAYLOAD_KEYS[row.type];
      if (!documented) continue;
      seen.add(row.type);
      expect(
        Object.keys(row.payload ?? {}).sort(),
        `${row.type} sends keys the table does not list`,
      ).toEqual([...documented].sort());
    }
  }

  // The two the fallback used to cover — the whole of GAP-96.
  expect(seen.has("TRADE_RECEIVED"), "no trade notification to check").toBeTruthy();
});

/** GAP-93 — the trending card has a picture, resolved server-side. */
test("a trending term carries the cover of a listing it matches", async ({
  page,
  request,
}) => {
  const trending = await apiGet(request, "/search/trending");
  const rows =
    ((trending.body as { trendingSearches?: { term: string; imageUrl?: string | null }[] })
      ?.trendingSearches ?? []);
  test.skip(rows.length === 0, "no trending terms on dev");

  const withPhoto = rows.filter((row) => row.imageUrl);
  expect(
    withPhoto.length,
    "no trending term resolved to a listing photo",
  ).toBeGreaterThan(0);
  // Relative upload paths, like every other media field on this API.
  for (const row of withPhoto) expect(row.imageUrl).toMatch(/^\/uploads\//);

  await page.goto("/en/trends");
  await expectNoErrorBoundary(page);
  const cards = page.getByRole("link", { name: withPhoto[0].term });
  await expect(cards.first().locator("img")).toBeVisible();
});

/**
 * GAP-94 — the return detail carries the item's photo and the refund's three
 * rows, and `refundAmount` is the net of the other two.
 */
test("a return carries its item photo and the refund subtraction", async ({
  page,
  request,
}) => {
  const token = await apiToken(request, "b");
  const list = await apiGet(request, "/returns", token!);
  const first = ((list.body as { items?: { id: string }[] })?.items ?? [])[0];
  test.skip(!first, "no return on the buyer account — drive one first");

  const detail = await apiGet(request, `/returns/${first.id}`, token!);
  const row = detail.body as {
    returnNumber?: string;
    reason?: string;
    itemsSubtotal?: string;
    returnShippingFee?: string;
    refundAmount?: string;
    items?: {
      listingId?: string | null;
      coverPhotoUrl?: string | null;
      titleSnapshot?: string;
      listing?: { coverPhotoUrl?: string | null } | null;
    }[];
  };

  // The three rows the frame draws, and the arithmetic between them.
  expect(row.itemsSubtotal, "no itemsSubtotal on the return").toBeDefined();
  expect(row.returnShippingFee, "no returnShippingFee on the return").toBeDefined();
  expect(Number(row.refundAmount)).toBeCloseTo(
    Number(row.itemsSubtotal) - Number(row.returnShippingFee),
    2,
  );
  // Waived on the seller's-fault reasons — the same three that need photos.
  const faultReasons = ["doesnt_match_description", "damaged_defective", "not_authentic"];
  if (row.reason && faultReasons.includes(row.reason)) {
    expect(Number(row.returnShippingFee)).toBe(0);
  }

  const line = row.items?.[0];
  expect(line?.listingId, "the returned line has no listing id").toBeTruthy();
  expect(line?.coverPhotoUrl, "the returned line has no cover photo").toBeTruthy();
  expect(line?.listing?.coverPhotoUrl).toBe(line?.coverPhotoUrl);

  await signIn(page, "b");
  await page.goto(`/en/account/returns/${first.id}`);
  await expectNoErrorBoundary(page);

  // The 68px thumbnail — 651:8581 — and the panel's first row.
  await expect(page.locator("img").first()).toBeVisible();
  await expect(page.getByText("Item price")).toBeVisible();
  if (Number(row.returnShippingFee) > 0) {
    await expect(page.getByText("Return shipping")).toBeVisible();
  }
});

/** The eligibility route states the fee rather than applying it. */
test("return eligibility names the fee and what waives it", async ({ request }) => {
  const token = await apiToken(request, "b");
  const orders = await apiGet(request, "/orders?limit=20", token!);
  const delivered = ((orders.body as { items?: { id: string; status?: string }[] })
    ?.items ?? [])[0];
  test.skip(!delivered, "no order on the buyer account");

  const eligibility = await apiGet(
    request,
    `/returns/eligibility/${delivered.id}`,
    token!,
  );
  const body = eligibility.body as {
    returnShippingFee?: number;
    returnShippingWaivedFor?: string[];
    itemsSubtotal?: number;
    estimatedRefund?: number;
  };

  expect(body.returnShippingFee, "no fee stated").toBeDefined();
  expect(body.returnShippingWaivedFor).toEqual(
    expect.arrayContaining([
      "doesnt_match_description",
      "damaged_defective",
      "not_authentic",
    ]),
  );
  // Stated, not applied: the estimate is still the subtotal before deduction.
  expect(body.estimatedRefund).toBe(body.itemsSubtotal);
});
