"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FormulaScratchEditor } from "@/app/components/builder/scratch/formula-scratch-editor";
import { FormulaCodeModal } from "@/app/components/builder/formula-code-modal";
import type { FormulaTarget } from "@/lib/formula/core/formula-target";
import type { BlockExpression, CalculatorConfig, FormulaLocal } from "@/types/calculator";

interface FormulaBuilderProps {
  config: CalculatorConfig;
  formulaTarget: FormulaTarget;
  fieldKey: string;
  fieldLabel: string;
  expression: BlockExpression;
  locals?: FormulaLocal[];
  onChange: (
    expression: BlockExpression,
    locals?: FormulaLocal[] | null,
  ) => void;
  codeReadOnly?: boolean;
}

export function FormulaBuilder({
  config,
  formulaTarget,
  fieldKey,
  fieldLabel,
  expression,
  locals,
  onChange,
  codeReadOnly = false,
}: FormulaBuilderProps) {
  const t = useTranslations("builder");
  const [codeOpen, setCodeOpen] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setCodeOpen(true)}
          disabled={codeReadOnly}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-accent/40 hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={t("codeModeOpenFormula")}
        >
          <span aria-hidden className="font-mono text-[11px]">
            {"</>"}
          </span>
          {t("codeModeOpenFormula")}
        </button>
      </div>

      <FormulaScratchEditor
        config={config}
        formulaTarget={formulaTarget}
        outputKey={fieldKey}
        expression={expression}
        onChange={(next) => onChange(next, locals)}
      />

      <FormulaCodeModal
        open={codeOpen}
        title={t("codeModeFormulaTitle", { name: fieldLabel || fieldKey })}
        config={config}
        target={formulaTarget}
        expression={expression}
        locals={locals}
        onClose={() => setCodeOpen(false)}
        onApply={onChange}
      />
    </div>
  );
}
