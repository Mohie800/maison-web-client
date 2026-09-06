import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getSeller } from "@/lib/api/endpoints/sellers";
import { resolveMediaUrl } from "@/lib/api/media";
import { VendorNav } from "./vendor-nav";

/**
 * Vendor Portal rail — `651:13489` (light) and `651:10850` (dark).
 *
 * The two themes diverge on more than tone, so the `dark:` pairs are designed
 * values rather than derivations: the rail is white in light and `#0F1117` in
 * dark, the active row tints green in light and greys in dark, and the accent
 * flips from `t/action` to `accent/aqua`.
 *
 * Hidden below `lg` — the frame is a fixed 1440 desktop layout with no mobile
 * variant drawn. See plans/09.
 */
export async function VendorSidebar() {
  const t = await getTranslations("Vendor");
  const user = await getCurrentUser();
  const seller = user ? await getSeller(user.id).catch(() => null) : null;

  const avatar = resolveMediaUrl(user?.profilePic);
  const storeName = user?.fullName ?? "";
  const initials = storeName.slice(0, 2).toUpperCase() || "?";

  return (
    <aside className="bg-base dark:bg-fill-50 border-line-200 hidden w-[260px] shrink-0 flex-col self-stretch border-e lg:flex">
      {/* Logo — 651:13490 */}
      <div className="flex h-16 shrink-0 items-center gap-2.5 ps-6">
        <span className="bg-aqua rounded-8 flex size-8 items-center justify-center text-[10px] font-bold text-black">
          {t("badge")}
        </span>
        <span className="text-ink-900 text-[14px] leading-[17px] font-bold">{t("title")}</span>
      </div>

      {/* Store identity — 651:13494 */}
      <div className="flex shrink-0 items-center gap-2.5 px-4 py-3">
        <span className="bg-vp-action text-action dark:text-aqua flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-[12px] font-bold">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
            <img src={avatar} alt="" className="size-full object-cover" />
          ) : (
            initials
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <span
            className="text-ink-900 truncate text-[12px] leading-[15px] font-semibold"
            dir="auto"
          >
            {storeName}
          </span>
          {user?.username && (
            <span
              className="text-ink-500 dark:text-ink-450 truncate text-[10px] leading-3"
              dir="ltr"
            >
              @{user.username}
            </span>
          )}
        </span>
        {/* Verified pill — 651:10861, drawn on the dark frame only. */}
        {seller?.isVerified && (
          <span className="bg-vp-action text-action dark:text-aqua flex h-[18px] shrink-0 items-center rounded-[9px] px-[7px] text-[9px] font-bold">
            ✓
          </span>
        )}
      </div>

      <span className="bg-line-200 h-px w-full shrink-0" aria-hidden />

      <VendorNav />

      <span className="bg-line-200 mt-4 h-px w-full shrink-0" aria-hidden />

      {/* SW — 651:13539. The only way back to the storefront from in here. */}
      <Link
        href="/account"
        className="text-ink-500 dark:text-ink-450 hover:bg-surface flex shrink-0 items-center gap-1 py-3 ps-5 text-[13px]"
      >
        <span aria-hidden className="rtl:rotate-180">
          &lt;
        </span>
        {t("switchToBuyer")}
      </Link>
    </aside>
  );
}
