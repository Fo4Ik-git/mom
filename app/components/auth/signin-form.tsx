"use client";

import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { FormField } from "@/app/components/ui/form-field";
import { PasswordInput } from "@/app/components/ui/password-input";
import { Link, useRouter } from "@/i18n/navigation";
import { appFetch } from "@/lib/api/api-client";

type SignInCheckResponse = {
  status?: string;
  messageKey?: string;
};

export function SignInForm() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      try {
        const check = await appFetch("/api/auth/signin-check", {
          method: "POST",
          body: JSON.stringify({ email: normalizedEmail, password }),
        });

        let checkData: SignInCheckResponse = {};
        try {
          checkData = (await check.json()) as SignInCheckResponse;
        } catch {
          // ignore invalid JSON
        }

        if (check.ok) {
          if (checkData.status === "banned") {
            setError(
              checkData.messageKey
                ? t(checkData.messageKey as "banReason_ACCESS_EXPIRED")
                : t("bannedGeneric"),
            );
            return;
          }

          if (checkData.status === "invalid") {
            setError(t("signInError"));
            return;
          }

          if (checkData.status !== "ok") {
            setError(t("signInError"));
            return;
          }
        } else if (check.status !== 403) {
          setError(
            check.status >= 500 ? t("networkError") : t("signInError"),
          );
          return;
        }
        // 403: pre-check blocked (e.g. dev LAN) — still try credentials sign-in.
      } catch {
        // Pre-check failed (network/config) — still try credentials sign-in.
      }

      const result = await signIn("credentials", {
        email: normalizedEmail,
        password,
        redirect: false,
      });

      if (result?.error || result?.ok === false) {
        setError(t("signInError"));
        return;
      }

      const callback = searchParams.get("callbackUrl");
      router.push(callback?.startsWith("/") ? callback : "/");
      router.refresh();
    } catch {
      setError(t("networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">{t("signInTitle")}</h1>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <FormField label={tc("email")} htmlFor={emailId}>
          <input
            id={emailId}
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block h-11 w-full rounded-xl border border-border bg-input px-3.5 text-base sm:text-sm"
          />
        </FormField>

        <FormField label={tc("password")} htmlFor={passwordId}>
          <PasswordInput
            id={passwordId}
            required
            minLength={8}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>

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
