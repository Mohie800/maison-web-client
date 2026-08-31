import { test, expect } from "@playwright/test";
import { signIn, apiGet, expectNoErrorBoundary } from "./fixtures";

/** 01_Search — `651:2352`, the header search panel and its four states. */

test("the search panel opens on its trending state and searches all three tabs", async ({
  page,
  request,
}) => {
  // Trending is driven by real searches, so the terms change — read them.
  const trending = await apiGet(request, "/search/trending");
  const first = (
    trending.body as { trendingSearches?: { term: string }[] }
  ).trendingSearches?.[0];

  await page.goto("/en");
  await expectNoErrorBoundary(page);

  const box = page.getByRole("searchbox").first();
  await box.click();
  // Scope every assertion to the panel — the page behind it has the same words.
  const panel = page.getByRole("listbox");

  // 01_Search_Empty — trending is public, so it renders signed out.
  await expect(panel.getByText("TRENDING NOW")).toBeVisible();
  if (first) {
    await expect(
      panel.getByRole("button", { name: new RegExp(first.term, "i") }).first(),
    ).toBeVisible();
  }

  // 02_Search_Products
  await box.fill("jacket");
  await expect(panel.getByText(/See all .* results for/)).toBeVisible();

  // 03_Search_People
  await panel.getByRole("button", { name: "People", exact: true }).click();
  await box.fill("trade");
  await expect(panel.getByText("@tradeprobea").first()).toBeVisible();

  // 04_Search_Brands
  await panel.getByRole("button", { name: "Brands", exact: true }).click();
  await box.fill("zara");
  await expect(panel.getByText(/items/).first()).toBeVisible();

  // Escape closes it and leaves the page alone.
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
});

test("search still submits to the results page", async ({ page }) => {
  await signIn(page, "b");
  await page.goto("/en");
  const box = page.getByRole("searchbox").first();
  await box.fill("bag");
  await box.press("Enter");
  await page.waitForURL(/\/search\?q=bag/);
  await expectNoErrorBoundary(page);
});
