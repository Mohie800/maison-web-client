import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { HelpShell } from "@/features/help/components/help-shell";
import { sendSupportMessage } from "@/features/help/actions";
import { SUPPORT_EMAIL } from "@/lib/config/support";

/**
 * Help Center — Contact Us, Figma `651:16326` (Web_HelpCenter_Contact).
 *
 * The form is real: `POST /support/contact` returns a ticket id, which is shown
 * back after a successful send.
 *
 * The frame offers three contact methods and one exists. **Live Chat** has no
 * chat system behind it, and **WhatsApp** has no number — the only support
 * phone the API exposes is masked (`+966 11 *** 8800`, on the invoice issuer
 * block), so there is nothing to open. Both are omitted rather than rendered as
 * buttons that do nothing (plans/09 C19). Email Support is a real `mailto:`.
 */
export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "Help" });
  return { title: t("contactTitle"), description: t("subtitle") };
}

const CATEGORIES = [
  "general",
  "order_issue",
  "technical",
  "account",
  "payment",
  "seller_support",
  "other",
] as const;

export default async function HelpContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sent?: string; ticket?: string; error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Help");
  const query = await searchParams;

  const field =
    "bg-fill-50 border-line h-11 rounded-8 border px-3.5 text-[13px] outline-none focus:border-focus";

  return (
    <HelpShell active="contact">
      <h1 className="text-[22px] font-bold">{t("contactTitle")}</h1>

      {query.sent && (
        <p
          role="status"
          className="bg-action-tint text-action flex items-center gap-2 rounded-12 px-4 py-3 text-[13px]"
        >
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          {query.ticket
            ? t("sentWithTicket", { ticket: query.ticket })
            : t("sent")}
        </p>
      )}
      {query.error && (
        <p
          role="alert"
          className="text-error flex items-center gap-2 rounded-12 bg-error-tint px-4 py-3 text-[13px]"
        >
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {t(
            `errors.${
              query.error === "missingFields" || query.error === "tooShort"
                ? query.error
                : "requestFailed"
            }`,
          )}
        </p>
      )}

      {/* Methods — 651:16356. Email is the one with something behind it. */}
      <div className="bg-info-tint flex flex-col items-start gap-2.5 rounded-[14px] p-5">
        <p className="text-info text-[15px] font-bold">{t("emailSupport")}</p>
        <p className="text-info text-[12px]">{t("emailSupportBody")}</p>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="bg-info text-base flex h-9 items-center justify-center rounded-[18px] px-4 text-[12px] font-bold"
        >
          {t("sendEmail")}
        </a>
      </div>

      {/* Form — 651:16372 */}
      <form
        action={sendSupportMessage}
        className="bg-base border-line flex flex-col gap-4 rounded-16 border p-6"
      >
        <input type="hidden" name="locale" value={locale} />
        <h2 className="text-[18px] font-semibold">{t("formTitle")}</h2>

        <div className="flex flex-col gap-4 sm:flex-row">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-ink-700 text-[12px] font-medium">
              {t("fields.name")}
            </span>
            <input name="name" required className={field} dir="auto" />
          </label>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-ink-700 text-[12px] font-medium">
              {t("fields.email")}
            </span>
            <input name="email" type="email" required className={field} dir="ltr" />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-ink-700 text-[12px] font-medium">
            {t("fields.category")}
          </span>
          <select name="category" className={field} defaultValue="general">
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {t(`categories.${category}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-ink-700 text-[12px] font-medium">
            {t("fields.subject")}
          </span>
          <input
            name="subject"
            required
            minLength={5}
            placeholder={t("fields.subjectPlaceholder")}
            className={field}
            dir="auto"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-ink-700 text-[12px] font-medium">
            {t("fields.message")}
          </span>
          <textarea
            name="message"
            required
            minLength={10}
            rows={4}
            placeholder={t("fields.messagePlaceholder")}
            className="bg-fill-50 border-line min-h-[100px] rounded-8 border px-3.5 py-3 text-[13px] outline-none focus:border-focus"
            dir="auto"
          />
        </label>

        <button
          type="submit"
          className="bg-aqua flex h-12 w-fit items-center justify-center rounded-[24px] px-8 text-[14px] font-bold text-black"
        >
          {t("sendMessage")}
        </button>
      </form>
    </HelpShell>
  );
}
