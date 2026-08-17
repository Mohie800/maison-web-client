import { setRequestLocale } from "next-intl/server";
import { UtilBar } from "@/components/layout/util-bar";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

/**
 * Account area. Keeps the storefront chrome (the design shows the full header)
 * but no category sub-nav. Gated by proxy.ts via PROTECTED_PREFIXES.
 */
export default async function AccountLayout({
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
      <UtilBar />
      <SiteHeader />
      <main className="bg-surface flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
