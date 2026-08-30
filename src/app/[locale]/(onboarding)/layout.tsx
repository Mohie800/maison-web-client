import { setRequestLocale } from "next-intl/server";

/**
 * Onboarding shell — Figma `651:16704` / `651:16726`.
 *
 * These two frames have no brand panel: the card sits centred on the surface
 * tint. That is why they live outside `(auth)`, whose layout draws the
 * split screen.
 */
export default async function OnboardingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="bg-surface flex min-h-dvh flex-1 justify-center px-6 py-16">
      {children}
    </div>
  );
}
