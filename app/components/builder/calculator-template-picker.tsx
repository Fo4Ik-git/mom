"use client";

import { useTranslations } from "next-intl";
import { CALCULATOR_TEMPLATES } from "@/lib/calculator/script/templates";
import { parseScriptProject } from "@/lib/calculator/script/parse-project";
import { finalizeConfig } from "@/lib/calculator/config/sync";
import type { CalculatorConfig } from "@/types/calculator";
import { emptyCalculatorConfig } from "@/lib/calculator/config/defaults";

interface CalculatorTemplatePickerProps {
  autoTotalSuffix: string;
  onApply: (config: CalculatorConfig) => void;
}

export function CalculatorTemplatePicker({
  autoTotalSuffix,
  onApply,
}: CalculatorTemplatePickerProps) {
  const t = useTranslations("builder");

  function applyTemplate(templateId: string) {
    const template = CALCULATOR_TEMPLATES.find((item) => item.id === templateId);
    if (!template) {
      return;
    }
    const parsed = parseScriptProject(template.project, emptyCalculatorConfig);
    if (parsed.errors.length > 0 || !parsed.config) {
      return;
    }
    onApply(finalizeConfig(parsed.config, autoTotalSuffix));
  }

  return (
    <div className="rounded-2xl border border-dashed border-accent/40 bg-accent-muted/10 p-4">
      <p className="text-sm font-semibold text-foreground">{t("templatesTitle")}</p>
      <p className="mt-1 text-xs text-muted-foreground">{t("templatesDesc")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {CALCULATOR_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => applyTemplate(template.id)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-left text-sm transition hover:border-accent/50 hover:bg-muted/50"
          >
            <span className="font-medium text-foreground">{template.label}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {template.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
