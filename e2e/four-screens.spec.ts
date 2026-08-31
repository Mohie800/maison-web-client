import { test, expect } from "@playwright/test";
import { signIn, apiToken, apiGet, expectNoErrorBoundary } from "./fixtures";

/** The four screens the 2026-08-31 screen-map sweep found unbuilt. */

test("a bad URL renders Web_404_Error, not Next's default", async ({ page }) => {
  const res = await page.goto("/en/this-page-does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.getByText("Page not found")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Go to Homepage" }),
  ).toBeVisible();
  // `651:16393` is the centred block alone — the frame draws no chrome.
  await expect(
    page.getByRole("link", { name: "Browse Categories" }),
  ).toBeVisible();
});

test("Refer a Friend renders the account's real code and stats", async ({
  page,
  request,
}) => {
  const token = await apiToken(request, "a");
  const me = await apiGet(request, "/referrals/me", token!);
  const data = me.body as {
    referralCode?: string;
    stats?: { currency?: string; completedReferrals?: number };
  };
  test.skip(!data?.referralCode, "no referral code issued for this account");

  await signIn(page, "a");
  await page.goto("/en/account/referrals");
  await expectNoErrorBoundary(page);

  await expect(page.getByText(data.referralCode!)).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Make a Referral" }),
  ).toBeVisible();
  await expect(page.getByText("Friends joined")).toBeVisible();
});

test("vacation mode round-trips through the API", async ({ page, request }) => {
  await signIn(page, "a");
  await page.goto("/en/account/settings/vacation");
  await expectNoErrorBoundary(page);

  const toggle = page.getByRole("checkbox");
  await toggle.check();
  await page.getByLabel("Note for shoppers (optional)").fill("Back Tuesday.");
  await page.getByRole("button", { name: "Save" }).click();
  await page.waitForURL(/saved=1/);

  const token = await apiToken(request, "a");
  await expect
    .poll(async () => {
      const res = await apiGet(request, "/users/me/holiday-mode", token!);
      return (res.body as { holidayMode?: boolean }).holidayMode;
    })
    .toBe(true);
  await expect(page.getByText("Back Tuesday.")).toBeVisible();

  // Put it back — this is a shared account. The URL already carries `saved=1`,
  // so poll the API rather than waiting for a URL that cannot change.
  await toggle.uncheck();
  await page.getByRole("button", { name: "Save" }).click();
  await expect
    .poll(async () => {
      const res = await apiGet(request, "/users/me/holiday-mode", token!);
      return (res.body as { holidayMode?: boolean }).holidayMode;
    })
    .toBe(false);
});

test("settings gains the rows the third Web_Settings frame adds", async ({
  page,
}) => {
  await signIn(page, "a");
  await page.goto("/en/account/settings");
  await expectNoErrorBoundary(page);

  await expect(page.getByRole("link", { name: /Vacation mode/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Refer a friend/ })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Change password/ }),
  ).toBeVisible();
});
