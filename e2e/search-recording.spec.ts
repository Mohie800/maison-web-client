import { test, expect } from "@playwright/test";
import { expectNoErrorBoundary } from "./fixtures";

/**
 * A submitted search records itself: one recent row in this browser, and one
 * call to `GET /search?q=` — the only endpoint that increments a trending term
 * (plans/09 C32). Neither happens while typing.
 *
 * The term is an existing measured one, so a run adds a count to a term dev
 * already has rather than inventing a new row in the trending list.
 */
const TERM = "jacket";

test("a submitted search is counted once and remembered", async ({ page }) => {
  const counted: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/api/proxy/search") counted.push(url.search);
  });

  await page.goto("/en");
  await expectNoErrorBoundary(page);

  const box = page.getByRole("searchbox", { name: /search/i }).first();
  await box.click();
  await box.fill(TERM);

  // The panel queries as you type — but never the endpoint that counts.
  await expect(page.getByRole("listbox")).toBeVisible();
  expect(counted, "a keystroke reached the counted endpoint").toEqual([]);

  await box.press("Enter");
  await page.waitForURL(/\/search\?q=/);
  await expectNoErrorBoundary(page);

  await expect
    .poll(() => counted.length, { message: "the search was never counted" })
    .toBe(1);
  expect(counted[0]).toContain(`q=${TERM}`);

  // Recent — 651:2365 — is this browser's list, so it survives the navigation.
  const reopened = page.getByRole("searchbox", { name: /search/i }).first();
  await reopened.click();
  const panel = page.getByRole("listbox");
  await expect(panel.getByText("RECENT SEARCHES")).toBeVisible();
  await expect(panel.getByRole("button", { name: TERM, exact: true })).toBeVisible();

  // Paging or filtering the same term must not count it again.
  await page.keyboard.press("Escape");
  await page.goto(`/en/search?q=${TERM}&condition=like_new`);
  await expectNoErrorBoundary(page);
  expect(counted.length, "a filter change counted the term twice").toBe(1);
});

test("a remembered search can be removed", async ({ page }) => {
  await page.goto(`/en/search?q=${TERM}`);
  await expectNoErrorBoundary(page);

  const box = page.getByRole("searchbox", { name: /search/i }).first();
  await box.click();
  const panel = page.getByRole("listbox");
  const row = panel.getByRole("button", { name: TERM, exact: true });
  await expect(row).toBeVisible();

  await panel.getByRole("button", { name: "Remove" }).first().click();
  await expect(row).toBeHidden();

  // Gone from storage, not just from the rendered list. Leaving the results
  // page first, because landing on it again would record the term afresh.
  await page.goto("/en");
  await page.getByRole("searchbox", { name: /search/i }).first().click();
  await expect(
    page.getByRole("listbox").getByRole("button", { name: TERM, exact: true }),
  ).toBeHidden();
});
