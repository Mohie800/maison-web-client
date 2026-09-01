import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isAuthenticated } from "@/lib/auth/session";
import { getBag } from "@/lib/api/endpoints/checkout";
import { getUnreadCount } from "@/lib/api/endpoints/conversations";
import { getNotificationUnreadCount } from "@/lib/api/endpoints/notifications";
import { resolveMediaUrl } from "@/lib/api/media";
import { CartFilled, HeartFilled } from "@/components/icons/header-icons";
import { MessagesSquare, Search } from "lucide-react";
import { BellFilled } from "@/components/icons/header-icons";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NotificationsMenu } from "@/features/notifications/components/notifications-menu";
import { SearchOverlay } from "@/features/search/components/search-overlay";
import { CategoriesDropdown } from "@/features/catalog/components/categories-dropdown";
import { getTrendingSearches } from "@/lib/api/endpoints/discovery";
import { getCategoryTree } from "@/lib/api/endpoints/catalog";
import { categoryTypeForSlug } from "@/features/sell/draft";

/**
 * Site header — Figma node 651:544.
 *
 * Exact spec: 72px tall on `bg/base` with a `t/border-200` hairline, 80px
 * gutters, the 125×53 wordmark, 32px nav gaps, a fixed 284px search pill on
 * `bg/surface`, the aqua "+ Sell" pill, and three 40px circular icon buttons
 * before the avatar.
 */
