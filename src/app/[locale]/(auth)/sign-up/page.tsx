import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { SignUpForm } from "@/features/auth/components/sign-up-form";

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
      <SignUpForm />
    </Suspense>
  );
}
