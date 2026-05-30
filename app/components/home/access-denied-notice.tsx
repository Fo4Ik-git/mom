"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { CALCULATOR_ACCESS_DENIED_NOTICE } from "@/lib/calculator/access-denied";

export function AccessDeniedNotice() {
  const t = useTranslations("home");
  const searchParams = useSearchParams();
  const router = useRouter();
  const notice = searchParams.get("notice");
  const showDenied = notice === CALCULATOR_ACCESS_DENIED_NOTICE;
  const [visible, setVisible] = useState(showDenied);

  useEffect(() => {
    if (!showDenied) {
      return;
    }
    setVisible(true);
    router.replace("/");
  }, [showDenied, router]);

  if (!visible) {
    return null;
  }

  return (
    <div
      role="alert"
      className="mb-6 rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm"
    >
      <p className="font-semibold text-foreground">{t("accessDeniedTitle")}</p>
      <p className="mt-1 text-muted-foreground">{t("accessDeniedMessage")}</p>
    </div>
  );
}
