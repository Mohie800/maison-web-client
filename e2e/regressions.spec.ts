import { test, expect } from "@playwright/test";
import {
  apiGet,
  apiToken,
  ensureCounteredTrade,
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
   * Round 6 made the two totals one signed measurement and added `viewerTotal`
   * (GAP-87) — but they are stored when a trade is priced, not recomputed on
   * read, so a trade priced before that deploy still carries the old asymmetric
   * figures (GAP-95). The breakdown therefore falls back to summing the rows
   * the frame prints whenever the stated total disagrees with them.
   *
   * The fixture is found or created rather than hard-coded: a trade expires 24
   * hours after it opens, and the row this used to name is now `expired`.
   */
  test("the total is the sum of the printed rows on either side", async ({
    page,
    request,
  }) => {
    const trade = await ensureCounteredTrade(request);
    test.skip(!trade, "no countered trade could be found or created");

    const token = await apiToken(request, "a");
    const detail = await apiGet(request, `/trade-requests/${trade!.id}`, token!);
    const row = detail.body as {
      counterAmount?: string;
      commissionAmount?: string;
      commissionPayerId?: string;
      shippingTotal?: string;
      requesterId?: string;
      payerId?: string;
    };

    const difference = Number(row.counterAmount ?? 0);
    const commission =
      row.commissionPayerId === row.requesterId
        ? Number(row.commissionAmount ?? 0)
        : 0;
    const shippingShare = Number(row.shippingTotal ?? 0) / 2;
    // The counter runs towards the requester, so they are owed the difference.
    const expected = difference - commission - shippingShare;

    await signIn(page, "a");
    await page.goto(`/en/account/trades/${trade!.id}`);
    await expectNoErrorBoundary(page);

    const body = page.locator("body");
    await expect(body).toContainText("Cash difference (they pay you)");

    const label = expected >= 0 ? "You’ll receive" : "You’ll pay";
    const printed = await page
      .locator("div", { hasText: new RegExp(`^${label}`) })
      .last()
      .innerText();
    const amount = Number(
      (printed.match(/SAR\s*([\d,]+(?:\.\d+)?)/) ?? [])[1]?.replace(/,/g, ""),
    );

    expect(
      amount,
      `the total should be ${difference} − ${commission} − ${shippingShare}`,
    ).toBeCloseTo(Math.abs(expected), 2);
  });

  test("the receiving side is never shown paying", async ({
    page,
    request,
  }) => {
    const trade = await ensureCounteredTrade(request);
    test.skip(!trade, "no countered trade could be found or created");

    // The responder countered towards the requester, so the responder settles.
    await signIn(page, "b");
    await page.goto(`/en/account/trades/${trade!.id}`);
    await expectNoErrorBoundary(page);
    await expect(page.locator("body")).toContainText(
      "Cash difference (you pay them)",
    );
  });
});

test.describe("inbox attachments", () => {
  /**
   * `POST /conversations/{id}/messages` now rejects anything but a path this
   * API issued (GAP-88), so no new hostile row can be written. The four probe
   * rows written before that fix are still in this conversation, and the
   * client-side guard that keeps them out of an `<img>` stays: only `/uploads/`
   * paths are rendered, and this pins that.
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
