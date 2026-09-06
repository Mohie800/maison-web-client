import { test, expect } from "@playwright/test";
import { apiToken, expectNoErrorBoundary, signIn } from "./fixtures";

/**
 * The Vendor Portal shell and dashboard — Figma `651:13488`.
 *
 * Pins the things that were decided rather than derived: the portal opens for an
 * `accountType: individual` account (the API allows it, so the route group gates
 * on a session alone), the dashboard renders the server's own metrics, and the
 * 7D/30D/90D control actually re-queries rather than being the frame's flat text.
 */
const API = "https://maison.dockbox.cloud/api/v1";

test.describe("Vendor Portal", () => {
  test("signed out, /vendor redirects to sign-in", async ({ page }) => {
    await page.goto("/en/vendor");
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("the portal opens for an individual account", async ({ page, request }) => {
    const token = await apiToken(request, "a");
    test.skip(!token, "fixture account a could not sign in");

    const me = await request.get(`${API}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(
      (await me.json()).accountType,
      "this test is only meaningful for a non-business account",
    ).toBe("individual");

    await signIn(page, "a");
    await page.goto("/en/vendor");
    await expectNoErrorBoundary(page);

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /Good (morning|afternoon|evening),/,
    );
    // The rail, and the way back out of it.
    await expect(
      page.getByRole("link", { name: "Switch to Buyer View" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "My Products" }),
    ).toBeVisible();
  });

  test("the dashboard renders the server's own metrics", async ({
    page,
    request,
  }) => {
    const token = await apiToken(request, "a");
    test.skip(!token, "fixture account a could not sign in");

    const dash = await request
      .get(`${API}/vendor-portal/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => r.json());

    /*
      Round 9 made `followers` a dashboard metric and gave every metric an
      absolute `change` (GAP-109), which retired the `/sellers/{id}` join and
      the percentage-only badges. Asserting the fields exist is what catches a
      silent revert — the screen would fall back to zeros and still render.
    */
    expect(dash.followers, "followers should be a dashboard metric").toBeTruthy();
    expect(typeof dash.orders.change, "counts need an absolute delta").toBe("number");
    expect(typeof dash.avgDailyRevenue, "avg daily revenue is server-side").toBe("number");

    await signIn(page, "a");
    await page.goto("/en/vendor");
    await expect(page.getByText("Followers", { exact: true })).toBeVisible();
    await expect(
      page.getByText(String(dash.products.value), { exact: true }).first(),
    ).toBeVisible();
  });

  test("the range control re-queries the sales window", async ({
    page,
    request,
  }) => {
    const token = await apiToken(request, "a");
    test.skip(!token, "fixture account a could not sign in");

    await signIn(page, "a");
    await page.goto("/en/vendor");

    /* The chart well is the only .bg-vp-panel on the page; its last child is
       the bar row. Anchored on that rather than a height class, which changed
       when the chart gained its tall variant. */
    const bars = page.locator("div.bg-vp-panel > div:last-of-type > span");
    const thirty = await bars.count();
    expect(thirty, "30D should draw roughly a month of bars").toBeGreaterThan(20);

    await page.getByRole("link", { name: "7D", exact: true }).click();
    await expect(page).toHaveURL(/range=7d/);
    await expectNoErrorBoundary(page);

    const seven = await page
      .locator("div.bg-vp-panel > div:last-of-type > span")
      .count();
    expect(seven, "7D should draw a week of bars").toBeLessThan(thirty);
    expect(seven).toBeLessThanOrEqual(8);
  });
});

/**
 * The rest of Flow 15: every screen renders for a real seller, the reports are
 * real files, and the features Round 9 unblocked keep working.
 */
test.describe("Vendor Portal — the other screens", () => {
  const ROUTES = [
    "/en/vendor/products",
    "/en/vendor/orders",
    "/en/vendor/analytics",
    "/en/vendor/analytics/sales",
    "/en/vendor/analytics/customers",
    "/en/vendor/analytics/top-products",
    "/en/vendor/store",
    "/en/vendor/store/edit",
    "/en/vendor/store/settings",
    "/en/vendor/reviews",
    "/en/vendor/payouts",
    "/en/vendor/reports",
    "/en/vendor/discounts",
    "/en/vendor/discounts/new",
  ];

  for (const route of ROUTES) {
    test(`${route} renders`, async ({ page }) => {
      await signIn(page, "a");
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expectNoErrorBoundary(page);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });
  }

  test("payouts shows the wallet balance, which the portal now agrees with", async ({
    page,
    request,
  }) => {
    const token = await apiToken(request, "a");
    test.skip(!token, "fixture account a could not sign in");
    const headers = { Authorization: `Bearer ${token}` };

    const [wallet, portal] = await Promise.all([
      request.get(`${API}/wallet`, { headers }).then((r) => r.json()),
      request
        .get(`${API}/vendor-portal/payouts/summary`, { headers })
        .then((r) => r.json()),
    ]);

    /*
      Round 9 pointed the portal endpoints at the wallet ledger (GAP-106); they
      used to disagree by SAR 1,180. Asserting they match is what would catch a
      regression to the old behaviour — the screen reads the wallet either way.
    */
    expect(portal.availableBalance).toBe(wallet.balance);

    await signIn(page, "a");
    await page.goto("/en/vendor/payouts");
    await expect(
      page.getByText(String(wallet.balance).replace(/\B(?=(\d{3})+(?!\d))/g, ","), {
        exact: false,
      }).first(),
    ).toBeVisible();
  });

  test("the report downloads are real CSV files", async ({ page }) => {
    await signIn(page, "a");
    for (const type of [
      "sales",
      "orders",
      "payments",
      "inventory",
      "customers",
      "tax",
    ]) {
      const response = await page.request.get(`/api/vendor/reports/${type}`);
      expect(response.status(), `${type} report`).toBe(200);
      expect(response.headers()["content-type"]).toContain("text/csv");
      const body = await response.text();
      // A header row at minimum, and no HTML error page.
      expect(body.split("\r\n")[0].length, `${type} header`).toBeGreaterThan(5);
      expect(body).not.toContain("<html");
    }
  });

  test("reports refuse an anonymous caller", async ({ request }) => {
    const response = await request.get("/api/vendor/reports/sales");
    expect(response.status()).toBe(401);
  });

  test("the tax report names its rate and collector", async ({ page }) => {
    await signIn(page, "a");
    const csv = await (await page.request.get("/api/vendor/reports/tax")).text();
    const header = csv.split("\r\n")[0];
    /*
      The platform fee and VAT are both 15% and are different money (GAP-115).
      The header has to say which is which, or a seller could file the
      platform's commission as their own tax.
    */
    expect(header).toContain("VAT (15%, collected by platform)");
    expect(header).toContain("Platform fee (15%)");
  });

  test("top products can be re-sorted", async ({ page }) => {
    await signIn(page, "a");
    await page.goto("/en/vendor/analytics/top-products");
    await page.getByRole("link", { name: "Units Sold", exact: true }).click();
    await expect(page).toHaveURL(/sort=units_sold/);
    await expectNoErrorBoundary(page);
    // The category label is the other half of GAP-113.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("reviews filter by a real date window", async ({ page }) => {
    await signIn(page, "a");
    await page.goto("/en/vendor/reviews");
    await page.getByRole("link", { name: "30 days", exact: true }).click();
    await expect(page).toHaveURL(/window=30d/);
    await expectNoErrorBoundary(page);
  });

  test("the store form saves a bio and reads it back", async ({ page, request }) => {
    const token = await apiToken(request, "a");
    test.skip(!token, "fixture account a could not sign in");
    const stamp = `e2e bio ${Date.now().toString().slice(-6)}`;

    await signIn(page, "a");
    await page.goto("/en/vendor/store/edit");
    await page.fill('textarea[name="bio"]', stamp);
    await Promise.all([
      page.waitForURL(/\/vendor\/store$/),
      page.getByRole("button", { name: "Save" }).click(),
    ]);

    /* GAP-116: the field is writable now, so it must survive a round trip. */
    const me = await request
      .get(`${API}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json());
    const seller = await request
      .get(`${API}/sellers/${me.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json());
    expect(seller.bio).toBe(stamp);
  });

  test("a discount can be created and deleted from the portal", async ({ page }) => {
    await signIn(page, "a");
    const code = `E2E${Date.now().toString().slice(-6)}`;

    await page.goto("/en/vendor/discounts/new");
    await page.fill('input[name="code"]', code);
    await page.fill('input[name="discountValue"]', "10");
    await page.fill('input[name="name"]', "e2e probe discount");
    await Promise.all([
      page.waitForURL(/\/vendor\/discounts$/),
      page.click('button[type="submit"]'),
    ]);
    await expect(page.getByText(code, { exact: true })).toBeVisible();

    // Clean up through the UI, so the spec leaves no rows behind.
    const row = page.locator("div.rounded-12", {
      has: page.getByText(code, { exact: true }),
    });
    await row.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText(code, { exact: true })).toHaveCount(0);
  });
});
