import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatPrice } from "@/lib/format/money";
import { OrderStatusBadge } from "./order-status-badge";
import { orderItemImage, orderReference, orderStatus } from "../helpers";
import type { Order } from "@/lib/api/schemas/order";

/** One order in the My Orders list — Figma node 651:8208. */
export async function OrderCard({ order }: { order: Order }) {
  const t = await getTranslations("Orders");
  const locale = await getLocale();

  const items = order.items ?? order.shipments?.flatMap((s) => s.items ?? []) ?? [];
  const status = orderStatus(order);
  const placed = order.placedAt ?? order.createdAt;

  return (
    <article className="bg-base border-line overflow-hidden rounded-16 border">
      <header className="border-line flex flex-wrap items-center justify-between gap-3 border-b p-5">
        <div className="flex flex-col gap-1">
          <span className="text-label" dir="ltr">
            {orderReference(order)}
          </span>
          <span className="text-caption text-ink-tertiary">
            {placed
              ? new Intl.DateTimeFormat(
                  locale === "ar" ? "ar-SA-u-nu-latn" : "en-GB",
                  { day: "numeric", month: "short", year: "numeric" },
                ).format(new Date(placed))
              : ""}
            {items.length > 0 && (
              <>
                {" · "}
                {t("itemCount", { count: items.length })}
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <OrderStatusBadge status={status} />
          <span className="text-h3">
            {formatPrice(order.totalAmount, order.currency ?? "SAR")}
          </span>
        </div>
      </header>

      {items.length > 0 && (
        <ul className="divide-line divide-y">
          {items.slice(0, 4).map((item, index) => {
            const image = resolveMediaUrl(orderItemImage(item));
            return (
              <li
                key={item.id ?? `${order.id}-${index}`}
                className="flex items-center gap-4 p-5"
              >
                <span className="bg-surface size-12 shrink-0 overflow-hidden rounded-8">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                    <img src={image} alt="" className="size-full object-cover" />
                  ) : null}
                </span>
                <span className="text-body min-w-0 flex-1 truncate" dir="auto">
                  {item.title ?? item.listing?.title ?? ""}
                </span>
                <span className="text-body shrink-0">
                  {formatPrice(item.price, order.currency ?? "SAR")}
                </span>
              </li>
            );
          })}
          {items.length > 4 && (
            <li className="text-caption text-ink-tertiary px-5 py-3">
              {t("andMore", { count: items.length - 4 })}
            </li>
          )}
        </ul>
      )}

      <footer className="border-line flex flex-wrap gap-3 border-t p-5">
        <Link
          href={`/account/orders/${order.id}`}
          className="bg-action-tint text-action text-label flex h-10 items-center rounded-[20px] px-4 font-semibold"
        >
          {t("trackOrder")}
        </Link>
        <Link
          href={`/account/orders/${order.id}/invoice`}
          className="border-line text-label flex h-10 items-center rounded-[20px] border px-4"
        >
          {t("viewInvoice")}
        </Link>
        {/*
          "Leave Review" only once delivered — POST /reviews rejects items that
          aren't, so offering it earlier would just produce an error.
        */}
        {status === "delivered" && (
          <Link
            href={`/account/orders/${order.id}/review`}
            className="border-line text-label flex h-10 items-center rounded-[20px] border px-4"
          >
            {t("leaveReview")}
          </Link>
        )}
      </footer>
    </article>
  );
}
