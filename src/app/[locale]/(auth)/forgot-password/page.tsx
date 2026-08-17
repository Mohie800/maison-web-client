import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { ForgotPasswordForm } from "@/features/auth/components/password-forms";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
