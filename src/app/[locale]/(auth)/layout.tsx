import { setRequestLocale } from "next-intl/server";
import { AuthBrandPanel } from "@/features/auth/components/auth-brand-panel";

/**
 * Auth split-screen — Figma node 651:16404 and siblings.
 *
 * Two equal halves at 1440: the dark brand panel and a white form column with
 * the form centred at 400px. Below `lg` the brand panel drops away and the form
 * centres in the viewport.
 *
 * The brand panel is rendered here rather than per-page so it isn't re-mounted
 * when moving between sign-in, sign-up and OTP — the background stays put.
 */
export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="bg-base flex min-h-dvh flex-1">
      <AuthBrandPanel />

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  );
}
