import { test, expect } from "@playwright/test";
import { signIn, apiToken, apiGet, expectNoErrorBoundary } from "./fixtures";

/** Web_Profile_Own — `651:8984`. Your seller profile, seen as the owner. */
test("the own profile shows the account's real stats and its listed items", async ({
  page,
  request,
}) => {
  const token = await apiToken(request, "a");
  const seller = await apiGet(
    request,
    "/sellers/72380f15-089c-4464-8b2a-eaba05597c3f",
    token!,
  );
  const row = seller.body as {
    isSelf?: boolean;
    stats?: { items?: number; itemsSold?: number };
  };
  expect(row.isSelf, "the endpoint should know this is the viewer").toBe(true);

  await signIn(page, "a");
  await page.goto("/en/account/profile");
  await expectNoErrorBoundary(page);

  // Banner: the owner actions the public page does not have.
  await expect(page.getByRole("link", { name: "Edit profile" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Public page" })).toBeVisible();

  // Three stats, read off the API rather than hardcoded. "Listed" is also a
  // tab, so scope to the stat's own label class-free by using its value.
  await expect(page.getByText("Listed", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText(String(row.stats?.items ?? 0), { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("Rating", { exact: true })).toBeVisible();

  // The frame's fourth stat has no field anywhere: "Trades" is the tab, and
  // there is no stat beside Rating.
  await expect(page.getByRole("link", { name: "Trades" })).toBeVisible();

  await expect(page.getByText(/Listed items \(\d+\)/)).toBeVisible();

  // Sold is the other in-page tab.
  await page.goto("/en/account/profile?tab=sold");
  await expectNoErrorBoundary(page);
  await expect(page.getByText(/Sold items \(\d+\)/)).toBeVisible();
});
