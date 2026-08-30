import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getBag } from "@/lib/api/endpoints/checkout";
import { getUnreadCount } from "@/lib/api/endpoints/conversations";
import { getNotificationUnreadCount } from "@/lib/api/endpoints/notifications";
import { resolveMediaUrl } from "@/lib/api/media";
import {
  CartFilled,
  HeartFilled,
  VisualSearchIcon,
} from "@/components/icons/header-icons";
import { MessagesSquare } from "lucide-react";
import { BellFilled } from "@/components/icons/header-icons";
import { NotificationsMenu } from "@/features/notifications/components/notifications-menu";

/**
 * Site header — Figma node 651:544.
 *
 * Exact spec: 72px tall on `bg/base` with a `t/border-200` hairline, 80px
 * gutters, the 125×53 wordmark, 32px nav gaps, a fixed 284px search pill on
 * `bg/surface`, the aqua "+ Sell" pill, and three 40px circular icon buttons
 * before the avatar.
 */
export async function SiteHeader() {
  const t = await getTranslations("Chrome");
  const tNav = await getTranslations("Nav");
  const user = await getCurrentUser();
  const avatar = resolveMediaUrl(user?.profilePic);

  /**
   * Real cart count for the badge. Only fetched when signed in — the bag is
   * user-scoped, and an anonymous visitor has nothing to show. A failure here
   * must not take the header down, so it degrades to no badge.
   */
  const bagCount = user
    ? await getBag()
        .then((bag) => bag.items.length)
        .catch(() => 0)
    : 0;

  /*
    The inbox badge. No frame draws a way into the inbox — not the header, not
    the account rail — but `GET /conversations/unread-count` describes itself as
    being "for the inbox badge", so one is intended somewhere. It goes here,
    beside the other three, and is recorded in plans/09 C44.
  */
  const unreadMessages = user ? await getUnreadCount() : 0;
  const unreadNotifications = user ? await getNotificationUnreadCount() : 0;

  return (
    <header className="bg-base border-line-200 sticky top-0 z-40 h-[72px] border-b">
      <div className="mx-auto flex h-full max-w-[1440px] items-center px-4 lg:px-20">
        {/*
          Two wordmarks swapped by the `dark:` variant rather than by reading
          the theme in JS: this is a Server Component, and next-themes has no
          theme to report until it runs in the browser, so a JS swap would paint
          the wrong logo first. `logo-light.png` has a white plate baked into
          the image, which reads as a white box on the dark surface; the footer
          variant is transparent and drawn for exactly that background.
        */}
        <Link href="/" className="shrink-0" aria-label="Maison Sale">
          <Image
            src="/brand/logo-light.png"
            alt="Maison Sale"
            width={250}
            height={105}
            priority
            className="h-[53px] w-auto dark:hidden"
          />
          <Image
            src="/brand/logo-dark.png"
            alt="Maison Sale"
            width={480}
            height={203}
            priority
            className="hidden h-[53px] w-auto dark:block"
          />
        </Link>

        <nav className="ms-5 hidden items-center gap-8 lg:flex">
          <Link href="/" className="text-action text-[14px] font-semibold">
            {tNav("home")}
          </Link>
          <Link href="/categories" className="text-ink-500 text-[14px]">
            {t("categories")}
          </Link>
          <Link href="/brands" className="text-ink-500 text-[14px]">
            {t("brands")}
          </Link>
        </nav>

        <div className="flex-1" />

        {/*
          A GET form so search works without JavaScript and the query lands in
          the URL, which is what makes results server-rendered and shareable.
        */}
        <form
          action="/search"
          className="bg-surface border-line-200 hidden h-[42px] w-[284px] items-center gap-2 rounded-[21px] border px-4 md:flex"
        >
          <input
            type="search"
            name="q"
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="text-ink placeholder:text-ink-550 h-full min-w-0 flex-1 bg-transparent text-[14px] outline-none"
          />
          <Link
            href="/search/visual"
            aria-label={t("visualSearch")}
            className="text-ink-550 hover:text-action shrink-0"
          >
            <VisualSearchIcon className="h-[19px] w-[18px]" />
          </Link>
        </form>

        <Link
          href="/sell"
          className="bg-aqua ms-5 flex h-10 shrink-0 items-center rounded-[20px] px-5 text-[13px] font-bold text-black"
        >
          {t("sell")}
        </Link>

        <div className="ms-5 flex shrink-0 items-center gap-2">
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

          <IconButton href="/cart" label={tNav("bag")} badge={bagCount}>
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
  children,
}: {
  href: string;
  label: string;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={badge > 0 ? `${label} (${badge})` : label}
      className="bg-surface text-ink hover:text-action relative hidden size-10 items-center justify-center rounded-[20px] sm:flex"
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
