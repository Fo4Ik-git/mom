import { setRequestLocale } from "next-intl/server";
import { SignUpForm } from "@/app/components/auth/signup-form";
import { PageShell } from "@/app/components/layout/page-shell";

export default async function SignUpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <PageShell className="flex min-h-[70vh] max-w-lg items-center justify-center">
      <SignUpForm />
    </PageShell>
  );
}
