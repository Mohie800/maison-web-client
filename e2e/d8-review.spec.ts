import { test, expect } from "@playwright/test";
import { signIn, apiToken, apiGet, expectNoErrorBoundary } from "./fixtures";

/** The same delivered order the return spec uses. */
const ORDER = "76ce2428-3d08-46a1-84e8-74e9d20bef2c";

test("a review submits with its photo tiles", async ({ page, request }) => {
  const token = await apiToken(request, "b");
  const reviewable = await apiGet(
    request,
    `/reviews/orders/${ORDER}/reviewable`,
    token!,
  );
  const items = (reviewable.body as { items?: unknown[] })?.items ?? [];
  test.skip(items.length === 0, "the order's line has already been reviewed");

  await signIn(page, "b");
  await page.goto(`/en/account/orders/${ORDER}/review`);
  await expectNoErrorBoundary(page);

  // The stars are `sr-only` inputs behind their labels.
  await page.getByRole("radio", { name: "Excellent" }).check({ force: true });
  await page
    .getByRole("textbox", { name: /Your review/ })
    .fill("Arrived quickly and well packed.");
  await page
    .locator('input[name="photos"]')
    .first()
    .setInputFiles("e2e/fixture-photo.png");

  await page.getByRole("button", { name: "Submit review" }).click();
  // Web_Review_Submitted is the same route in its submitted state.
  await page.waitForURL(/\?submitted=/);
  await expectNoErrorBoundary(page);

  // The line drops out of `reviewable` once it has been reviewed.
  const after = await apiGet(
    request,
    `/reviews/orders/${ORDER}/reviewable`,
    token!,
  );
  const left = (after.body as { items?: unknown[] })?.items ?? [];
  expect(left.length, "the review did not register").toBe(0);
});
