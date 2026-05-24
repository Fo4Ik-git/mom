import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { SignInForm } from "@/app/components/auth/signin-form";
import { PageShell } from "@/app/components/layout/page-shell";

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <PageShell className="flex min-h-[70vh] max-w-lg items-center justify-center">
      <Suspense>
        <SignInForm />
      </Suspense>
    </PageShell>
  );
}
