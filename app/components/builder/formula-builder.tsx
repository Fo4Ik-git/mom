"use client";

import type { BlockExpression, CalculatorConfig } from "@/types/calculator";
import { FormulaScratchEditor } from "@/app/components/builder/scratch/formula-scratch-editor";

interface FormulaBuilderProps {
  config: CalculatorConfig;
  outputIndex: number;
  outputKey: string;
  expression: BlockExpression;
  onChange: (expression: BlockExpression) => void;
}

export function FormulaBuilder({
  config,
  outputIndex,
  outputKey,
  expression,
  onChange,
}: FormulaBuilderProps) {
  return (
    <FormulaScratchEditor
      config={config}
      outputIndex={outputIndex}
      outputKey={outputKey}
      expression={expression}
      onChange={onChange}
    />
  );
}
