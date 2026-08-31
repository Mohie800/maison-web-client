import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getListings } from "@/lib/api/endpoints/listings";
import { requireUser } from "@/lib/auth/current-user";
import { coverPhotoUrl } from "@/lib/api/schemas/listing";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatPrice } from "@/lib/format/money";
import {
  StoryComposer,
  type ComposerListing,
} from "@/features/stories/components/story-composer";

/**
 * Add to Your Story — `651:2162` / `651:2210` / `651:2276`.
 *
 * The stories hub's "Your story" tile points here. The listings feed both the
 * "Your Listing" source on step 1 and the "Link to product" select on step 2,
 * and are read from `GET /listings?sellerId=…` rather than `GET /listings/me`,
 * which returns no photos.
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function AddStoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale, "/stories/new");

  const t = await getTranslations("Stories");
  const tListing = await getTranslations("Listing");

  const mine = await getListings({
    sellerId: user.id,
    status: "live",
    limit: 24,
  }).catch(() => ({ items: [] }));

  const listings: ComposerListing[] = mine.items.map((item) => ({
    id: item.id,
    title: item.title,
    price: formatPrice(item.price, item.currency ?? "SAR"),
    condition: item.condition
      ? tListing(`conditions.${item.condition}`)
      : null,
    photoUrl: resolveMediaUrl(coverPhotoUrl(item)),
    photoPath: coverPhotoUrl(item) ?? null,
  }));

  return (
    <div className="bg-surface flex min-h-screen justify-center px-4 py-10">
      <StoryComposer
        listings={listings}
        labels={{
          titles: {
            1: t("compose.title1"),
            2: t("compose.title2"),
            3: t("compose.title3"),
          },
          steps: {
            choose: t("compose.steps.choose"),
            edit: t("compose.steps.edit"),
            preview: t("compose.steps.preview"),
          },
          close: t("compose.close"),
          question: t("compose.question"),
          upload: {
            title: t("compose.upload.title"),
            body: t("compose.upload.body"),
            cta: t("compose.upload.cta"),
          },
          fromListing: {
            title: t("compose.fromListing.title"),
            body: t("compose.fromListing.body"),
            cta: t("compose.fromListing.cta"),
          },
          caption: t("compose.caption"),
          captionPlaceholder: t("compose.captionPlaceholder"),
          linkProduct: t("compose.linkProduct"),
          linkNone: t("compose.linkNone"),
          duration: t("compose.duration"),
          durationOption: t("compose.durationOption"),
          audience: t("compose.audience"),
          audienceOption: {
            everyone: t("compose.audienceOption.everyone"),
            followers: t("compose.audienceOption.followers"),
          },
          next: t("compose.next"),
          ready: t("compose.ready"),
          summary: t("compose.summary"),
          edit: t("compose.edit"),
          back: t("compose.back"),
          post: t("compose.post"),
          posting: t("compose.posting"),
          addToBag: t("compose.addToBag"),
          noListings: t("compose.noListings"),
          errors: {
            badImage: t("compose.errors.badImage"),
            unauthenticated: t("compose.errors.unauthenticated"),
            requestFailed: t("compose.errors.requestFailed"),
          },
        }}
      />
    </div>
  );
}
