import { test, expect } from "@playwright/test";
import { signIn, apiToken, apiGet, expectNoErrorBoundary } from "./fixtures";

/**
 * The return and review flows, driven against a delivered order.
 *
 * Both were finished code that had never run: `POST /returns` and `POST
 * /reviews` refuse anything that has not been delivered, and no order on dev
 * ever had been (D8). The order below was driven placed → packed → shipped →
 * delivered from the client's own accounts on 2026-08-31.
 */
const ORDER = "76ce2428-3d08-46a1-84e8-74e9d20bef2c";

test("a fault return submits with its evidence photos", async ({
  page,
  request,
}) => {
  const token = await apiToken(request, "b");
  const existing = await apiGet(request, "/returns", token!);
  test.skip(
    ((existing.body as { total?: number }).total ?? 0) > 0,
    "a return already exists on this account — the order can only be returned once",
  );

  await signIn(page, "b");
  await page.goto(`/en/account/orders/${ORDER}/return`);
  await expectNoErrorBoundary(page);

  // "Item arrived damaged" is one of the three the API demands photos for.
  await page.getByRole("radio", { name: "Item arrived damaged" }).check();
  await page
    .locator('input[name="evidencePhotos"]')
    .first()
    .setInputFiles("e2e/fixture-photo.png");

  await page.getByRole("button", { name: "Submit Return Request" }).click();
  await page.waitForURL(/\/account\/returns\//);
  await expectNoErrorBoundary(page);

  const created = await apiGet(request, "/returns", token!);
  const rows = (created.body as { items: { id: string }[] }).items;
  expect(rows.length, "no return was created").toBeGreaterThan(0);

  const detail = await apiGet(request, `/returns/${rows[0].id}`, token!);
  expect(detail.ok, `GET /returns/{id} answered ${detail.status}`).toBeTruthy();
  const row = detail.body as { evidencePhotos?: string[] };
  expect(
    row.evidencePhotos?.length,
    "the evidence photo did not reach the return",
  ).toBeGreaterThan(0);
});

test("the order notification types render with their own destinations", async ({
  page,
}) => {
  // ORDER_PLACED / ORDER_SHIPPED / ORDER_DELIVERED only exist once an order has
  // been driven to delivered, which is what this file's fixture order is for.
  await signIn(page, "b");
  await page.goto("/en/account/notifications?category=orders");
  await expectNoErrorBoundary(page);

  await expect(
    page.getByText("Your order has been shipped").first(),
  ).toBeVisible();
  await expect(page.getByText("Your order arrived").first()).toBeVisible();
  const track = page.getByRole("link", { name: "Track order" }).first();
  await expect(track).toBeVisible();
  await expect(track).toHaveAttribute("href", /\/account\/orders\//);
});
