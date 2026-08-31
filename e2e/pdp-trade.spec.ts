import { test, expect } from "@playwright/test";
import { apiGet, expectNoErrorBoundary } from "./fixtures";

/**
 * Web_PDP_Trade — `651:4611`. The PDP with its buy column replaced: a trade
 * listing is not for sale, so it prints an estimated value rather than a price
 * and offers Request trade rather than Buy now.
 */
test("a trade listing's PDP offers a swap, not a purchase", async ({
  page,
  request,
}) => {
  const listings = await apiGet(
    request,
    "/listings?saleMode=trade&status=live&limit=1",
  );
  const row = (listings.body as { items: { id: string; title: string }[] })
    .items[0];
  test.skip(!row, "no live trade listing on the environment");

  await page.goto(`/en/products/${row.id}`);
  await expectNoErrorBoundary(page);

  await expect(page.getByText("TRADE", { exact: true })).toBeVisible();
  await expect(page.getByText("Estimated value")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Request trade" }),
  ).toHaveAttribute("href", new RegExp(`/trade/offer/${row.id}$`));
  await expect(page.getByText("Trade shipping")).toBeVisible();

  // A trade listing cannot be bought.
  await expect(page.getByRole("link", { name: "Buy now" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Add to bag" })).toHaveCount(0);
});

test("a fixed-price listing still offers a purchase", async ({
  page,
  request,
}) => {
  const listings = await apiGet(
    request,
    "/listings?saleMode=fixed&status=live&limit=1",
  );
  const row = (listings.body as { items: { id: string }[] }).items[0];
  test.skip(!row, "no live fixed-price listing on the environment");

  await page.goto(`/en/products/${row.id}`);
  await expectNoErrorBoundary(page);
  await expect(page.getByRole("link", { name: "Buy now" })).toBeVisible();
  await expect(page.getByText("Estimated value")).toHaveCount(0);
});
