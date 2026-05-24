"use client";

import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { appFetch } from "@/lib/api-client";

export function SignUpForm() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await appFetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name: name || undefined, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === "email_exists") {
          setError(t("emailExists"));
        } else {
          setError(t("signUpError"));
        }
        return;
      }

      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        router.push("/auth/signin");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError(t("signUpError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">{t("signUpTitle")}</h1>

        {error && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            {error}
          </p>
        )}

        <label className="block space-y-1.5">
          <span className="text-sm text-muted-foreground">{tc("name")}</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="block h-11 w-full rounded-xl border border-border bg-input px-3.5 text-sm"
          />
        </label>

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
          <span className="text-sm text-muted-foreground">{t("passwordHint")}</span>
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
          {loading ? t("signingUp") : t("signUp")}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {t("hasAccount")}{" "}
          <Link href="/auth/signin" className="font-medium text-accent underline">
            {t("signInLink")}
          </Link>
        </p>
      </form>
    </Card>
  );
}
