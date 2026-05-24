"use client";

import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";

export function SignInForm() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(t("signInError"));
      return;
    }

    const callback = searchParams.get("callbackUrl") ?? "/";
    router.push(callback);
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">{t("signInTitle")}</h1>

        {error && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            {error}
          </p>
        )}

        <label className="block space-y-1.5">
          <span className="text-sm text-muted-foreground">{tc("email")}</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block h-11 w-full rounded-xl border border-border bg-input px-3.5 text-sm"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm text-muted-foreground">{tc("password")}</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block h-11 w-full rounded-xl border border-border bg-input px-3.5 text-sm"
          />
        </label>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? t("signingIn") : t("signIn")}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {t("noAccount")}{" "}
          <Link href="/auth/signup" className="font-medium text-accent underline">
            {t("registerLink")}
          </Link>
        </p>
      </form>
    </Card>
  );
}
