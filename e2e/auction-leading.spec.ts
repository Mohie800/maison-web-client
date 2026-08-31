import { test, expect } from "@playwright/test";
import { signIn, apiToken, apiGet, expectNoErrorBoundary } from "./fixtures";

/**
 * PDP_Auction_HighestBidder — `651:4802`.
 *
 * The auction PDP when the viewer is leading: the chip becomes a banner, the
 * panel takes the success tint, and the bid history names the viewer's own
 * rows. Account a outbid account b on this lot on 2026-08-31.
 */
test("the auction PDP tells the leading bidder they are leading", async ({
  page,
  request,
}) => {
  const token = await apiToken(request, "a");
  const auctions = await apiGet(
    request,
    "/listings?saleMode=auction&status=live&limit=10",
  );
  const rows = (auctions.body as { items: { id: string }[] }).items ?? [];

  let leading: string | null = null;
  for (const row of rows) {
    const status = await apiGet(
      request,
      `/listings/${row.id}/auction-status`,
      token!,
    );
    if ((status.body as { viewer?: { isLeading?: boolean } })?.viewer?.isLeading) {
      leading = row.id;
      break;
    }
  }
  test.skip(!leading, "account a is not leading any live auction");

  await signIn(page, "a");
  await page.goto(`/en/products/${leading}`);
  await expectNoErrorBoundary(page);

  await expect(page.getByText("You’re the highest bidder!")).toBeVisible();
  await expect(page.getByText(/Your bid of .* is currently leading/)).toBeVisible();

  // Bid History — the viewer's own rows are named, everyone else is a pseudonym.
  await expect(page.getByText(/Bid History \(\d+ bids\)/)).toBeVisible();
  await expect(page.getByText(/^You \(/).first()).toBeVisible();
  await expect(page.getByText(/^Bidder \d+$/).first()).toBeVisible();
});
