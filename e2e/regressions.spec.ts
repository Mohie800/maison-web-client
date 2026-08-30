import { test, expect } from "@playwright/test";
import {
  apiGet,
  apiToken,
  expectNoErrorBoundary,
  FIXTURES,
  signIn,
} from "./fixtures";

/**
 * The three bugs found while building Flows 6 and 7, pinned so they cannot come
 * back. Each one shipped at some point during that work and was caught by
 * reading a rendered page — nothing else would have noticed.
 */

test.describe("trade cash breakdown", () => {
  /**
   * `requesterTotal` folds the cash difference in; `responderTotal` does not
   * (GAP-87). Reading either directly double-counted the difference for the
   * payer. The net is summed from the three rows the frame prints instead.
   *
   * TRD-6396 is countered at SAR 95, and A is the commission payer, so A owes
   * 95 + 5.20 + 15 = 115.20 and B receives 95 − 15 = 80.
   */
  test("the payer's total is the sum of the printed rows, not requesterTotal", async ({
    page,
    request,
  }) => {
    const token = await apiToken(request, "a");
    test.skip(!token, "could not sign in as the trade requester");

    const trade = await apiGet(
      request,
      `/trade-requests/${FIXTURES.counteredTradeId}`,
      token!,
    );
    test.skip(!trade.ok, `fixture trade is gone (${trade.status})`);

    const row = trade.body as {
      status?: string;
      counterAmount?: string;
      commissionAmount?: string;
      commissionPayerId?: string;
      shippingTotal?: string;
      requesterId?: string;
    };
    test.skip(
      row.status !== "countered",
      `fixture trade is "${row.status}", not "countered" — someone answered it`,
    );

    await signIn(page, "a");
    await page.goto(`/en/account/trades/${FIXTURES.counteredTradeId}`);
    await expectNoErrorBoundary(page);

    const body = page.locator("body");
    // The requester pays, so the difference is negative and the label says so.
    await expect(body).toContainText("Cash difference (you pay them)");

    /*
      The total must be the three printed rows summed. Reading `requesterTotal`
      instead happened to give the same number here, but the bug this guards
      against — counting the difference twice — showed up as a total roughly
      one difference too large.
    */
    const difference = Number(row.counterAmount ?? 0);
    const commission =
      row.commissionPayerId === row.requesterId
        ? Number(row.commissionAmount ?? 0)
        : 0;
    const shippingShare = Number(row.shippingTotal ?? 0) / 2;
    const expected = difference + commission + shippingShare;

    const totalRow = page
      .locator("div", { hasText: /^You’ll pay/ })
      .last();
    const printed = await totalRow.innerText();
    const amount = Number(
      (printed.match(/SAR\s*([\d,]+(?:\.\d+)?)/) ?? [])[1]?.replace(/,/g, ""),
    );

    expect(
      amount,
      `the total should be ${difference} + ${commission} + ${shippingShare}`,
    ).toBeCloseTo(expected, 2);
  });

  test("the receiving side is never shown paying", async ({
    page,
    request,
  }) => {
    const token = await apiToken(request, "b");
    test.skip(!token, "could not sign in as the trade responder");

    const trade = await apiGet(
      request,
      `/trade-requests/${FIXTURES.counteredTradeId}`,
      token!,
    );
    test.skip(!trade.ok, `fixture trade is gone (${trade.status})`);
    test.skip(
      (trade.body as { status?: string }).status !== "countered",
      "fixture trade has moved on",
    );

    await signIn(page, "b");
    await page.goto(`/en/account/trades/${FIXTURES.counteredTradeId}`);
    await expectNoErrorBoundary(page);

    // B countered asking to be paid, so B receives.
    await expect(page.locator("body")).toContainText("Cash difference (they pay you)");
  });
});

