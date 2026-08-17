import { setRequestLocale } from "next-intl/server";
import { UtilBar } from "@/components/layout/util-bar";
import { SiteHeader } from "@/components/layout/site-header";
import { SubNav } from "@/components/layout/sub-nav";
import { SiteFooter } from "@/components/layout/site-footer";

/**
 * Public storefront chrome. The (auth) group deliberately has none — those
 * screens are chromeless in the design.
 */
export default async function StorefrontLayout({
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
      <SubNav />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
