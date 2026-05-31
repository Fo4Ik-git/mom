import type { BlockExpression, CalculatorConfig, FormulaMacro } from "@/types/calculator";
import { emptyBlockExpression, slugifyId } from "@/types/calculator";
import { collectExpressionFieldRefs } from "@/lib/formula/nodes/collect-dependencies";
import { evaluateFormulaWithLocals } from "@/lib/formula/runtime/block-evaluate";

export function emptyMacro(): FormulaMacro {
  return {
    id: "macro_snippet",
    label: "",
    expression: emptyBlockExpression(),
  };
}

export function normalizeMacroLabel(macro: FormulaMacro): FormulaMacro {
  const label = macro.label.trim();
  if (!label) {
    return macro;
  }
  return {
    ...macro,
    label,
    id: macro.id.startsWith("macro_") ? macro.id : slugifyId(label, "macro"),
  };
}

export function validateMacros(config: CalculatorConfig): string[] {
  const macros = config.macros ?? [];
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const macro of macros) {
    const label = macro.label.trim() || macro.id;
    if (ids.has(macro.id)) {
      errors.push(`Макрос «${label}»: дубль id`);
    }
    ids.add(macro.id);

    for (const dep of collectExpressionFieldRefs(macro.expression)) {
      if (dep.kind === "output") {
        errors.push(`Макрос «${label}»: не може посилатися на результат`);
      }
      if (dep.kind === "calculation") {
        errors.push(`Макрос «${label}»: не може посилатися на розрахунок`);
      }
    }
  }

  return errors;
}

export function evaluateMacros(
  config: CalculatorConfig,
  quantities: Record<string, number>,
  calculations: Record<string, number>,
  outputs: Record<string, number>,
  lineItemRows: import("@/types/calculator").LineItemRowsState,
): Record<string, number> {
  const values: Record<string, number> = {};
  const macros = config.macros ?? [];
  const constants = config.constants ?? [];

  for (const macro of macros) {
    try {
      values[macro.id] = evaluateFormulaWithLocals(macro.expression, undefined, {
        quantities,
        lineItemRows,
        inputs: config.inputs,
        constants,
        calculations,
        outputs,
        macros: values,
      });
    } catch {
      values[macro.id] = 0;
    }
  }

  return values;
}

export function macroRefsInExpression(expression: BlockExpression): string[] {
  const ids: string[] = [];
  function walk(node: BlockExpression) {
    if (node.type === "empty") {
      return;
    }
    if (node.type === "operand" && node.operand.kind === "macro") {
      ids.push(node.operand.macroId);
      return;
    }
    if (node.type === "group") {
      walk(node.inner);
      return;
    }
    if (node.type === "aggregate") {
      for (const arg of node.args) {
        walk(arg);
      }
      return;
    }
    if (node.type === "rowAggregate") {
      walk(node.inner);
      return;
    }
    if (node.type === "conditional") {
      walk(node.condition);
      walk(node.whenTrue);
      walk(node.whenFalse);
      return;
    }
    if (node.type === "round") {
      walk(node.value);
      walk(node.decimals);
      return;
    }
    if (node.type === "operation") {
      walk(node.left);
      walk(node.right);
    }
  }
  walk(expression);
  return ids;
}