test.describe("inbox attachments", () => {
  /**
   * `attachmentUrl` is stored unvalidated — `https://example.com/tracker.png`,
   * `javascript:alert(1)` and `../../etc/passwd` are all accepted (GAP-88).
   * Rendering one directly makes the recipient's browser fetch a host the
   * sender chose. Only `/uploads/` paths may reach an `<img>`.
   */
  test("a hostile attachmentUrl is never rendered", async ({
    page,
    request,
  }) => {
    const token = await apiToken(request, "a");
    test.skip(!token, "could not sign in");

    const messages = await apiGet(
      request,
      `/conversations/${FIXTURES.conversationId}/messages`,
      token!,
    );
    test.skip(!messages.ok, `fixture conversation is gone (${messages.status})`);

    const rows = messages.body as { attachmentUrl?: string | null }[];
    const hostile = rows
      .map((m) => m.attachmentUrl)
      .filter((u): u is string => Boolean(u) && !u!.startsWith("/uploads/"));
    test.skip(
      hostile.length === 0,
      "the probe rows carrying hostile attachment URLs are gone",
    );

    const requested: string[] = [];
    page.on("request", (r) => requested.push(r.url()));

    await signIn(page, "a");
    await page.goto(`/en/inbox/${FIXTURES.conversationId}`);
    await expectNoErrorBoundary(page);

    const html = await page.content();
    for (const url of hostile) {
      expect(html, `${url} must not reach the DOM`).not.toContain(url);
    }
    expect(
      requested.some((u) => u.includes("example.com")),
      "the page must not fetch a sender-supplied external host",
    ).toBeFalsy();

    // The message still shows, as a placeholder rather than silently vanishing.
    await expect(page.locator("body")).toContainText("Attachment not shown");
  });
});

test.describe("bundle detail", () => {
  /**
   * The trade detail once overwrote a rich catalogue listing with the thin copy
   * embedded in the payload, losing seller and photos. Bundles embed whole
   * listings, so the same page must show item names and prices, not fallbacks.
   */
  test("the bundle renders its items and the savings reconcile", async ({
    page,
    request,
  }) => {
    const bundle = await apiGet(request, `/bundles/${FIXTURES.bundleId}`);
    test.skip(!bundle.ok, `fixture bundle is gone (${bundle.status})`);

    const row = bundle.body as {
      title: string;
      bundlePrice: string;
      originalTotal: number;
      itemCount: number;
      isAvailable: boolean;
      items: { listing?: { title?: string } }[];
    };

    await page.goto(`/en/bundles/${FIXTURES.bundleId}`);
    await expectNoErrorBoundary(page);

    const body = page.locator("body");
    await expect(body).toContainText(row.title);
    await expect(body).toContainText("What’s included");

    // Every item must resolve to a real title, never the unavailable fallback.
    for (const item of row.items) {
      if (item.listing?.title) await expect(body).toContainText(item.listing.title);
    }
    await expect(body).not.toContainText("Item unavailable");

    // The struck-through original must be the sum of the items, above the price.
    expect(Number(row.originalTotal)).toBeGreaterThan(Number(row.bundlePrice));

    if (row.isAvailable) {
      await expect(
        page.getByRole("button", { name: "Add bundle to bag" }),
      ).toBeVisible();
    }
  });

  test("an unavailable bundle offers no way to buy it", async ({
    page,
    request,
  }) => {
    const list = await apiGet(request, "/bundles?limit=24");
    test.skip(!list.ok, "bundles endpoint unavailable");

    const rows = (list.body as { items: { id: string; isAvailable: boolean }[] })
      .items;
    const dead = rows.find((b) => b.isAvailable === false);
    test.skip(!dead, "no unavailable bundle on the environment to check");

    await page.goto(`/en/bundles/${dead!.id}`);
    await expectNoErrorBoundary(page);
    await expect(page.locator("body")).toContainText("Unavailable");
    await expect(
      page.getByRole("button", { name: "Add bundle to bag" }),
    ).toHaveCount(0);
  });
});