export async function SiteHeader() {
  /*
    Gated on the session cookie rather than on `getCurrentUser()` resolving:
    waiting for the profile first put four round trips in series in front of
    every page. Each badge below already degrades to 0, so a cookie that turns
    out to be expired costs three discarded requests, not a broken header.
  */
  const signedIn = await isAuthenticated();

  // One batch — nothing here depends on anything else here.
  const [
    user,
    bagCount,
    unreadMessages,
    unreadNotifications,
    trending,
    tree,
  ] = await Promise.all([
    getCurrentUser(),
    // The bag is user-scoped; an anonymous visitor has nothing to show.
    signedIn
      ? getBag()
          .then((bag) => bag.items.length)
          .catch(() => 0)
      : 0,
    /*
      The inbox badge. No frame draws a way into the inbox, but
      `GET /conversations/unread-count` describes itself as being "for the
      inbox badge", so one is intended somewhere — recorded in plans/09 C44.
    */
    signedIn ? getUnreadCount() : 0,
    signedIn ? getNotificationUnreadCount() : 0,
    // Public and cached, so these cost the header nothing per request and
    // degrade to an empty chip row / no dropdown.
    getTrendingSearches().catch(() => []),
    // Web_CategoriesDropdown (`651:2972`).
    getCategoryTree().catch(() => []),
  ]);

  // Sequential, not batched: these read already-loaded messages, and racing
  // three of them makes next-intl resolve its request config three times.
  const t = await getTranslations("Chrome");
  const tNav = await getTranslations("Nav");
  const tSell = await getTranslations("Sell");

  const avatar = resolveMediaUrl(user?.profilePic);

  const dropdownCategories = tree.map((row) => ({
    id: row.id,
    name: row.name,
    listingCount: row.listingCount ?? null,
    type: categoryTypeForSlug(row.slug ?? ""),
    children: (row.children ?? []).map((child) => ({
      id: child.id,
      name: child.name,
    })),
  }));

  return (
    <header className="bg-base border-line-200 sticky top-0 z-40 h-[60px] border-b lg:h-[72px]">
      <div className="mx-auto flex h-full max-w-[1440px] items-center px-4 lg:px-20">
        {/*
          Below lg the nav, the sub-nav and the util bar are all hidden, so the
          drawer is the only route to categories, auctions, trade, the trend
          hub, the language switch and the theme toggle.
        */}
        <MobileNav
          categories={dropdownCategories.map(({ id, name }) => ({ id, name }))}
          signedIn={Boolean(user)}
        />

        {/*
          Two wordmarks swapped by the `dark:` variant rather than by reading
          the theme in JS: this is a Server Component, and next-themes has no
          theme to report until it runs in the browser, so a JS swap would paint
          the wrong logo first. `logo-light.png` has a white plate baked into
          the image, which reads as a white box on the dark surface; the footer
          variant is transparent and drawn for exactly that background.
        */}
        <Link href="/" className="ms-1 shrink-0 lg:ms-0" aria-label="Maison Sale">
          {/* width/height are the rendered size, not the file's — they drive
              the srcset, and the source dimensions asked for a 640w wordmark
              to fill 125px. */}
          <Image
            src="/brand/logo-light.png"
            alt="Maison Sale"
            width={126}
            height={53}
            priority
            className="h-9 w-auto lg:h-[53px] dark:hidden"
          />
          <Image
            src="/brand/logo-dark.png"
            alt="Maison Sale"
            width={125}
            height={53}
            priority
            className="hidden h-9 w-auto lg:h-[53px] dark:block"
          />
        </Link>

        <nav className="ms-5 hidden items-center gap-8 lg:flex">
          <Link href="/" className="text-action text-[14px] font-semibold">
            {tNav("home")}
          </Link>
          <CategoriesDropdown
            categories={dropdownCategories}
            labels={{
              trigger: t("categories"),
              types: {
                fashion: tSell("types.fashion.name"),
                electronics: tSell("types.electronics.name"),
                furniture: tSell("types.furniture.name"),
                toys_art: tSell("types.toys_art.name"),
              },
              viewAll: t("viewAll"),
              browse: t.raw("browseCategory") as string,
              browseAll: t.raw("browseAllOfType") as string,
              viewAllType: t.raw("viewAllOfType") as string,
            }}
          />
          <Link href="/brands" className="text-ink-500 text-[14px]">
            {t("brands")}
          </Link>
        </nav>

        <div className="flex-1" />

        {/*
          01_Search (`651:2352`). Still a GET form to /search underneath, so
          search works with no JavaScript; the panel is an enhancement on top.
        */}
        <SearchOverlay
          signedIn={Boolean(user)}
          trending={trending.map((row) => ({
            term: row.term,
            formattedCount: row.formattedCount ?? null,
          }))}
          labels={{
            placeholder: t("searchPlaceholder"),
            visualSearch: t("visualSearch"),
            search: t("search"),
            tabs: {
              products: t("searchTabs.products"),
              people: t("searchTabs.people"),
              brands: t("searchTabs.brands"),
            },
            recent: t("recentSearches"),
            clearAll: t("clearAll"),
            remove: t("removeSearch"),
            trending: t("trendingNow"),
            seeAll: t.raw("seeAllResults") as string,
            noResults: t("noSearchResults"),
            official: t("officialStore"),
            followers: t("followersLabel"),
            items: t("itemsLabel"),
          }}
        />

        {/* The search pill needs 284px it doesn't have on a phone, so below md
            the icon goes to /search, which carries its own field. */}
        <Link
          href="/search"
          aria-label={t("search")}
          className="bg-surface text-ink flex size-10 shrink-0 items-center justify-center rounded-[20px] md:hidden"
        >
          <Search className="size-5" aria-hidden />
        </Link>

        <Link
          href="/sell"
          className="bg-aqua ms-2 flex h-10 shrink-0 items-center rounded-[20px] px-3.5 text-[12px] font-bold text-black lg:ms-5 lg:px-5 lg:text-[13px]"
        >
          {t("sell")}
        </Link>

        <div className="ms-2 flex shrink-0 items-center gap-1 lg:ms-5 lg:gap-2">
          <IconButton href="/account/wishlist" label={tNav("wishlist")}>
            <HeartFilled className="size-6" />
          </IconButton>

          {user ? (
            <NotificationsMenu
              initialUnread={unreadNotifications}
              label={t("notifications")}
            />
          ) : (
            <IconButton
              href="/account/notifications"
              label={t("notifications")}
            >
              <BellFilled className="size-6" />
            </IconButton>
          )}

          {user && (
            <IconButton
              href="/inbox"
              label={t("messages")}
              badge={unreadMessages}
            >
              <MessagesSquare className="size-6" strokeWidth={2.5} />
            </IconButton>
          )}

          {/* The bag is the one icon that stays at every width. */}
          <IconButton
            href="/cart"
            label={tNav("bag")}
            badge={bagCount}
            visibility="flex"
          >
            <CartFilled className="size-6" />
          </IconButton>
        </div>

        {user ? (
          <Link
            href="/account"
            aria-label={tNav("account")}
            className="bg-action-tint ms-3 size-10 shrink-0 overflow-hidden rounded-[20px]"
          >
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- avatar hosts vary; see plans/06 G12
              <img src={avatar} alt="" className="size-full object-cover" />
            ) : (
              <span className="text-action flex size-full items-center justify-center text-[13px] font-bold">
                {user.fullName.slice(0, 1).toUpperCase()}
              </span>
            )}
          </Link>
        ) : (
          <Link
            href="/sign-in"
            className="border-line-200 ms-3 flex h-10 shrink-0 items-center rounded-[20px] border px-4 text-[13px] font-semibold"
          >
            {tNav("signIn")}
          </Link>
        )}
      </div>
    </header>
  );
}

function IconButton({
  href,
  label,
  badge = 0,
  /** Phones have room for one icon; everything else waits for `sm`. */
  visibility = "hidden sm:flex",
  children,
}: {
  href: string;
  label: string;
  badge?: number;
  visibility?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={badge > 0 ? `${label} (${badge})` : label}
      className={`bg-surface text-ink hover:text-action relative size-10 items-center justify-center rounded-[20px] ${visibility}`}
    >
      {children}
      {badge > 0 && (
        <span
          // Sits on the trailing-top corner, so it mirrors correctly in Arabic.
          className="bg-error absolute -top-0.5 -end-0.5 flex size-[18px] items-center justify-center rounded-[9px] text-[9px] font-bold text-white"
          aria-hidden
        >
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}
