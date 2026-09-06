import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getSeller } from "@/lib/api/endpoints/sellers";
import { saveStoreAction } from "@/features/vendor/actions";

/**
 * Edit Store — `651:14963` light / `651:12374` dark.
 *
 * Round 9 made the whole form writable (GAP-116). `PUT /users/me/profile` now
 * accepts `bio`, `aboutText`, `tags`, `bannerUrl`, `shipsFromCity`,
 * `freeShippingThreshold`, `returnsAccepted` and `returnWindowDays` alongside
 * the three fields it always took, so nothing here is decorative any more.
 *
 * The current values are read from `GET /sellers/{id}`, which is where the
 * store profile renders them from — `/users/me` carries the account, not the
 * storefront.
 *
 * **The banner is a URL field, not an uploader.** `bannerUrl` takes a string and
 * there is no banner upload endpoint; `POST /media` exists but is not wired to
 * this. A text field is honest about that; an upload button would not be
 * (plans/09 C82).
 */
export const metadata: Metadata = { robots: { index: false } };

const LABEL = "text-ink-700 text-[12px] font-medium";
const FIELD =
  "bg-fill-50 border-line-200 text-ink-900 rounded-8 h-11 w-full border ps-3.5 text-[13px]";
const AREA =
  "bg-fill-50 border-line-200 text-ink-900 rounded-8 w-full border p-3.5 text-[13px]";

export default async function EditStorePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const failed = Boolean((await searchParams).error);
  const t = await getTranslations("Vendor.editStore");
  const user = await getCurrentUser();
  const seller = user ? await getSeller(user.id).catch(() => null) : null;

  /* `tags` comes back as a string array; the form edits it comma-separated. */
  const tags = Array.isArray(seller?.tags) ? seller.tags.join(", ") : "";

  return (
    <form action={saveStoreAction} className="contents">
      <input type="hidden" name="locale" value={locale} />

      {/* TB — 651:15014 */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-ink-900 text-[24px] leading-[29px] font-bold">
          {t("title")}
        </h1>
        <div className="flex shrink-0 gap-3">
          <Link
            href="/vendor/store"
            className="border-line-200 text-ink-900 flex h-10 items-center rounded-[20px] border px-5 text-[13px]"
          >
            {t("cancel")}
          </Link>
          <button
            type="submit"
            className="bg-action text-base flex h-10 items-center rounded-[20px] px-5 text-[13px] font-bold"
          >
            {t("save")}
          </button>
        </div>
      </div>

      {failed && (
        <p className="bg-vp-error text-error rounded-10 px-4 py-3 text-[12px]">
          {t("error")}
        </p>
      )}

      {/* Form11 — 651:15024 */}
      <div className="bg-base dark:bg-tint border-line-200 flex flex-col gap-4 rounded-[14px] border p-6">
        <div className="flex flex-col gap-4 md:flex-row">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className={LABEL}>{t("name")}</span>
            <input
              name="fullName"
              required
              maxLength={120}
              dir="auto"
              defaultValue={user?.fullName ?? ""}
              className={FIELD}
            />
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className={LABEL}>{t("handle")}</span>
            <input
              name="username"
              dir="ltr"
              defaultValue={user?.username ?? ""}
              className={FIELD}
            />
          </label>
        </div>

        {/* BW — 651:15034 */}
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>{t("bio")}</span>
          <textarea
            name="bio"
            rows={3}
            maxLength={500}
            dir="auto"
            defaultValue={seller?.bio ?? ""}
            className={AREA}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>{t("about")}</span>
          <textarea
            name="aboutText"
            rows={4}
            maxLength={2000}
            dir="auto"
            defaultValue={seller?.aboutText ?? ""}
            className={AREA}
          />
        </label>

        <div className="flex flex-col gap-4 md:flex-row">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className={LABEL}>{t("city")}</span>
            <input
              name="city"
              dir="auto"
              defaultValue={user?.city ?? ""}
              className={FIELD}
            />
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className={LABEL}>{t("shipsFrom")}</span>
            <input
              name="shipsFromCity"
              dir="auto"
              defaultValue={seller?.shipsFromCity ?? ""}
              className={FIELD}
            />
          </label>
        </div>

        {/* TW11 — 651:15042. Comma-separated in, string array out. */}
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>{t("tags")}</span>
          <input
            name="tags"
            dir="auto"
            defaultValue={tags}
            placeholder={t("tagsPlaceholder")}
            className={FIELD}
          />
        </label>

        {/* BU11 — 651:15021, a URL rather than an uploader. See the note above. */}
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>{t("banner")}</span>
          <input
            name="bannerUrl"
            dir="ltr"
            defaultValue={seller?.bannerUrl ?? ""}
            placeholder="/uploads/banners/…"
            className={FIELD}
          />
        </label>
      </div>

      {/* The policy fields Store Settings draws but cannot save (GAP-116). */}
      <div className="bg-base dark:bg-tint border-line-200 flex flex-col gap-4 rounded-[14px] border p-6">
        <h2 className="text-ink-900 text-[15px] font-semibold">
          {t("policies")}
        </h2>
        <div className="flex flex-col gap-4 md:flex-row">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className={LABEL}>{t("freeShipping")}</span>
            <input
              name="freeShippingThreshold"
              type="number"
              min={0}
              step="0.01"
              dir="ltr"
              defaultValue={seller?.freeShippingThreshold ?? ""}
              className={FIELD}
            />
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className={LABEL}>{t("returnWindow")}</span>
            <input
              name="returnWindowDays"
              type="number"
              min={0}
              step={1}
              dir="ltr"
              defaultValue={seller?.returnWindowDays ?? ""}
              className={FIELD}
            />
          </label>
        </div>
        <label className="flex items-center gap-2.5">
          <input
            type="checkbox"
            name="returnsAccepted"
            value="true"
            defaultChecked={Boolean(seller?.returnsAccepted)}
            className="accent-action size-4"
          />
          <span className="text-ink-900 text-[13px]">{t("returnsAccepted")}</span>
        </label>
      </div>
    </form>
  );
}
