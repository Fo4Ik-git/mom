import { setRequestLocale } from "next-intl/server";
import { SignUpForm } from "@/app/components/auth/signup-form";
import { PageShell } from "@/app/components/layout/page-shell";
import { normalizeAccessKeyCode } from "@/lib/access-key-code";

export default async function SignUpPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ key?: string; invite?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);

  const rawKey = query.key ?? query.invite ?? "";
  const initialAccessKey = rawKey ? normalizeAccessKeyCode(rawKey) : "";

  return (
    <PageShell width="narrow" className="flex min-h-[70vh] items-center justify-center">
      <SignUpForm initialAccessKey={initialAccessKey} />
    </PageShell>
  );
}
