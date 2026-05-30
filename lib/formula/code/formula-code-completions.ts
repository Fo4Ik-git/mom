import { mergeNodeCompletions } from "@/lib/formula/nodes/registry";
import type { CalculatorConfig } from "@/types/calculator";
import type { FormulaTarget } from "@/lib/formula/core/formula-target";
import { isLineItemsField } from "@/lib/calculator/fields/line-items";

export interface FormulaCompletionItem {
  label: string;
  type: "field" | "property" | "constant" | "calculation" | "output" | "keyword";
  detail?: string;
  insertText: string;
}

const SCRIPT_KEYWORDS: FormulaCompletionItem[] = [
  { label: "input", type: "keyword", insertText: "input field_id \"Label\" {\n  property var_cost \"Cost\" = 0\n}" },
  { label: "constant", type: "keyword", insertText: "constant const_id \"Label\" = 0" },
  { label: "calc", type: "keyword", insertText: "calc calc_id \"Label\" = " },
  { label: "output", type: "keyword", insertText: "output output_id \"Label\" = " },
  { label: "property", type: "keyword", insertText: "property var_id \"Label\" = 0" },
  { label: "mode", type: "keyword", insertText: "mode lineItems" },
  { label: "quantity", type: "keyword", insertText: "quantity default 0" },
];

function buildDynamicCompletions(
  config: CalculatorConfig,
  target: FormulaTarget,
): FormulaCompletionItem[] {
  const items: FormulaCompletionItem[] = [];

  for (const input of config.inputs) {
    items.push({
      label: `${input.id}.qty`,
      type: "field",
      detail: input.label,
      insertText: `${input.id}.qty`,
    });

    for (const property of input.properties) {
      if (isLineItemsField(input)) {
        items.push({
          label: `${input.id}.row.${property.id}`,
          type: "property",
          detail: `${input.label} · ${property.label}`,
          insertText: `${input.id}.row.${property.id}`,
        });
        items.push({
          label: `row.${property.id}`,
          type: "property",
          detail: `${input.label} rows · ${property.label}`,
          insertText: `row.${property.id}`,
        });
      } else {
        items.push({
          label: `${input.id}.${property.id}`,
          type: "property",
          detail: `${input.label} · ${property.label}`,
          insertText: `${input.id}.${property.id}`,
        });
      }
    }
  }

  for (const constant of config.constants ?? []) {
    items.push({
      label: constant.id,
      type: "constant",
      detail: constant.label,
      insertText: constant.id,
    });
  }

  for (const calc of config.calculations ?? []) {
    if (calc.id === target.fieldId) {
      continue;
    }
    items.push({
      label: calc.id,
      type: "calculation",
      detail: calc.label,
      insertText: calc.id,
    });
  }

  for (const output of config.outputs) {
    if (output.id === target.fieldId) {
      continue;
    }
    items.push({
      label: output.id,
      type: "output",
      detail: output.label,
      insertText: output.id,
    });
  }

  return items;
}

export function buildFormulaCompletions(
  config: CalculatorConfig,
  target: FormulaTarget,
  options?: { scriptMode?: boolean },
): FormulaCompletionItem[] {
  const items: FormulaCompletionItem[] = [
    ...mergeNodeCompletions(config, target),
    ...buildDynamicCompletions(config, target),
  ];

  if (options?.scriptMode) {
    items.push(...SCRIPT_KEYWORDS);
  }

  return items;
}

export function filterCompletions(
  items: FormulaCompletionItem[],
  word: string,
): FormulaCompletionItem[] {
  const query = word.toLowerCase();
  if (!query) {
    return items.slice(0, 40);
  }
  return items
    .filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        item.detail?.toLowerCase().includes(query),
    )
    .slice(0, 40);
}
