import type { BlockExpression, CalculatorConfig, FormulaLocal } from "@/types/calculator";
import type { LineItemRowsState } from "@/types/calculator";
import { collectExpressionFieldRefs } from "@/lib/formula/nodes/collect-dependencies";
import {
  evaluateBlockExpression,
  evaluateFormulaWithLocals,
} from "@/lib/formula/runtime/block-evaluate";
import { buildInitialLineItemRowsState } from "@/lib/calculator/fields/line-items";
import {
  evaluateMacros,
  validateMacros,
} from "@/lib/calculator/config/macros";

export type FormulaFieldKind = "calculation" | "output";

export type FormulaFieldNode = {
  kind: FormulaFieldKind;
  id: string;
  label: string;
  expression: BlockExpression;
  locals?: FormulaLocal[];
};

export function fieldNodeKey(kind: FormulaFieldKind, id: string): string {
  return `${kind}:${id}`;
}

export function listFormulaFields(config: CalculatorConfig): FormulaFieldNode[] {
  const calculations = (config.calculations ?? []).map((field) => ({
    kind: "calculation" as const,
    id: field.id,
    label: field.label,
    expression: field.expression,
    locals: field.locals,
  }));

  const outputs = config.outputs.map((field) => ({
    kind: "output" as const,
    id: field.id,
    label: field.label,
    expression: field.expression,
    locals: field.locals,
  }));

  return [...calculations, ...outputs];
}

export function collectFieldDependencies(
  expression: BlockExpression,
): Array<{ kind: FormulaFieldKind; id: string }> {
  return collectExpressionFieldRefs(expression);
}

function fieldLabel(config: CalculatorConfig, kind: FormulaFieldKind, id: string) {
  if (kind === "calculation") {
    const field = (config.calculations ?? []).find((item) => item.id === id);
    return field?.label.trim() || id;
  }
  const field = config.outputs.find((item) => item.id === id);
  return field?.label.trim() || id;
}

function formatCycle(config: CalculatorConfig, keys: string[]): string {
  return keys
    .map((key) => {
      const [kind, id] = key.split(":");
      return fieldLabel(config, kind as FormulaFieldKind, id);
    })
    .join(" → ");
}

export function validateFieldGraph(config: CalculatorConfig): string[] {
  const errors: string[] = [...validateMacros(config)];
  const fields = listFormulaFields(config);
  const known = new Set(fields.map((field) => fieldNodeKey(field.kind, field.id)));

  for (const field of fields) {
    const label = field.label.trim() || field.id;
    const prefix =
      field.kind === "calculation" ? "Поле розрахунку" : "Результат";

    for (const dep of collectFieldDependencies(field.expression)) {
      const depKey = fieldNodeKey(dep.kind, dep.id);

      if (dep.kind === field.kind && dep.id === field.id) {
        errors.push(`${prefix} «${label}»: не може посилатися на себе`);
        continue;
      }

      if (!known.has(depKey)) {
        errors.push(`${prefix} «${label}»: посилання на неіснуюче поле`);
      }
    }
  }

  const cycleKeys = findCycleKeys(fields);
  if (cycleKeys) {
    errors.push(`Циклічні посилання між полями: ${formatCycle(config, cycleKeys)}`);
  }

  return errors;
}

function findCycleKeys(fields: FormulaFieldNode[]): string[] | null {
  const depsByField = new Map<string, string[]>();

  for (const field of fields) {
    const key = fieldNodeKey(field.kind, field.id);
    depsByField.set(
      key,
      collectFieldDependencies(field.expression).map((dep) =>
        fieldNodeKey(dep.kind, dep.id),
      ),
    );
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  function dfs(node: string): string[] | null {
    if (visiting.has(node)) {
      const start = stack.indexOf(node);
      return stack.slice(start).concat(node);
    }
    if (visited.has(node)) {
      return null;
    }

    visiting.add(node);
    stack.push(node);

    for (const dep of depsByField.get(node) ?? []) {
      const cycle = dfs(dep);
      if (cycle) {
        return cycle;
      }
    }

    stack.pop();
    visiting.delete(node);
    visited.add(node);
    return null;
  }

  for (const field of fields) {
    const cycle = dfs(fieldNodeKey(field.kind, field.id));
    if (cycle) {
      return cycle;
    }
  }

  return null;
}

export function getFormulaEvaluationOrder(
  config: CalculatorConfig,
): FormulaFieldNode[] {
  const fields = listFormulaFields(config);
  if (fields.length === 0) {
    return [];
  }

  const orderIndex = new Map(
    fields.map((field, index) => [fieldNodeKey(field.kind, field.id), index]),
  );
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const field of fields) {
    const key = fieldNodeKey(field.kind, field.id);
    inDegree.set(key, 0);
    dependents.set(key, []);
  }

  for (const field of fields) {
    const key = fieldNodeKey(field.kind, field.id);
    for (const dep of collectFieldDependencies(field.expression)) {
      const depKey = fieldNodeKey(dep.kind, dep.id);
      if (depKey === key || !inDegree.has(depKey)) {
        continue;
      }
      inDegree.set(key, (inDegree.get(key) ?? 0) + 1);
      dependents.get(depKey)?.push(key);
    }
  }

  const ready = [...inDegree.entries()]
    .filter(([, degree]) => degree === 0)
    .map(([key]) => key)
    .sort((a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0));

  const sortedKeys: string[] = [];

  while (ready.length > 0) {
    const key = ready.shift()!;
    sortedKeys.push(key);

    for (const dependent of dependents.get(key) ?? []) {
      const nextDegree = (inDegree.get(dependent) ?? 0) - 1;
      inDegree.set(dependent, nextDegree);
      if (nextDegree === 0) {
        ready.push(dependent);
      }
    }

    ready.sort((a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0));
  }

  if (sortedKeys.length !== fields.length) {
    return fields;
  }

  const byKey = new Map(
    fields.map((field) => [fieldNodeKey(field.kind, field.id), field]),
  );

  return sortedKeys
    .map((key) => byKey.get(key))
    .filter((field): field is FormulaFieldNode => field != null);
}

export function evaluateAllFormulaFields(
  config: CalculatorConfig,
  quantities: Record<string, number>,
  onWarning?: (field: FormulaFieldNode, message: string) => void,
  lineItemRows?: LineItemRowsState,
): {
  calculations: Record<string, number>;
  outputs: Record<string, number>;
} {
  const calculations: Record<string, number> = {};
  const outputs: Record<string, number> = {};
  const constants = config.constants ?? [];
  const rows =
    lineItemRows ?? buildInitialLineItemRowsState(config.inputs);
  const order = getFormulaEvaluationOrder(config);
  const macroValues = evaluateMacros(
    config,
    quantities,
    calculations,
    outputs,
    rows,
  );

  for (const field of order) {
    try {
      const value = evaluateFormulaWithLocals(
        field.expression,
        field.locals,
        {
          quantities,
          lineItemRows: rows,
          inputs: config.inputs,
          constants,
          calculations,
          outputs,
          macros: macroValues,
          onWarning: onWarning
            ? (message) => onWarning(field, message)
            : undefined,
        },
      );

      if (field.kind === "calculation") {
        calculations[field.id] = value;
      } else {
        outputs[field.id] = value;
      }
    } catch {
      if (field.kind === "calculation") {
        calculations[field.id] = 0;
      } else {
        outputs[field.id] = 0;
      }
    }
  }

  return { calculations, outputs };
}
