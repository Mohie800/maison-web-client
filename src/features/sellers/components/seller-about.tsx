import { getTranslations } from "next-intl/server";
import { formatPrice } from "@/lib/format/money";
import type { SellerProfile } from "@/lib/api/schemas/seller";

/**
 * About tab — `651:9085`.
 *
 * Built from the policy fields the profile carries: `aboutText`, location,
 * shipping and returns terms, response rate and average ship time. Every row is
 * conditional, because most are null on most sellers; an "About" panel listing
 * eight empty rows would be worse than a short one.
 *
 * `responseRatePercent` and `avgShipTimeHours` are on the profile object rather
 * than in the (unmaintained) counters, and are null rather than zero when
 * unknown — so they're safe to read directly.
 */
export async function SellerAbout({ seller }: { seller: SellerProfile }) {
  const t = await getTranslations("Seller");

  const location = [seller.city, seller.country].filter(Boolean).join(", ");
  const shipsFrom = seller.shipsFromCity;

  const rows: { label: string; value: string }[] = [];

  if (location) rows.push({ label: t("about.location"), value: location });
  if (shipsFrom) rows.push({ label: t("about.shipsFrom"), value: shipsFrom });

  if (seller.freeShippingThreshold != null) {
    rows.push({
      label: t("about.freeShipping"),
      value: t("about.freeShippingOver", {
        amount: formatPrice(String(seller.freeShippingThreshold)),
      }),
    });
  }

  if (seller.returnsAccepted) {
    rows.push({
      label: t("about.returns"),
      value: seller.returnWindowDays
        ? t("about.returnsWindow", { days: seller.returnWindowDays })
        : t("about.returnsAccepted"),
    });
  } else if (seller.returnsAccepted === false) {
    rows.push({ label: t("about.returns"), value: t("about.returnsNone") });
  }

  if (seller.authenticityGuaranteed) {
    rows.push({
      label: t("about.authenticity"),
      value: t("about.authenticityGuaranteed"),
    });
  }

  if (seller.responseRatePercent != null) {
    rows.push({
      label: t("about.responseRate"),
      value: `${seller.responseRatePercent}%`,
    });
  }

  if (seller.avgShipTimeHours != null) {
    rows.push({
      label: t("about.shipTime"),
      value: t("about.shipTimeHours", { hours: seller.avgShipTimeHours }),
    });
  }

  if (!seller.aboutText && rows.length === 0) {
    return (
      <div className="border-line rounded-16 border p-10 text-center">
        <p className="text-body text-ink-tertiary">{t("aboutEmpty")}</p>
      </div>
    );
  }

  return (
    <div className="flex max-w-[760px] flex-col gap-8">
      {seller.aboutText && (
        <p
          className="text-body text-ink-secondary whitespace-pre-line"
          dir="auto"
        >
          {seller.aboutText}
        </p>
      )}

      {rows.length > 0 && (
        <dl className="overflow-hidden rounded-12">
          {rows.map((row, index) => (
            <div
              key={row.label}
              /* Zebra striping, matching the PDP specifications table. */
              className={`flex justify-between gap-6 px-4 py-3 ${
                index % 2 === 1 ? "bg-surface" : ""
              }`}
            >
              <dt className="text-caption text-ink-tertiary">{row.label}</dt>
              <dd className="text-caption text-end" dir="auto">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
