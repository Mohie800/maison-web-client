import { setRequestLocale } from "next-intl/server";
import { VendorSidebar } from "@/components/layout/vendor-sidebar";

/**
 * Vendor Portal shell — Flow 15.
 *
 * Deliberately without the storefront chrome: the frames are a rail plus a
 * content column and nothing else, and "Switch to Buyer View" in the rail is
 * the way back. Gated by proxy.ts via PROTECTED_PREFIXES.
 *
 * Padding here rather than per page, from the `Content` frame (`651:13541`):
 * 32px sides, 32 top, 64 bottom, 24 between blocks.
 */
export default async function VendorLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="bg-surface flex flex-1">
      <VendorSidebar />
      <main className="flex min-w-0 flex-1 flex-col gap-6 px-8 pt-8 pb-16">
        {children}
      </main>
    </div>
  );
}
