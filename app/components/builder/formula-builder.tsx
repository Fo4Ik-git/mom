"use client";

import type { FormulaTarget } from "@/lib/formula/core/formula-target";
import { FormulaUnifiedEditor } from "@/app/components/builder/formula-unified-editor";
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
  return (
    <FormulaUnifiedEditor
      config={config}
      formulaTarget={formulaTarget}
      fieldKey={fieldKey}
      fieldLabel={fieldLabel || fieldKey}
      expression={expression}
      locals={locals}
      onChange={onChange}
      codeReadOnly={codeReadOnly}
    />
  );
}
