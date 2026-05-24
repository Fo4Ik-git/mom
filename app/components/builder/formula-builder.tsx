"use client";

import type { BlockExpression, CalculatorConfig } from "@/types/calculator";
import { FormulaScratchEditor } from "@/app/components/builder/scratch/formula-scratch-editor";
import type { FormulaTarget } from "@/lib/formula/formula-target";

interface FormulaBuilderProps {
  config: CalculatorConfig;
  formulaTarget: FormulaTarget;
  fieldKey: string;
  expression: BlockExpression;
  onChange: (expression: BlockExpression) => void;
}

export function FormulaBuilder({
  config,
  formulaTarget,
  fieldKey,
  expression,
  onChange,
}: FormulaBuilderProps) {
  return (
    <FormulaScratchEditor
      config={config}
      formulaTarget={formulaTarget}
      outputKey={fieldKey}
      expression={expression}
      onChange={onChange}
    />
  );
}
