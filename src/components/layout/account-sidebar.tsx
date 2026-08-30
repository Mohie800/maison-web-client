import { getTranslations } from "next-intl/server";
import {
  Bell,
  Gavel,
  Heart,
  LayoutDashboard,
  Package,
  Repeat,
  Settings,
  Tag,
  Wallet,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveMediaUrl } from "@/lib/api/media";

/**
 * Account navigation — the left rail in Figma node 651:8208 (Web_MyOrders).
 *
 * The design also lists "Vendor Portal"; that's Flow 15 and out of scope for
 * this client, so it's omitted rather than linked to a route that doesn't exist.
 */
const NAV = [
  { key: "dashboard", href: "/account", icon: LayoutDashboard },
  { key: "orders", href: "/account/orders", icon: Package },
  { key: "wishlist", href: "/account/wishlist", icon: Heart },
  { key: "wallet", href: "/account/wallet", icon: Wallet },
  { key: "listings", href: "/account/listings", icon: Tag },
  { key: "trades", href: "/account/trades", icon: Repeat },
  { key: "bids", href: "/account/bids", icon: Gavel },
  { key: "notifications", href: "/account/notifications", icon: Bell },
  { key: "settings", href: "/account/settings", icon: Settings },
] as const;

export async function AccountSidebar({ active }: { active: string }) {
  const t = await getTranslations("Account");
  const user = await getCurrentUser();
  const avatar = resolveMediaUrl(user?.profilePic);

  return (
    <aside className="w-full shrink-0 lg:w-[260px]">
      <div className="bg-base border-line overflow-hidden rounded-16 border">
        <div className="flex flex-col items-center gap-2 p-6">
          <span className="bg-action-tint text-action size-14 overflow-hidden rounded-full">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
              <img src={avatar} alt="" className="size-full object-cover" />
            ) : (
              <span className="text-h3 flex size-full items-center justify-center">
                {(user?.fullName ?? "?").slice(0, 2).toUpperCase()}
              </span>
            )}
          </span>
          <span className="text-label" dir="auto">
            {user?.fullName}
          </span>
          {user?.username && (
            <span className="text-caption text-ink-tertiary" dir="ltr">
              @{user.username}
            </span>
          )}
        </div>

        <nav className="border-line border-t">
          <ul>
            {NAV.map(({ key, href, icon: Icon }) => {
              const isActive = key === active;
              return (
                <li key={key}>
                  <Link
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    className={`text-body flex items-center gap-3 px-6 py-3 ${
                      isActive
                        ? "bg-action-tint text-action font-semibold"
                        : "text-ink-secondary hover:bg-surface"
                    }`}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {t(`nav.${key}`)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
