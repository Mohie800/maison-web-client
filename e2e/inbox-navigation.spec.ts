import { test, expect } from "@playwright/test";
import { signIn, expectNoErrorBoundary } from "./fixtures";

/**
 * Moving between conversations must not redraw the whole screen.
 *
 * `/inbox` and `/inbox/[id]` render one two-pane shell, and the segment's
 * `loading.tsx` sat above both — so every thread opened replaced the heading,
 * the filter chips and the rail with bones for as long as four requests took.
 * The fallback now belongs to the `(index)` group, and the thread pane streams
 * behind its own `<Suspense>`.
 *
 * The rail is the assertion: if the route-level fallback ever comes back, the
 * heading and the rows go with it.
 */
test("opening another conversation leaves the rail on screen", async ({
  page,
}) => {
  await signIn(page, "b");
  await page.goto("/en/inbox");
  await expectNoErrorBoundary(page);

  const heading = page.getByRole("heading", { name: "Inbox" });
  await expect(heading).toBeVisible();

  const rows = page.locator('a[href*="/inbox/"]');
  const count = await rows.count();
  test.skip(count < 2, "needs two conversations on this account");

  const first = rows.first();
  const second = rows.nth(1);
  const secondHref = await second.getAttribute("href");

  await first.click();
  await page.waitForURL(/\/inbox\/[0-9a-f-]{36}/);
  await expectNoErrorBoundary(page);

  // Now the part that used to blank: watch the rail across the next navigation.
  const watch = (async () => {
    for (let i = 0; i < 25; i++) {
      expect(
        await heading.isVisible(),
        "the heading disappeared — a route-level fallback replaced the shell",
      ).toBe(true);
      expect(
        await rows.first().isVisible(),
        "the conversation rail disappeared while opening a thread",
      ).toBe(true);
      await page.waitForTimeout(40);
    }
  })();

  await second.click();
  await watch;

  await page.waitForURL(/\/inbox\/[0-9a-f-]{36}/);
  await expectNoErrorBoundary(page);
  // The thread that was asked for is the one that ends up open. The filter
  // chips carry `aria-current` too, so this asks the rail specifically.
  await expect(
    page.locator('a[href*="/inbox/"][aria-current="page"]'),
  ).toHaveAttribute("href", secondHref!);
});
