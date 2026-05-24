"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { appFetch } from "@/lib/api-client";

interface CalculatorSummary {
  id: string;
  name: string;
  slug: string;
  isPublic: boolean;
  updatedAt: string;
}

export function Dashboard() {
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const router = useRouter();
  const [calculators, setCalculators] = useState<CalculatorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloning, setCloning] = useState(false);

  useEffect(() => {
    appFetch("/api/calculators")
      .then((res) => res.json())
      .then((data) => setCalculators(data.calculators ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function cloneMomTemplate() {
    setCloning(true);
    const response = await appFetch("/api/calculators/clone-template", {
      method: "POST",
      body: JSON.stringify({ templateSlug: "mom" }),
    });
    const data = await response.json();
    setCloning(false);
    if (response.ok && data.calculator) {
      router.push(`/builder/${data.calculator.id}`);
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">{tc("loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Link href="/builder">
          <Button>{t("createNew")}</Button>
        </Link>
        <Button variant="outline" onClick={cloneMomTemplate} disabled={cloning}>
          {cloning ? t("cloning") : t("cloneMom")}
        </Button>
        <Link href="/c/mom">
          <Button variant="ghost">{t("openMomTemplate")}</Button>
        </Link>
      </div>

      {calculators.length === 0 ? (
        <p className="text-muted-foreground">{t("emptyList")}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {calculators.map((calculator) => (
            <li key={calculator.id}>
              <Card className="flex h-full flex-col">
                <h3 className="font-semibold">{calculator.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {calculator.isPublic ? tc("public") : tc("private")}
                </p>
                <div className="mt-4 flex gap-3 text-sm">
                  <Link href={`/c/${calculator.slug}`} className="font-medium text-accent underline">
                    {tc("open")}
                  </Link>
                  <Link
                    href={`/builder/${calculator.id}`}
                    className="text-muted-foreground underline"
                  >
                    {tc("edit")}
                  </Link>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
