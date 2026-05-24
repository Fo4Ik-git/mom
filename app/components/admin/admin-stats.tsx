"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Card } from "@/app/components/ui/card";
import { appFetch } from "@/lib/api-client";

interface Stats {
  users: number;
  calculators: number;
  templates: number;
  publicCalculators: number;
}

export function AdminStats() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    appFetch("/api/admin/stats")
      .then((res) => res.json())
      .then(setStats);
  }, []);

  if (!stats) {
    return <p className="text-muted-foreground">{tc("loading")}</p>;
  }

  const cards = [
    { label: t("statsUsers"), value: stats.users },
    { label: t("statsCalculators"), value: stats.calculators },
    { label: t("statsTemplates"), value: stats.templates },
    { label: t("statsPublic"), value: stats.publicCalculators },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <p className="text-sm text-muted-foreground">{card.label}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums">{card.value}</p>
        </Card>
      ))}
    </div>
  );
}
