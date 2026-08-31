import { test, expect } from "@playwright/test";
import { expectNoErrorBoundary, signIn } from "./fixtures";

/**
 * Every route renders, in both locales.
 *
 * A route returning 200 is not the same as a route working: a throwing server
 * component still answers 200 with Next's error page, which is why each check
 * also asserts the error boundary is absent.
 */
const PUBLIC_ROUTES = [
  "/",
  "/products",
  "/categories",
  "/brands",
  "/trends",
  "/auctions",
  "/trade",
  "/bundles",
  "/stories",
  "/search?q=bag",
  "/about",
  "/pricing",
  "/seller-guide",
  "/blog",
  "/help",
  "/help/contact",
  "/help/returns",
  "/help/payment",
];

const PRIVATE_ROUTES = [
  "/account",
  "/account/orders",
  "/account/wishlist",
  "/account/wallet",
  "/account/coupons",
  "/account/coupons?tab=used",
  "/email-verified",
  "/account/referrals",
  "/account/settings/vacation",
  "/account/listings",
  "/account/trades",
  "/account/trades?tab=sent",
  "/account/trades?tab=history",
  "/account/bids",
  "/account/notifications",
  "/stories/new",
  "/account/settings",
  "/inbox",
  "/inbox?filter=trade",
  "/cart",
];

for (const locale of ["en", "ar"] as const) {
  test.describe(`${locale} · public routes`, () => {
    for (const route of PUBLIC_ROUTES) {
      test(`${route} renders`, async ({ page }) => {
        const response = await page.goto(`/${locale}${route}`);
        expect(response?.status(), `${route} status`).toBeLessThan(400);
        await expectNoErrorBoundary(page);
      });
    }
  });
}

test.describe("private routes", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, "a");
  });

  for (const route of PRIVATE_ROUTES) {
    test(`${route} renders signed in`, async ({ page }) => {
      const response = await page.goto(`/en${route}`);
      expect(response?.status(), `${route} status`).toBeLessThan(400);
      await expectNoErrorBoundary(page);
    });
  }

  test("Arabic account pages render right-to-left", async ({ page }) => {
    await page.goto("/ar/account/trades");
    await expectNoErrorBoundary(page);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });
});

test("a signed-out visitor is sent to sign-in from a private route", async ({
  page,
}) => {
  await page.goto("/en/account/orders");
  await expect(page).toHaveURL(/\/en\/sign-in/);
});

test("the trade hub is public", async ({ page }) => {
  // /trade/offer and /trade/sent are gated; the hub itself is not.
  const response = await page.goto("/en/trade");
  expect(response?.status()).toBeLessThan(400);
  await expect(page).toHaveURL(/\/en\/trade$/);
});
