import { getTranslations } from "next-intl/server";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatPrice } from "@/lib/format/money";

/**
 * The chrome every checkout step shares — Figma `651:7551`, `651:7740`,
 * `651:7841`, `651:7932`.
 *
 * The design puts the whole step inside one white card on a grey page, with the
 * primary action at the foot of that card rather than in the summary rail. These
 * primitives exist so the three steps can't drift apart again.
 */

/** Grey page, 1440 max, 80px gutters, 24px between the card and the rail. */
export function CheckoutPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface min-h-full">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-8 lg:flex-row lg:px-20">
        {children}
      </div>
    </div>
  );
}

/** The white card holding the step itself. */
export function CheckoutCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-base min-w-0 flex-1 rounded-16 p-6">
      <h1 className="text-h2 mb-5">{title}</h1>
      {children}
    </div>
  );
}

/** Uppercase micro-label above each block — DELIVERY ADDRESS, SHIPPING METHOD. */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-ink-tertiary mb-3 text-[11px] font-bold tracking-[0.08em] uppercase">
      {children}
    </h2>
  );
}

/** Hairline between blocks inside the card. */
export function CardDivider() {
  return <hr className="border-line my-6 border-0 border-t" />;
}

/**
 * The compact "what you're buying" row repeated at the top of every step.
 *
 * Bag items carry the full listing, so the photo and condition are already here
 * — no extra request. Size would come from the `attributes` blob, which isn't
 * queryable; see plans/09 C25.
 */
export function CheckoutLineItem({
  title,
  meta,
  price,
  currency = "SAR",
  image,
}: {
  title: string;
  meta?: string | null;
  price: string | null;
  currency?: string;
  image?: string | null;
}) {
  const src = resolveMediaUrl(image);

  return (
    <li className="border-line flex items-center gap-4 rounded-12 border p-3">
      <span className="bg-surface size-12 shrink-0 overflow-hidden rounded-8">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
          <img src={src} alt="" className="size-full object-cover" />
        ) : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-label truncate" dir="auto">
          {title}
        </span>
        {meta && (
          <span className="text-caption text-ink-tertiary truncate">{meta}</span>
        )}
      </span>
      <span className="text-label shrink-0">{formatPrice(price, currency)}</span>
    </li>
  );
}

export interface BreakdownRow {
  label: string;
  value: string;
  tone?: string;
}

/**
 * The totals repeated in the card above the CTA — PRICE BREAKDOWN on the
 * shipping step, ORDER BREAKDOWN on payment.
 *
 * Same figures as the rail, straight from `POST /orders/checkout/preview`.
 * Nothing is added up here.
 */
export function InlineBreakdown({
  rows,
  totalLabel,
  totalValue,
}: {
  rows: BreakdownRow[];
  totalLabel: string;
  totalValue: string;
}) {
  return (
    <dl className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-4">
          <dt className="text-body text-ink-secondary">{row.label}</dt>
          <dd className={`text-body ${row.tone ?? ""}`}>{row.value}</dd>
        </div>
      ))}
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-label">{totalLabel}</dt>
        <dd className="text-label">{totalValue}</dd>
      </div>
    </dl>
  );
}

/** "Secured · TLS 1.3 · PCI DSS" under the CTA. */
export async function SecurityNote({
  variant,
}: {
  variant: "shipping" | "payment";
}) {
  const t = await getTranslations("Checkout");
  return (
    <p className="text-caption text-ink-tertiary mt-3">
      {variant === "shipping" ? t("securedShipping") : t("securedPayment")}
    </p>
  );
}

/** Full-width mint pill — the primary action at the foot of each card. */
export function primaryCta(extra = ""): string {
  return `bg-aqua text-on-accent text-label flex h-12 w-full items-center justify-center gap-2 rounded-[24px] font-semibold ${extra}`;
}
