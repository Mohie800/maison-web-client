import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CircleAlert, Clock, LoaderCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ApiError } from "@/lib/api/errors";
import { getBnplSession } from "@/lib/api/endpoints/bnpl";
import type { PaymentSession } from "@/lib/api/schemas/bnpl";
import { readBnplAttempt } from "@/features/checkout/bnpl-session";
import { SessionPoller } from "@/features/checkout/components/session-poller";
import { primaryCta } from "@/features/checkout/components/checkout-shell";

/**
 * Where Tabby / Tamara send the buyer back (`CHECKOUT_RESULT_URL_WEB`).
 * The query's `status` is ignored — only the session read decides.
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function CheckoutResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Checkout.bnpl.result");
  const query = await searchParams;
  const attempt = await readBnplAttempt();

  const raw = Array.isArray(query.sessionId) ? query.sessionId[0] : query.sessionId;
  const sessionId = raw || attempt?.sessionId;
  const back = attempt?.returnTo ?? "/cart";

  let session: PaymentSession | null = null;
  if (sessionId) {
    try {
      session = await getBnplSession(sessionId);
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) {
        const here = `/${locale}/checkout/result?sessionId=${encodeURIComponent(sessionId)}`;
        redirect(`/${locale}/sign-in?next=${encodeURIComponent(here)}`);
      }
      if (!(error instanceof ApiError && error.isNotFound)) throw error;
    }
  }

  if (session?.status === "completed") {
    redirect(
      session.orderId ? `/checkout/confirmed/${session.orderId}` : "/account/orders",
    );
  }
  if (session?.status === "cancelled") redirect(back);

  if (session?.status === "pending" || session?.status === "processing") {
    return (
      <Shell>
        <SessionPoller
          pending={
            <Message
              icon={<LoaderCircle className="size-10 animate-spin" aria-hidden />}
              title={t("confirmingTitle")}
              body={t("confirmingBody")}
            />
          }
          late={
            <Message
              icon={<Clock className="size-10" aria-hidden />}
              title={t("lateTitle")}
              body={t("lateBody")}
              action={{ href: "/account/orders", label: t("viewOrders") }}
            />
          }
        />
      </Shell>
    );
  }

  const outcome =
    session?.status === "failed"
      ? "failed"
      : session?.status === "expired"
        ? "expired"
        : "notFound";

  return (
    <Shell>
      <Message
        icon={<CircleAlert className="text-error size-10" aria-hidden />}
        title={t(`${outcome}Title`)}
        body={t(`${outcome}Body`)}
        action={
          outcome === "notFound"
            ? { href: "/account/orders", label: t("viewOrders") }
            : { href: back, label: t("backToCheckout") }
        }
      />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface min-h-full px-4 py-16">
      <div className="bg-base mx-auto flex max-w-[560px] flex-col items-center rounded-16 p-8 text-center">
        {children}
      </div>
    </div>
  );
}

function Message({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center gap-3" role="status">
      <span className="text-ink-tertiary">{icon}</span>
      <h1 className="text-h2">{title}</h1>
      <p className="text-body text-ink-secondary">{body}</p>
      {action && (
        <Link href={action.href} className={primaryCta("mt-4")}>
          {action.label}
        </Link>
      )}
    </div>
  );
}
