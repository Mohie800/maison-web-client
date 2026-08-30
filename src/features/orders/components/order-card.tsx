import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatPrice } from "@/lib/format/money";
import { OrderStatusBadge } from "./order-status-badge";
import {
  orderItemImage,
  orderItemPrice,
  orderItemTitle,
  orderReference,
  orderStatus,
} from "../helpers";
import type { Order } from "@/lib/api/schemas/order";

/** One order in the My Orders list — Figma node 651:8208. */
export async function OrderCard({ order }: { order: Order }) {
  const t = await getTranslations("Orders");
  const locale = await getLocale();

  const items = order.items ?? order.shipments?.flatMap((s) => s.items ?? []) ?? [];
  const status = orderStatus(order);
  const placed = order.placedAt ?? order.createdAt;

  return (
    <article className="bg-base border-line-200 overflow-hidden rounded-12 border">
      <header className="border-fill-100 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3.5">
        <div className="flex flex-col gap-1">
          <span className="text-label" dir="ltr">
            {orderReference(order)}
          </span>
          <span className="text-ink-500 text-[11px]">
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
          <span className="text-ink-900 text-[14px] font-bold">
            {formatPrice(order.totalAmount, order.currency ?? "SAR")}
          </span>
        </div>
      </header>

      {items.length > 0 && (
        <ul className="divide-fill-100 divide-y">
          {items.slice(0, 4).map((item, index) => {
            const image = resolveMediaUrl(orderItemImage(item));
            return (
              <li
                key={item.id ?? `${order.id}-${index}`}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <span className="bg-fill-100 size-11 shrink-0 overflow-hidden rounded-8">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                    <img src={image} alt="" className="size-full object-cover" />
                  ) : null}
                </span>
                <span className="text-ink-700 min-w-0 flex-1 truncate text-[13px]" dir="auto">
                  {orderItemTitle(item)}
                </span>
                <span className="text-ink-900 shrink-0 text-[13px] font-medium">
                  {formatPrice(orderItemPrice(item), order.currency ?? "SAR")}
                </span>
              </li>
            );
          })}
          {items.length > 4 && (
            <li className="text-ink-500 px-4 py-2.5 text-[13px]">
              {t("andMore", { count: items.length - 4 })}
            </li>
          )}
        </ul>
      )}

      <footer className="border-fill-100 flex flex-wrap gap-2.5 border-t px-4 py-3">
        <Link
          href={`/account/orders/${order.id}`}
          className="bg-action-tint text-action flex h-[34px] items-center rounded-8 px-4 text-[12px] font-medium"
        >
          {t("trackOrder")}
        </Link>
        <Link
          href={`/account/orders/${order.id}/invoice`}
          className="border-line-200 text-ink-700 flex h-[34px] items-center rounded-8 border px-4 text-[12px]"
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
            className="border-line-200 text-ink-700 flex h-[34px] items-center rounded-8 border px-4 text-[12px]"
          >
            {t("leaveReview")}
          </Link>
        )}
      </footer>
    </article>
  );
}
