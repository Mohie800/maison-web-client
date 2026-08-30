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
 * "Vendor Portal" stays omitted: Flow 15 is out of scope and the route does not
 * exist. **Sign Out** is new here — the design has always drawn it and nothing
 * in the app rendered it, so there was no way to sign out at all.
 */
const NAV = [
  { key: "dashboard", href: "/account" },
  { key: "orders", href: "/account/orders" },
  { key: "wishlist", href: "/account/wishlist" },
  { key: "wallet", href: "/account/wallet" },
  { key: "listings", href: "/account/listings" },
  { key: "trades", href: "/account/trades" },
  { key: "bids", href: "/account/bids" },
  { key: "settings", href: "/account/settings" },
] as const;

export async function AccountSidebar({ active }: { active: string }) {
  const t = await getTranslations("Account");
  const locale = await getLocale();
  const user = await getCurrentUser();
  const avatar = resolveMediaUrl(user?.profilePic);

  return (
    <aside className="w-full shrink-0 lg:w-[220px]">
      <div className="bg-base border-line-200 overflow-hidden rounded-12 border py-5">
        {/* User — 651:8912 */}
        <div className="flex flex-col items-center gap-1 px-4 pb-4">
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

        <span className="bg-fill-100 block h-px w-full" aria-hidden />

        <nav>
          <ul>
            {NAV.map(({ key, href }) => {
              const isActive = key === active;
              return (
                <li key={key}>
                  {/* NI — 651:8918 */}
                  <Link
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex px-5 py-3 text-[13px] ${
                      isActive
                        ? "bg-action-tint text-action font-semibold"
                        : "text-ink-700 hover:bg-surface"
                    }`}
                  >
                    {t(`nav.${key}`)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <span className="bg-fill-100 block h-px w-full" aria-hidden />

        {/* SO — 651:8933 */}
        <form action={signOutAction}>
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="text-error hover:bg-surface flex w-full px-5 py-3 text-start text-[13px]"
          >
            {t("nav.signOut")}
          </button>
        </form>
      </div>
    </aside>
  );
}
