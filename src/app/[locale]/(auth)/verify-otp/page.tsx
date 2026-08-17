import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { OtpForm } from "@/features/auth/components/otp-form";

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
      <OtpForm />
    </Suspense>
  );
}
