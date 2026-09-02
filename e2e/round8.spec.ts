import { test, expect, type APIRequestContext } from "@playwright/test";
import {
  apiGet,
  apiToken,
  ensureTradePreferenceListing,
  expectNoErrorBoundary,
  signIn,
} from "./fixtures";

/**
 * The Round 8 fixes, pinned: the viewer's own like on a listing row (GAP-100),
 * what a trade listing wants back (GAP-97), and the referral reward's currency
 * (GAP-98).
 *
 * GAP-100 is asserted on the payload *and* on the page, because the bug it
 * fixes was invisible in the response and only showed on the second page load —
 * a heart that had been set coming back empty.
 */

const API = "https://maison.dockbox.cloud/api/v1";

interface Row {
  id: string;
  title?: string;
  likeCount?: number | null;
  isLiked?: boolean | null;
  sellerId?: string;
  tradePreferredCategoryIds?: string[] | null;
}

async function listings(
  request: APIRequestContext,
  query: string,
  token?: string,
): Promise<Row[]> {
  const result = await apiGet(request, `/listings?${query}`, token);
  return ((result.body as { items?: Row[] })?.items ?? []) as Row[];
}

async function write(
  request: APIRequestContext,
  method: "post" | "patch" | "delete",
  path: string,
  token: string,
  data?: unknown,
) {
  const response = await request[method](`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    ...(data ? { data } : {}),
  });
  return {
    status: response.status(),
    body: (await response.json().catch(() => null)) as Record<string, unknown> | null,
  };
}

/**
 * GAP-100 — the key is absent for a caller the API cannot identify, and a real
 * boolean for one it can.
 *
 * The absent-not-false half is the backend's own call and worth holding them
 * to: `false` from an anonymous request would be a claim about a person nobody
 * named, and the card would have no way to tell it from a signed-in "not
 * saved".
 */
test("a listing row states the viewer's like only when there is a viewer", async ({
  request,
}) => {
  const anonymous = await listings(request, "status=live&limit=5");
  test.skip(anonymous.length === 0, "no live listings on dev");

  for (const row of anonymous) {
    expect(
      "isLiked" in row,
      `${row.id} answered isLiked to a request with no token`,
    ).toBeFalsy();
    expect(row.likeCount, "likeCount is the global count and always sent").toBeDefined();
  }

  const token = await apiToken(request, "a");
  const signedIn = await listings(request, "status=live&limit=5", token!);
  for (const row of signedIn) {
    expect(typeof row.isLiked, `${row.id} sent no isLiked to a signed-in caller`).toBe(
      "boolean",
    );
  }
});

/**
 * GAP-100 — the like, the grids and the wishlist are one row in `listing_likes`,
 * so they cannot disagree. Liked here and put back at the end.
 */
test("a save shows up on every grid that draws the card", async ({ request }) => {
  const token = await apiToken(request, "a");
  test.skip(!token, "the probe account did not sign in");

  const rows = await listings(request, "status=live&limit=20", token!);
  const target = rows.find((row) => row.isLiked === false);
  test.skip(!target, "every live listing is already saved on this account");

  const before = await apiGet(request, "/wishlist", token!);
  const wasTotal = (before.body as { total?: number })?.total ?? 0;

  const liked = await write(request, "post", `/listings/${target!.id}/like`, token!);
  expect(liked.status, "the like did not land").toBeLessThan(300);

  try {
    const [list, detail, sellerItems, wishlist] = await Promise.all([
      listings(request, `status=live&limit=20`, token!),
      apiGet(request, `/listings/${target!.id}`, token!),
      apiGet(request, `/sellers/${target!.sellerId}/items?limit=50`, token!),
      apiGet(request, "/wishlist", token!),
    ]);

    expect(
      list.find((row) => row.id === target!.id)?.isLiked,
      "the grid does not know the listing was saved",
    ).toBe(true);
    expect((detail.body as Row).isLiked, "the detail page does not know").toBe(true);
    expect(
      ((sellerItems.body as { items?: Row[] })?.items ?? []).find(
        (row) => row.id === target!.id,
      )?.isLiked,
      "the seller's Items tab does not know",
    ).toBe(true);
    expect((wishlist.body as { total?: number })?.total).toBe(wasTotal + 1);

    // Anonymously the same listing says nothing about anyone.
    const anonymous = await apiGet(request, `/listings/${target!.id}`);
    expect("isLiked" in (anonymous.body as object)).toBeFalsy();
  } finally {
    await write(request, "delete", `/listings/${target!.id}/like`, token!);
  }

  const after = await apiGet(request, "/wishlist", token!);
  expect(
    (after.body as { total?: number })?.total,
    "the probe like was not cleaned up",
  ).toBe(wasTotal);
});

/**
 * The whole point of GAP-100: the heart survives a page load. This is the one
 * that would have caught the bug — the payload assertions above cannot, because
 * the field simply was not there to be wrong.
 */
test("the storefront card comes back with the viewer's heart filled", async ({
  page,
  request,
}) => {
  const token = await apiToken(request, "a");
  test.skip(!token, "the probe account did not sign in");

  const rows = await listings(request, "status=live&limit=20", token!);
  const target = rows.find((row) => row.isLiked === false && row.title);
  test.skip(!target, "every live listing is already saved on this account");

  await write(request, "post", `/listings/${target!.id}/like`, token!);
  try {
    await signIn(page, "a");
    await page.goto(`/en/search?q=${encodeURIComponent(target!.title!)}`);
    await expectNoErrorBoundary(page);

    const card = page
      .locator("article")
      .filter({ hasText: target!.title! })
      .first();
    await expect(card).toBeVisible();
    await expect(
      card.getByRole("button", { name: "Remove from wishlist" }),
      "the card drew an empty heart for an item in the wishlist",
    ).toHaveAttribute("aria-pressed", "true");
  } finally {
    await write(request, "delete", `/listings/${target!.id}/like`, token!);
  }
});

/**
 * GAP-97 — the trade PDP's defining section. The ids are what a `PATCH` writes
 * back; the objects are what the chips draw, in the seller's order.
 */
test("a trade listing says what it wants back, and the PDP draws it", async ({
  page,
  request,
}) => {
  const fixture = await ensureTradePreferenceListing(request);
  test.skip(!fixture, "could not find or create a trade listing with preferences");

  const detail = await apiGet(request, `/listings/${fixture!.id}`);
  const row = detail.body as Row & {
    tradePreferredCategories?: { id: string; name: string }[] | null;
  };

  expect(row.tradePreferredCategoryIds?.length, "no ids on the listing").toBeGreaterThan(0);
  // The same list twice: ids to write back, objects to draw.
  expect(row.tradePreferredCategories?.map((category) => category.id)).toEqual(
    row.tradePreferredCategoryIds,
  );

  await page.goto(`/en/products/${fixture!.id}`);
  await expectNoErrorBoundary(page);
  await expect(page.getByText("Looking to trade for")).toBeVisible();
  for (const category of fixture!.categories) {
    await expect(page.getByText(category.name, { exact: true }).first()).toBeVisible();
  }

  /*
    Arabic draws Arabic (plans/09 C63). The embedded objects carry no `nameAr`,
    so the label is joined from the category tree — if that join is ever dropped
    the chips silently fall back to English on an Arabic page, which is exactly
    the kind of regression nothing else here would catch.
  */
  const categories = await apiGet(request, "/categories");
  const arabic = new Map(
    ((categories.body ?? []) as { id: string; nameAr?: string | null }[]).map(
      (category) => [category.id, category.nameAr],
    ),
  );
  await page.goto(`/ar/products/${fixture!.id}`);
  await expectNoErrorBoundary(page);
  for (const category of fixture!.categories) {
    const name = arabic.get(category.id);
    if (name) {
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
    }
  }
});

/**
 * GAP-97's write side, on a draft — the only state a listing can be edited in.
 *
 * Omitting the field leaves the list alone and `[]` clears it, which is the
 * distinction the wizard depends on: deselecting every chip is a statement, not
 * a missing key.
 */
test("trade preferences are written, kept, cleared and validated", async ({
  request,
}) => {
  const token = await apiToken(request, "a");
  test.skip(!token, "the probe account did not sign in");

  const categories = await apiGet(request, "/categories");
  const all = (categories.body ?? []) as { id: string; slug?: string }[];
  const [bags, dresses] = ["bags-handbags", "women-dresses"].map(
    (slug) => all.find((category) => category.slug === slug)?.id,
  );
  test.skip(!bags || !dresses, "the seeded categories are not on dev");

  const created = await write(request, "post", "/listings", token!, {
    categoryId: "328118db-d7e7-459a-9e4a-b0e3501f8e7f",
    title: "Round-8 probe — trade prefs",
    description: "E2E probe. Deleted at the end of this spec.",
    condition: "like_new",
    attributes: { size: "M", color: ["Navy"] },
    price: 300,
    tradeEnabled: true,
    tradePreferredCategoryIds: [bags, dresses],
  });
  const id = created.body?.id as string | undefined;
  expect(id, "the probe draft was not created").toBeTruthy();

  try {
    // Order is the seller's, not the database's.
    expect(created.body?.tradePreferredCategoryIds).toEqual([bags, dresses]);

    const detail = await apiGet(request, `/listings/${id}`, token!);
    expect(
      (detail.body as { tradePreferredCategories?: { name: string }[] })
        .tradePreferredCategories?.length,
      "the detail endpoint resolved no names",
    ).toBe(2);

    // Omitted leaves it alone.
    const renamed = await write(request, "patch", `/listings/${id}`, token!, {
      title: "Round-8 probe — renamed",
    });
    expect(renamed.body?.tradePreferredCategoryIds).toEqual([bags, dresses]);

    // Kept when the seller turns trade off — the wizard's back button.
    const untraded = await write(request, "patch", `/listings/${id}`, token!, {
      tradeEnabled: false,
    });
    expect(untraded.body?.saleMode).toBe("fixed");
    expect(untraded.body?.tradePreferredCategoryIds).toEqual([bags, dresses]);

    // `[]` is a statement, and clears.
    const cleared = await write(request, "patch", `/listings/${id}`, token!, {
      tradePreferredCategoryIds: [],
    });
    expect(cleared.body?.tradePreferredCategoryIds).toEqual([]);

    // Both rejections happen before the write.
    const unknown = await write(request, "patch", `/listings/${id}`, token!, {
      tradePreferredCategoryIds: ["nope"],
    });
    expect(unknown.status).toBe(400);
    expect(String(unknown.body?.message)).toContain("nope");

    const tooMany = await write(request, "patch", `/listings/${id}`, token!, {
      tradePreferredCategoryIds: Array.from({ length: 11 }, () => bags),
    });
    expect(tooMany.status).toBe(400);
  } finally {
    await write(request, "delete", `/listings/${id}`, token!);
  }
});

/**
 * GAP-97's write side through the wizard, which is how a seller actually sets
 * it — the API battery above cannot catch a picker that collects the wrong
 * thing.
 *
 * Leaves, not roots: the ids that reach the draft have to be the ones the
 * ranking matches on (plans/09 C63 records why).
 */
test("the sell wizard writes the seller's trade preferences", async ({
  page,
  request,
}) => {
  await signIn(page, "a");
  await page.goto("/en/sell");
  await expectNoErrorBoundary(page);

  const cont = page.getByRole("button", { name: "Continue" });
  await page.getByRole("button", { name: /^Fashion/ }).first().click();
  await page.getByRole("button", { name: "Bags", exact: true }).click();
  await page.getByRole("button", { name: "Handbags", exact: true }).click();
  await cont.click();

  await page.getByText("Trade · Request Trade").click();
  await expect(page.getByText("What would you take in return?")).toBeVisible();

  // The root chip is the browsing row; only the leaves under it are picked.
  await page.getByRole("button", { name: "Bags", exact: true }).click();
  await page.getByRole("button", { name: "Handbags", exact: true }).click();
  await page.getByRole("button", { name: "Clutches", exact: true }).click();
  // Picked chips read back as their own removable row.
  await expect(page.getByRole("button", { name: "Remove Handbags" })).toBeVisible();
  await cont.click();

  await expect(page.getByRole("heading", { name: "Item details" })).toBeVisible();

  const token = await apiToken(request, "a");
  const drafts = await apiGet(request, "/listings/me?filter=draft", token!);
  const draft = ((drafts.body as { items?: { id: string }[] })?.items ?? [])[0];
  expect(draft?.id, "the wizard created no draft").toBeTruthy();

  try {
    const detail = await apiGet(request, `/listings/${draft.id}`, token!);
    const row = detail.body as {
      saleMode?: string;
      tradePreferredCategories?: { name: string }[] | null;
    };
    expect(row.saleMode).toBe("trade");
    expect(
      row.tradePreferredCategories?.map((category) => category.name),
      "the wizard did not write what the seller picked, in order",
    ).toEqual(["Handbags", "Clutches"]);
  } finally {
    // The API caps an account at three drafts, so this run must not leave one.
    await write(request, "delete", `/listings/${draft.id}`, token!);
  }
});

/** GAP-98 — the reward is riyals in the stats, in the share message and on the page. */
test("the referral reward is SAR, in the payload and on the screen", async ({
  page,
  request,
}) => {
  const token = await apiToken(request, "a");
  const referrals = await apiGet(request, "/referrals/me", token!);
  const body = referrals.body as {
    shareMessage?: string;
    stats?: { currency?: string; rewardAmount?: number };
  };

  expect(body.stats?.currency).toBe("SAR");
  expect(body.shareMessage, "the share message still offers dirhams").not.toContain(
    "AED",
  );
  expect(body.shareMessage).toContain("SAR");

  await signIn(page, "a");
  await page.goto("/en/account/referrals");
  await expectNoErrorBoundary(page);
  // The screen renders `stats.currency` — it never hardcoded the frame's SAR,
  // which is why the relabel reached it with no client change.
  await expect(page.getByText("AED")).toHaveCount(0);
  await expect(page.getByText(`SAR ${body.stats?.rewardAmount}`).first()).toBeVisible();
});
