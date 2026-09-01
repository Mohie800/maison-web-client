import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { InboxShell } from "@/features/inbox/components/inbox-shell";

/** Inbox — Figma `651:6796`, with no thread selected. */
export const metadata: Metadata = { robots: { index: false } };

export default async function InboxPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <InboxShell locale={locale} activeId={null} query={await searchParams} />;
}
