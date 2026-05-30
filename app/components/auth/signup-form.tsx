"use client";

import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { FormField } from "@/app/components/ui/form-field";
import { PasswordInput } from "@/app/components/ui/password-input";
import { Link, useRouter } from "@/i18n/navigation";
import { appFetch } from "@/lib/api/api-client";
import { normalizeAccessKeyCode } from "@/lib/access/access-key-code";

type KeyCheckState =
  | "idle"
  | "checking"
  | "valid"
  | "invalid"
  | "expired"
  | "exhausted"
  | "inactive";

export function SignUpForm({ initialAccessKey = "" }: { initialAccessKey?: string }) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();
  const passwordId = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessKey, setAccessKey] = useState(initialAccessKey);
  const [keyState, setKeyState] = useState<KeyCheckState>("idle");
  const [keyLabel, setKeyLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAccessKey(initialAccessKey);
  }, [initialAccessKey]);

  useEffect(() => {
    const normalized = normalizeAccessKeyCode(accessKey);
    if (normalized.length < 4) {
      setKeyState("idle");
      setKeyLabel(null);
      return;
    }

    setKeyState("checking");
    const timer = setTimeout(async () => {
      try {
        const response = await appFetch(
          `/api/auth/access-key?code=${encodeURIComponent(normalized)}`,
        );
        const data = await response.json();
        if (data.valid) {
          setKeyState("valid");
          setKeyLabel(data.label ?? null);
        } else {
          setKeyState((data.reason as KeyCheckState) ?? "invalid");
          setKeyLabel(null);
        }
      } catch {
        setKeyState("invalid");
        setKeyLabel(null);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [accessKey]);

  function keyStateMessage(): string | null {
    switch (keyState) {
      case "valid":
        return keyLabel ? t("accessKeyValidWithLabel", { label: keyLabel }) : t("accessKeyValid");
      case "expired":
        return t("accessKeyExpired");
      case "exhausted":
        return t("accessKeyExhausted");
      case "inactive":
      case "invalid":
        return t("accessKeyInvalid");
      default:
        return null;
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const normalizedKey = normalizeAccessKeyCode(accessKey);
    if (normalizedKey.length < 4) {
      setError(t("accessKeyRequired"));
      setLoading(false);
      return;
    }

    if (keyState !== "valid") {
      setError(keyStateMessage() ?? t("accessKeyInvalid"));
      setLoading(false);
      return;
    }

    try {
      const response = await appFetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          name: name || undefined,
          email,
          password,
          accessKey: normalizedKey,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === "email_exists") {
          setError(t("emailExists"));
        } else if (data.error === "access_key_invalid") {
          setError(t("accessKeyInvalid"));
        } else if (data.error === "access_key_expired") {
          setError(t("accessKeyExpired"));
        } else if (data.error === "access_key_exhausted") {
          setError(t("accessKeyExhausted"));
        } else {
          setError(t("signUpError"));
        }
        return;
      }

      const signInResult = await signIn("credentials", {
        email: email.trim().toLowerCase(),
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

  const keyHint = keyStateMessage();
  const keyHintClass =
    keyState === "valid"
      ? "text-green-600 dark:text-green-400"
      : keyState === "idle" || keyState === "checking"
        ? "text-muted-foreground"
        : "text-destructive";

  return (
    <Card className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">{t("signUpTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("signUpInviteHint")}</p>

        {error && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            {error}
          </p>
        )}

        <label className="block space-y-1.5">
          <span className="text-sm text-muted-foreground">{t("accessKeyLabel")}</span>
          <input
            type="text"
            required
            autoComplete="off"
            spellCheck={false}
            value={accessKey}
            onChange={(e) => setAccessKey(e.target.value.toUpperCase())}
            placeholder="XXXXXXXXXX"
            className="block h-11 w-full rounded-xl border border-border bg-input px-3.5 font-mono text-sm tracking-widest"
          />
          {keyHint && (
            <p className={`text-xs ${keyHintClass}`}>
              {keyState === "checking" ? t("accessKeyChecking") : keyHint}
            </p>
          )}
        </label>

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

        <FormField label={t("passwordHint")} htmlFor={passwordId}>
          <PasswordInput
            id={passwordId}
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>

        <Button
          type="submit"
          disabled={loading || keyState === "checking"}
          className="w-full"
        >
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
