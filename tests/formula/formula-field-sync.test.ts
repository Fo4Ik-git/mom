import { describe, expect, it } from "vitest";
import { emptyBlockExpression } from "@/types/calculator";
import {
  formulaFieldFromCode,
  formulaFieldToCode,
  serializeFormulaField,
} from "@/lib/formula/sync/formula-field-sync";
import { formatExpressionViaRegistry } from "@/lib/formula/nodes/registry";

const target = { fieldId: "output_total" };

describe("formula field sync (AST ↔ code)", () => {
  it("round-trips simple expression through code text", () => {
    const source = "field_item.qty * field_item.var_price + const_factor";
    const parsed = formulaFieldFromCode(source, target);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    const code = formulaFieldToCode(parsed.snapshot, target);
    const again = formulaFieldFromCode(code, target);
    expect(again.ok).toBe(true);
    if (again.ok) {
      expect(formatExpressionViaRegistry(again.snapshot.expression, target)).toBe(
        formatExpressionViaRegistry(parsed.snapshot.expression, target),
      );
    }
  });

  it("detects snapshot changes via serialize", () => {
    const a = serializeFormulaField({
      expression: emptyBlockExpression(),
    });
    const b = serializeFormulaField({
      expression: { type: "operand", operand: { kind: "number", value: 1 } },
    });
    expect(a).not.toBe(b);
  });
});
