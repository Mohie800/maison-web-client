import { test, expect } from "@playwright/test";
import { ACCOUNTS, signIn, apiToken, apiGet, expectNoErrorBoundary } from "./fixtures";

const API = "https://maison.dockbox.cloud/api/v1";
const FLASH_ON = "Vacation mode is on. Your listings are hidden.";

/**
 * WEB_03_VacationMode's "away until" control.
 *
 * `until` was written up as unsettable in the Round 8 draft and withdrawn: it
 * is on `UpdateHolidayModeDto` and works. This drives the real write, because
 * the field being wrong leaves a seller hidden from the storefront.
 *
 * It turns holiday mode on for `trade0830a@demo.maison`, whose listings other
 * specs read, so the teardown puts it back whether the test passes or not.
 */
test.describe("vacation mode", () => {
  test.afterEach(async ({ request }) => {
    const token = await apiToken(request, "a");
    if (!token) return;
    await request.put(`${API}/users/me/holiday-mode`, {
      data: { enabled: false },
      headers: { Authorization: `Bearer ${token}` },
    });
  });

  test("saves an end date, shows it, and clears it", async ({ page, request }) => {
    const token = await apiToken(request, "a");
    test.skip(!token, `could not sign in as ${ACCOUNTS.a.email}`);

    await signIn(page, "a");
    await page.goto("/en/account/settings/vacation");
    await expectNoErrorBoundary(page);

    await page.locator("#vacation-note").fill("Back mid-September.");
    await page.locator("#vacation-until").fill("2026-09-15");
    await page.locator("input[name=enabled]").check();
    await page.getByRole("button", { name: "Save" }).click();

    // Exact: the card's body copy says "vacation mode is on" and "listings are
    // hidden" too, so a substring match resolves to the wrong paragraph.
    await expect(page.getByText(FLASH_ON, { exact: true })).toBeVisible();
    await expect(page.getByText(/Back on 15 Sep/)).toBeVisible();

    const saved = await apiGet(request, "/users/me/holiday-mode", token!);
    expect(saved.body).toMatchObject({
      holidayMode: true,
      holidayModeUntil: "2026-09-15T00:00:00.000Z",
      holidayModeNote: "Back mid-September.",
    });

    // An emptied date has to be omitted from the PUT, not sent as "" (400).
    await page.locator("#vacation-until").fill("");
    await page.getByRole("button", { name: "Save" }).click();
    // Wait on the re-render, not the flash: the flash is already on screen from
    // the save before this one, so it is true before the write has landed.
    await expect(page.getByText(/Back on/)).toHaveCount(0);

    const cleared = await apiGet(request, "/users/me/holiday-mode", token!);
    expect(cleared.body).toMatchObject({
      holidayMode: true,
      holidayModeUntil: null,
    });
  });
});
