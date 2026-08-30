import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { getSocialAuthConfig } from "@/lib/api/endpoints/settings";
import { SignInForm } from "@/features/auth/components/sign-in-form";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // A failure here shouldn't block sign-in; no providers is the safe answer.
  const social = await getSocialAuthConfig().catch(() => null);

  // useSearchParams needs a Suspense boundary to keep the shell static.
  return (
    <Suspense>
      <SignInForm socialProviders={social?.providers ?? []} />
    </Suspense>
  );
}
