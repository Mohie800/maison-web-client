"use server";

import { redirect } from "next/navigation";
import { serverApiFetch } from "@/lib/api/server";

/**
 * `POST /support/contact` — the Help Center's message form (Figma `651:16372`).
 *
 * Anonymous posts are accepted and filed against the `name` and `email` on the
 * body; a bearer token, when present, ties the ticket to that account. The
 * `security` block on the operation in `/docs-json` still declares bearer as
 * required — it is wrong, and reading it is what produced GAP-57.
 *
 * A success returns a `ticketId`, which the page shows back so the sender has a
 * reference to quote.
 */
export async function sendSupportMessage(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const base = `/${locale}/help/contact`;

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const category = String(formData.get("category") ?? "general");

  if (!name || !email || !subject || !message) {
    redirect(`${base}?error=missingFields`);
  }

  // The API's own minimums, so a short subject fails here rather than as a 400.
  if (subject.length < 5 || message.length < 10) {
    redirect(`${base}?error=tooShort`);
  }

  let ticketId: string | undefined;
  try {
    const result = await serverApiFetch<{ ticketId?: string }>(
      "/support/contact",
      { method: "POST", body: { name, email, subject, message, category } },
    );
    ticketId = result?.ticketId;
  } catch {
    redirect(`${base}?error=requestFailed`);
  }

  redirect(`${base}?sent=1${ticketId ? `&ticket=${encodeURIComponent(ticketId)}` : ""}`);
}
