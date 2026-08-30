import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { InboxShell } from "@/features/inbox/components/inbox-shell";

/** One conversation — the right pane of `651:6801`, rail still on screen. */
export const metadata: Metadata = { robots: { index: false } };

export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <InboxShell locale={locale} activeId={id} query={await searchParams} />;
}
