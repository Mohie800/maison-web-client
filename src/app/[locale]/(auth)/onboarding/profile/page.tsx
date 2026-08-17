import { setRequestLocale } from "next-intl/server";
import { ProfileSetupForm } from "@/features/auth/components/profile-setup-form";

/** Gated by proxy.ts — /onboarding is in PROTECTED_PREFIXES. */
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ProfileSetupForm />;
}
