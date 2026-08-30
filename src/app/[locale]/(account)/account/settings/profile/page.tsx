import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  getNotificationPreferences,
  NOTIFICATION_GROUPS,
} from "@/lib/api/endpoints/settings";
import { resolveMediaUrl } from "@/lib/api/media";
import { AccountSidebar } from "@/components/layout/account-sidebar";
import {
  saveNotificationsAction,
  saveProfileAction,
} from "@/features/settings/actions";

/**
 * Profile & notifications — Figma `651:9448` (Web_Settings): a Profile
 * Information card over a Notifications card.
 *
 * The frame's five notification rows are six here: the API has an extra
 * `social` category, and hiding it would leave it unreachable. Each row is one
 * switch over three stored channels — see features/settings/actions.ts and
 * plans/09 C37.
 *
 * "Change Photo" is present but disabled: `PUT /users/me/profile` is multipart
 * and accepts one, but the field name isn't in the OpenAPI document and no
 * response shape is published, so uploading blind would risk clearing the
 * avatar (GAP-77).
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function ProfileSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Settings");
  const query = await searchParams;
  const one = (v: string | string[] | undefined) =>
    typeof v === "string" ? v : null;
  const error = one(query.error);
  const saved = one(query.saved);

  const [user, prefs] = await Promise.all([
    getCurrentUser(),
    getNotificationPreferences().catch(() => null),
  ]);

  const [first = "", ...restName] = (user?.fullName ?? "").split(" ");
  const last = restName.join(" ");
  const avatar = resolveMediaUrl(user?.profilePic ?? null);
  const initials = (user?.fullName ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const field =
    "bg-fill-50 border-line h-11 w-full rounded-10 border px-3.5 text-[13px] outline-none";

  return (
    <div className="bg-surface min-h-screen">
      <div className="mx-auto flex max-w-[1440px] flex-col px-4 pt-8 pb-16 lg:px-20">
        <h1 className="pb-6 text-[28px] font-bold">{t("accountTitle")}</h1>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <AccountSidebar active="settings" />

          <div className="flex min-w-0 flex-1 flex-col gap-5">
            {/* Profile Information — 651:9448 */}
            <section className="bg-base border-line rounded-12 border p-6">
              <h2 className="text-[15px] font-semibold">{t("profileTitle")}</h2>

              <form
                action={saveProfileAction}
                className="mt-5 flex flex-col gap-5"
              >
                <input type="hidden" name="locale" value={locale} />

                <div className="flex items-center gap-4">
                  <span className="bg-action-tint text-action flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-[15px] font-bold">
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                      <img
                        src={avatar}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </span>
                  <button
                    type="button"
                    disabled
                    title={t("photoUnavailable")}
                    className="border-line rounded-8 border px-4 py-2 text-[12px] font-medium opacity-60"
                  >
                    {t("changePhoto")}
                  </button>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="flex flex-col gap-2">
                    <span className="text-ink-secondary text-[12px]">
                      {t("firstName")}
                    </span>
                    <input
                      name="firstName"
                      defaultValue={first}
                      dir="auto"
                      className={field}
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-ink-secondary text-[12px]">
                      {t("lastName")}
                    </span>
                    <input
                      name="lastName"
                      defaultValue={last}
                      dir="auto"
                      className={field}
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-2">
                  <span className="text-ink-secondary text-[12px]">
                    {t("email")}
                  </span>
                  {/* Read-only: no endpoint changes an email address. */}
                  <input
                    defaultValue={user?.email ?? ""}
                    readOnly
                    dir="ltr"
                    className={`${field} text-ink-tertiary`}
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-ink-secondary text-[12px]">
                    {t("phone")}
                  </span>
                  <input
                    name="phone"
                    type="tel"
                    defaultValue={user?.phoneNumber ?? ""}
                    dir="ltr"
                    className={field}
                  />
                </label>

                {error && (
                  <p className="text-error text-[13px] font-medium" role="alert">
                    {t(`errors.${error}` as "errors.requestFailed")}
                  </p>
                )}
                {saved === "profile" && (
                  <p className="text-action text-[13px] font-medium">
                    {t("savedProfile")}
                  </p>
                )}

                <button
                  type="submit"
                  className="bg-aqua text-on-accent flex h-10 w-fit items-center rounded-20 px-5 text-[13px] font-semibold"
                >
                  {t("saveChanges")}
                </button>
              </form>
            </section>

            {/* Notifications — 651:9448 */}
            <section
              id="notifications"
              className="bg-base border-line rounded-12 border p-6"
            >
              <h2 className="text-[15px] font-semibold">
                {t("notificationsTitle")}
              </h2>

              <form action={saveNotificationsAction} className="mt-4 flex flex-col">
                <input type="hidden" name="locale" value={locale} />

                {NOTIFICATION_GROUPS.map((group, index) => {
                  const channels = prefs?.[group];
                  const on = Boolean(channels?.push || channels?.email);
                  return (
                    <label
                      key={group}
                      className={`flex cursor-pointer items-center gap-4 py-3.5 ${
                        index < NOTIFICATION_GROUPS.length - 1
                          ? "border-line-subtle border-b"
                          : ""
                      }`}
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-[13px] font-medium">
                          {t(`notifications.${group}.title`)}
                        </span>
                        <span className="text-ink-tertiary text-[11px]">
                          {t(`notifications.${group}.body`)}
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        name={group}
                        defaultChecked={on}
                        className="peer sr-only"
                      />
                      <span
                        aria-hidden
                        className="bg-fill-100 peer-checked:bg-action flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors"
                      >
                        <span className="bg-base size-5 rounded-full transition-transform peer-checked:translate-x-5" />
                      </span>
                    </label>
                  );
                })}

                {saved === "notifications" && (
                  <p className="text-action mt-4 text-[13px] font-medium">
                    {t("savedNotifications")}
                  </p>
                )}

                <button
                  type="submit"
                  className="bg-aqua text-on-accent mt-5 flex h-10 w-fit items-center rounded-20 px-5 text-[13px] font-semibold"
                >
                  {t("saveChanges")}
                </button>
              </form>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
