import { NextResponse } from "next/server";
import { serverApiFetch } from "@/lib/api/server";
import { getWalletTransactions } from "@/lib/api/endpoints/wallet";
import { getMyListings } from "@/lib/api/endpoints/my-listings";
import { getSellerOrders } from "@/lib/api/endpoints/seller-orders";
import { getPlatformFees } from "@/lib/api/endpoints/settings";
import {
  getVendorDemographics,
  getVendorSales,
  trailingWindow,
} from "@/lib/api/endpoints/vendor";

/**
 * The Vendor Portal's report downloads — `16_VP_Reports` (`651:15642`).
 *
 * There is no export endpoint on the API, so every CSV is assembled here from
 * endpoints the portal already reads.
 *
 * All six of the frame's reports work since Round 9: `order.vatAmount` and the
 * `vat` block on `/settings/fees` (GAP-115) made the Tax Summary possible, and
 * `shipment.earnings` (GAP-112) means the sales and tax figures are the
 * server's own rather than anything computed here.
 *
 * Generated per request, so nothing is stored and the frame's "Recent
 * Downloads" list has nothing to list (plans/09 C81).
 */

/** RFC 4180: quote when the value contains a comma, quote or newline. */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(","));
  // A BOM so Excel opens Arabic titles as UTF-8 rather than mojibake.
  return "﻿" + lines.join("\r\n") + "\r\n";
}

export const REPORT_TYPES = [
  "sales",
  "orders",
  "payments",
  "inventory",
  "customers",
  "tax",
] as const;

type ReportType = (typeof REPORT_TYPES)[number];

async function build(type: ReportType): Promise<{ headers: string[]; rows: unknown[][] }> {
  switch (type) {
    case "sales": {
      const sales = await getVendorSales(trailingWindow(90));
      return {
        headers: ["Date", "Revenue", "Orders", "Currency"],
        rows: (sales.chartData ?? []).map((point) => [
          point.date,
          point.amount ?? 0,
          point.orderCount ?? 0,
          sales.currency ?? "SAR",
        ]),
      };
    }
    case "orders": {
      const orders = await getSellerOrders({ status: "all" });
      return {
        headers: [
          "Order",
          "Shipment",
          "Status",
          "Items",
          "Subtotal",
          "Shipping",
          "Currency",
          "Placed",
          "Shipped",
          "Delivered",
          "Tracking",
        ],
        rows: orders.items.map((s) => [
          s.order?.orderNumber ?? "",
          s.id,
          s.status,
          (s.items ?? []).length,
          s.subtotalAmount ?? "",
          s.shippingAmount ?? "",
          s.order?.currency ?? "SAR",
          s.createdAt ?? "",
          s.shippedAt ?? "",
          s.deliveredAt ?? "",
          s.trackingNumber ?? "",
        ]),
      };
    }
    case "payments": {
      const tx = await getWalletTransactions({ group: "all", limit: 200 });
      return {
        headers: [
          "Date",
          "Type",
          "Reason",
          "Status",
          "Amount",
          "Currency",
          "Gross",
          "Platform fee",
          "Net",
          "Note",
        ],
        rows: tx.items.map((row) => [
          row.createdAt ?? "",
          row.type ?? "",
          row.reason ?? "",
          row.status ?? "",
          row.amount ?? "",
          row.currency ?? "SAR",
          row.breakdown?.grossAmount ?? "",
          row.breakdown?.platformFeeAmount ?? "",
          row.breakdown?.netAmount ?? "",
          row.note ?? "",
        ]),
      };
    }
    case "inventory": {
      const listings = await getMyListings({ filter: "all" });
      return {
        headers: [
          "Title",
          "Status",
          "Price",
          "Currency",
          "Quantity",
          "Views",
          "Likes",
          "Sold",
          "Listed",
          "Expires",
        ],
        rows: listings.items.map((l) => [
          l.title,
          l.status,
          l.price ?? "",
          l.currency ?? "SAR",
          l.quantity ?? "",
          l.viewCount ?? 0,
          l.likeCount ?? 0,
          l.soldCount ?? 0,
          l.createdAt ?? "",
          l.expiresAt ?? "",
        ]),
      };
    }
    case "tax": {
      /*
        VAT is collected from the buyer and remitted by the platform to ZATCA
        (GAP-115), so this is a record of tax collected on the seller's sales,
        not a liability of theirs. Every figure is the server's: `vatAmount`
        from the order, the split from `shipment.earnings`.
      */
      const [orders, fees] = await Promise.all([
        getSellerOrders({ status: "all" }),
        getPlatformFees().catch(() => null),
      ]);
      return {
        headers: [
          "Order",
          "Placed",
          "Status",
          "Currency",
          "Gross",
          "Shipping",
          `VAT (${fees?.vat?.ratePercent ?? 15}%, collected by ${fees?.vat?.collectedBy ?? "platform"})`,
          `Platform fee (${fees?.platformFeePercent ?? 15}%)`,
          "Net to seller",
        ],
        rows: orders.items.map((s) => [
          s.order?.orderNumber ?? "",
          s.createdAt ?? "",
          s.status,
          s.order?.currency ?? "SAR",
          s.earnings?.grossAmount ?? s.subtotalAmount ?? "",
          s.earnings?.shippingAmount ?? s.shippingAmount ?? "",
          s.order?.vatAmount ?? "",
          s.earnings?.platformFeeAmount ?? "",
          s.earnings?.netAmount ?? "",
        ]),
      };
    }
    case "customers": {
      const demo = await getVendorDemographics(trailingWindow(90));
      return {
        headers: ["Dimension", "Value", "Customers", "Share %"],
        rows: [
          ...demo.byCity.map((r) => ["City", r.city ?? "", r.count ?? 0, r.percentage ?? 0]),
          ...demo.byCountry.map((r) => [
            "Country",
            r.country ?? "",
            r.count ?? 0,
            r.percentage ?? 0,
          ]),
        ],
      };
    }
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;

  if (!(REPORT_TYPES as readonly string[]).includes(type)) {
    return NextResponse.json({ error: "Unknown report" }, { status: 404 });
  }

  try {
    // Cheap way to confirm the session before doing the real work.
    await serverApiFetch("/users/me");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { headers, rows } = await build(type as ReportType);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `${type}-report-${stamp}.csv`;

  return new NextResponse(toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
