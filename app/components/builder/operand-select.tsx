"use client";

import type { FormulaOperand } from "@/types/calculator";
import type { OperandOption } from "@/lib/formula/operand-labels";
import { operandToOptionValue, optionValueToOperand } from "@/lib/formula/operand-labels";

interface OperandSelectProps {
  label: string;
  value: FormulaOperand;
  options: OperandOption[];
  onChange: (operand: FormulaOperand) => void;
}

export function OperandSelect({
  label,
  value,
  options,
  onChange,
}: OperandSelectProps) {
  const selected =
    value.kind === "group"
      ? ""
      : operandToOptionValue(value);

  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <select
        value={selected}
        onChange={(e) => onChange(optionValueToOperand(e.target.value, options))}
        className="h-11 w-full rounded-xl border border-border bg-input px-3 text-sm"
      >
        <option value="" disabled>
          —
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
