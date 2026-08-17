import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { SignInForm } from "@/features/auth/components/sign-in-form";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // useSearchParams needs a Suspense boundary to keep the shell static.
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
