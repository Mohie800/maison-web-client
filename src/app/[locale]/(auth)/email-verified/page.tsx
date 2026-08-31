import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";

/**
 * Web_EmailVerified — `651:16561`.
 *
 * The confirmation the OTP step used to skip: `verifyOtp` replaced straight to
 * `/` or `/onboarding/profile`, so this frame had never rendered. It now sits
 * between them, and the OTP form routes here.
 *
 * The frame's account card names the person who just verified. Verification
 * signs the account in, so that comes from the session; if it somehow has not,
 * the card is dropped rather than filled with a placeholder, and the button
 * still points at sign-in as the frame's label says.
 */
export const metadata: Metadata = { robots: { index: false } };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

export default async function EmailVerifiedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Auth");
  const user = await getCurrentUser();
  const name = user?.fullName ?? user?.username ?? null;

  return (
    /* Form — 651:16578 */
    <div className="flex w-full max-w-[400px] flex-col gap-5">
      <h1 className="text-ink-900 text-[28px] font-bold">
        {t("emailVerifiedTitle")}
      </h1>
      <p className="text-ink-500 text-[14px]">
        {t("emailVerifiedBody")}
        <br />
        {t("emailVerifiedBody2")}
      </p>

      {/* Acc — 651:16581 */}
      {user && (
        <div className="bg-fill-50 border-line-200 flex items-center gap-3 rounded-12 border px-4 py-3.5">
          <span className="bg-action-tint text-action flex size-11 shrink-0 items-center justify-center rounded-[22px] text-[14px] font-bold">
            {initials(name ?? user.email ?? "?")}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            {name && (
              <span
                className="text-ink-900 truncate text-[14px] font-semibold"
                dir="auto"
              >
                {name}
              </span>
            )}
            {user.email && (
              <span className="text-ink-500 truncate text-[12px]" dir="ltr">
                {user.email}
              </span>
            )}
          </span>
          <span className="bg-action-tint text-action flex h-6 shrink-0 items-center rounded-12 px-2.5 text-[11px] font-medium">
            {t("verified")}
          </span>
        </div>
      )}

      {/* Btn — 651:16589. Verification signs you in, so a verified session goes
          on to the app rather than back to a form it does not need. */}
      <Link
        href={user ? "/" : "/sign-in"}
        className="bg-aqua flex h-13 w-full items-center justify-center rounded-[26px] text-[15px] font-bold text-black"
      >
        {user ? t("continueToApp") : t("continueToSignIn")}
      </Link>
    </div>
  );
}
