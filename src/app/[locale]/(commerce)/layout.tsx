import { setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

/**
 * Cart, checkout and sell share the header and footer but not the util bar or
 * category sub-nav — the design keeps these screens focused on the task.
 * Gated by proxy.ts (PROTECTED_PREFIXES).
 */
export default async function CommerceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
