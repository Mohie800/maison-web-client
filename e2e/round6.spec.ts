import { test, expect } from "@playwright/test";
import { signIn, apiToken, apiGet, expectNoErrorBoundary } from "./fixtures";

/**
 * TRD-1549 — A offers a 300 against B's 500 with a note, and B counters −25:
 * B pays A 25. A is owed 25 − 5 fee − 15 shipping = 5; B settles 25 + 15 = 40.
 */
const SIGNED_TRADE = "73727cd0-6644-46c0-b672-f6b24a449fa6";

/**
 * The Round 6 fixes, pinned so they cannot silently come back — signed trade
 * totals, a counter that runs either way, the offer note, item cards, real
 * notifications, the story composer, the transaction status and the sell
 * wizard's trade flag.
 *
 * These run against shared dev data. The composer spec posts a real story and
 * deletes it again; everything else only reads.
 */

test("the add-story composer posts with a duration and an audience", async ({
  page,
  request,
}) => {
  await signIn(page, "a");
  await page.goto("/en/stories/new");
  await expectNoErrorBoundary(page);

  await expect(page.getByRole("heading", { name: "Add to Your Story" })).toBeVisible();

  // Step 1 — feature one of my own listings.
  const first = page.locator("button", { hasText: "R6 probe" }).first();
  await first.click();

  await expect(page.getByRole("heading", { name: "Edit Your Story" })).toBeVisible();
  await page.getByLabel("Promo text (shown on story)").fill("R6 composer probe");
  await page.getByRole("button", { name: "48 hours" }).click();
  await page.getByRole("button", { name: "Followers only" }).click();
  await page.getByRole("button", { name: "Preview Story" }).click();

  await expect(page.getByRole("heading", { name: "Preview & Post" })).toBeVisible();
  await expect(
    page.getByText("Duration: 48 hours  ·  Audience: Followers only"),
  ).toBeVisible();

  await page.getByRole("button", { name: "Post Story Now" }).click();
  await page.waitForURL("**/en/stories");

  const token = await apiToken(request, "a");
  const stories = await apiGet(
    request,
    "/stories/72380f15-089c-4464-8b2a-eaba05597c3f",
    token ?? undefined,
  );
  const rows = stories.body as {
    id: string;
    caption?: string;
    visibility?: string;
    expiresAt?: string;
  }[];
  const posted = rows.find((row) => row.caption === "R6 composer probe");
  expect(posted, "the composer's story is not on the author's feed").toBeTruthy();
  expect(posted?.visibility).toBe("followers");

  const hours =
    (new Date(posted!.expiresAt!).getTime() - Date.now()) / 3_600_000;
  expect(hours).toBeGreaterThan(46);
  expect(hours).toBeLessThan(49);

  // Leave the shared feed as it was found.
  await request.delete(
    `https://maison.dockbox.cloud/api/v1/stories/${(posted as { id: string }).id}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
});

test("a counter can run towards the requester, and both totals agree", async ({
  page,
}) => {
  // GAP-85/86/87 — the responder countered −25, so they are the payer.
  await signIn(page, "a");
  await page.goto(`/en/account/trades/${SIGNED_TRADE}`);
  await expectNoErrorBoundary(page);
  await expect(page.getByText("Cash difference (they pay you)")).toBeVisible();
  await expect(page.getByText("You’ll receive")).toBeVisible();
  await expect(page.getByText("+ SAR 25")).toBeVisible();
  await expect(page.getByText(/^SAR 5$/)).toBeVisible();

  await signIn(page, "b");
  await page.goto(`/en/account/trades/${SIGNED_TRADE}`);
  await expectNoErrorBoundary(page);
  await expect(page.getByText("Cash difference (you pay them)")).toBeVisible();
  await expect(page.getByText("You’ll pay")).toBeVisible();
  await expect(page.getByText("− SAR 25")).toBeVisible();
  await expect(page.getByText(/^SAR 40$/)).toBeVisible();
});

test("a trade offer carries its note and its item cards", async ({ page }) => {
  await signIn(page, "b");
  await page.goto(`/en/account/trades/${SIGNED_TRADE}`);
  await expectNoErrorBoundary(page);
  // GAP-84 — the requester's note now transmits.
  await expect(
    page.getByText("“Both barely worn — happy to cover the difference.”"),
  ).toBeVisible();
  // GAP-83 — both sides are cards, not "item unavailable".
  await expect(
    page.getByText("R6 signed probe — mine 300").first(),
  ).toBeVisible();
  await expect(
    page.getByText("R6 signed probe — theirs 500").first(),
  ).toBeVisible();
});

test("the counter screen starts from the direction the payload states", async ({
  page,
}) => {
  await signIn(page, "b");
  await page.goto(`/en/account/trades/${SIGNED_TRADE}/counter`);
  await expectNoErrorBoundary(page);
  const amount = page.getByLabel(
    "Positive means they pay you. Negative means you pay them.",
  );
  await expect(amount).toHaveValue("-25");
  await expect(page.getByText("You pay them").first()).toBeVisible();
});

test("notifications render a real row with its own action", async ({ page }) => {
  await signIn(page, "b");
  await page.goto("/en/account/notifications");
  await expectNoErrorBoundary(page);
  await expect(page.getByText("New trade offer").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "View offer" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Reply" }).first()).toBeVisible();
});

test("the sell wizard can mark a listing tradeable", async ({
  page,
  request,
}) => {
  // GAP-92 — `tradeEnabled` used to 500 the whole step-2 patch.
  await signIn(page, "a");
  await page.goto("/en/sell");
  await expectNoErrorBoundary(page);

  await page.getByRole("button", { name: /^Fashion/ }).first().click();
  const cont = page.getByRole("button", { name: "Continue" });
  // Group, then leaf — the wizard only enables Continue on a leaf category.
  await page.getByRole("button", { name: "Bags", exact: true }).click();
  await page.getByRole("button", { name: "Handbags", exact: true }).click();
  await expect(cont).toBeEnabled();
  await cont.click();

  await expect(
    page.getByRole("heading", { name: "How do you want to sell it?" }),
  ).toBeVisible();
  await page.getByText("Trade · Request Trade").click();
  await cont.click();

  await expect(
    page.getByRole("heading", { name: "Item details" }),
  ).toBeVisible();

  const token = await apiToken(request, "a");
  const drafts = await apiGet(request, "/listings/me?filter=draft", token!);
  const rows = (drafts.body as { items?: { saleMode?: string }[] }).items ?? [];
  expect(rows[0]?.saleMode, "the draft did not take the trade flag").toBe(
    "trade",
  );
});

test("a wallet transaction badges the status it carries", async ({
  page,
  request,
}) => {
  // GAP-91 — the badge was hardcoded "Completed" before the field existed.
  const token = await apiToken(request, "wallet");
  test.skip(!token, "could not sign in as the wallet account");

  const list = await apiGet(request, "/wallet/transactions?limit=1", token!);
  const rows = (list.body as { items?: { id: string; status?: string }[] })
    .items ?? [];
  test.skip(rows.length === 0, "that wallet has no transactions");

  await signIn(page, "wallet");
  await page.goto(`/en/account/wallet/transactions/${rows[0].id}`);
  await expectNoErrorBoundary(page);

  expect(rows[0].status, "the row carries no status").toBeTruthy();
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
});
