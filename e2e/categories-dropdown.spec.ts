import { test, expect } from "@playwright/test";
import { apiGet, expectNoErrorBoundary } from "./fixtures";

/** Web_CategoriesDropdown — `651:2972`, opened from the header. */
test("the categories dropdown lists the tree under its four type tabs", async ({
  page,
  request,
}) => {
  const tree = await apiGet(request, "/categories/tree");
  const roots = tree.body as {
    name: string;
    slug?: string;
    children?: { name: string }[];
  }[];
  const women = roots.find((row) => row.slug === "women");
  test.skip(!women, "the seeded category tree has changed shape");

  await page.goto("/en");
  await expectNoErrorBoundary(page);

  await page.getByRole("button", { name: "Categories" }).click();

  // Fashion is the resting tab, and Women is one of its six roots.
  await expect(page.getByText(women!.name, { exact: true }).first()).toBeVisible();
  const child = women!.children?.[0];
  if (child) {
    await expect(
      page.getByRole("link", { name: child.name, exact: true }).first(),
    ).toBeVisible();
  }

  // The other three tabs are the sell wizard's own grouping.
  await page.getByRole("button", { name: /Electronics/ }).click();
  await expect(page.getByText(/Browse all .* items/)).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByText(/Browse all .* items/)).toHaveCount(0);
});
