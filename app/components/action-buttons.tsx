"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/app/components/ui/button";

interface ActionButtonsProps {
  onCalculate: () => void;
  onClear: () => void;
}

export function ActionButtons({ onCalculate, onClear }: ActionButtonsProps) {
  const t = useTranslations("calculator");

  return (
    <div className="grid grid-cols-2 gap-3">
      <Button onClick={onCalculate} className="w-full">
        {t("calculate")}
      </Button>
      <Button variant="outline" onClick={onClear} className="w-full">
        {t("clear")}
      </Button>
    </div>
  );
}
