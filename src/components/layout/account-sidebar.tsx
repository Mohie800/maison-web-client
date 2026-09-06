import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveMediaUrl } from "@/lib/api/media";
import { signOutAction } from "@/features/auth/sign-out";

/**
 * Account navigation — the left rail on `651:8911` (Web_AccountDashboard) and
 * `651:6571` (Web_TradeHistory), which agree: 220px, plain text rows at 13px,
 * no icons.
 *
 * Icons were an addition and are gone. **Notifications** is gone too — neither
 * frame lists it, and the header bell now opens the dropdown with its own "See
 * all" link, so the rail entry was a second door to one room (plans/09 C52).
 *
 * **Vendor Portal** is the only way into the seller side. `651:8935` puts it
 * last, below Sign Out — fine for an individual who sells occasionally, wrong
 * for a business account, whose whole reason for existing is the portal. So the
 * row moves to the top for `accountType: "business"` and stays where the frame
 * puts it for everyone else.
 *
 * That split is what `accountType` is for, and `features/auth/schemas.ts` has
 * been carrying a note since sign-up was built saying business accounts "will
 * need their own entry point in a later flow". This is it. Recorded as C85.
 *
 * **Sign Out** is also here — the design has always drawn it and nothing in the
 * app rendered it, so there was no way to sign out at all.
 */
const NAV = [
  { key: "dashboard", href: "/account" },
  { key: "profile", href: "/account/profile" },
  { key: "orders", href: "/account/orders" },
  { key: "wishlist", href: "/account/wishlist" },
  { key: "wallet", href: "/account/wallet" },
  { key: "coupons", href: "/account/coupons" },
  { key: "listings", href: "/account/listings" },
  { key: "trades", href: "/account/trades" },
  { key: "bids", href: "/account/bids" },
  { key: "referrals", href: "/account/referrals" },
  { key: "settings", href: "/account/settings" },
] as const;

export async function AccountSidebar({ active }: { active: string }) {
  const t = await getTranslations("Account");
  const locale = await getLocale();
  const user = await getCurrentUser();
  const avatar = resolveMediaUrl(user?.profilePic);
  const isBusiness = user?.accountType === "business";

  /* One row, two homes — see the note above. */
  const vendorLink = (
    <li className="shrink-0">
      <Link
        href="/vendor"
        className={`border-line-200 hover:bg-surface flex items-center rounded-[18px] border px-4 py-2 text-[13px] whitespace-nowrap lg:rounded-none lg:border-0 lg:px-5 lg:py-3 ${
          isBusiness ? "text-action font-semibold" : "text-ink-700"
        }`}
      >
        {t("nav.vendorPortal")}
      </Link>
    </li>
  );

  return (
    /*
      Below `lg` the rail becomes a horizontally scrolling pill strip: as a
      stacked list it was twelve full-width rows, so every account page opened
      on a screen of navigation with its own content below the fold.
    */
    <aside className="w-full shrink-0 lg:w-[220px]">
      <div className="bg-base border-line-200 rounded-12 lg:overflow-hidden lg:border lg:py-5">
        {/* User — 651:8912. The page's own heading names it on mobile. */}
        <div className="hidden flex-col items-center gap-1 px-4 pb-4 lg:flex">
          <span className="bg-action-tint text-action flex size-13 items-center justify-center overflow-hidden rounded-[26px] text-[16px] font-bold">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
              <img src={avatar} alt="" className="size-full object-cover" />
            ) : (
              (user?.fullName ?? "?").slice(0, 2).toUpperCase()
            )}
          </span>
          <span className="text-ink-900 text-[13px] font-semibold" dir="auto">
            {user?.fullName}
          </span>
          {user?.username && (
            <span className="text-ink-500 text-[11px]" dir="ltr">
              @{user.username}
            </span>
          )}
        </div>

        <span className="bg-fill-100 hidden h-px w-full lg:block" aria-hidden />

        <nav className="max-lg:-mx-4 max-lg:px-4">
          <ul className="scrollbar-none flex gap-2 overflow-x-auto lg:flex-col lg:gap-0 lg:overflow-visible">
            {isBusiness && vendorLink}
            {NAV.map(({ key, href }) => {
              const isActive = key === active;
              return (
                <li key={key} className="shrink-0">
                  {/* NI — 651:8918 */}
                  <Link
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center rounded-[18px] border px-4 py-2 text-[13px] whitespace-nowrap lg:rounded-none lg:border-0 lg:px-5 lg:py-3 ${
                      isActive
                        ? "bg-action-tint border-action text-action font-semibold lg:border-transparent"
                        : "border-line-200 text-ink-700 hover:bg-surface lg:border-transparent"
                    }`}
                  >
                    {t(`nav.${key}`)}
                  </Link>
                </li>
              );
            })}

            {/* SO — 651:8933 */}
            <li className="shrink-0 lg:border-fill-100 lg:mt-0 lg:border-t">
              <form action={signOutAction}>
                <input type="hidden" name="locale" value={locale} />
                <button
                  type="submit"
                  className="border-line-200 text-error hover:bg-surface flex items-center rounded-[18px] border px-4 py-2 text-[13px] whitespace-nowrap lg:w-full lg:rounded-none lg:border-0 lg:px-5 lg:py-3 lg:text-start"
                >
                  {t("nav.signOut")}
                </button>
              </form>
            </li>

            {/* NI — 651:8935, where the frame puts it. */}
            {!isBusiness && vendorLink}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
