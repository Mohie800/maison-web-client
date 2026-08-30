import { setRequestLocale } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { ProfileSetupForm } from "@/features/auth/components/profile-setup-form";

/** Gated by proxy.ts — /onboarding is in PROTECTED_PREFIXES. */
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // The frame prefills Full name; sign-up already asked for it.
  const user = await getCurrentUser();

  return <ProfileSetupForm defaultName={user?.fullName ?? ""} />;
}
