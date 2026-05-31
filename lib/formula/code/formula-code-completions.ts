import { mergeNodeCompletions } from "@/lib/formula/nodes/registry";
import type { CalculatorConfig } from "@/types/calculator";
import type { FormulaTarget } from "@/lib/formula/core/formula-target";
import { isLineItemsField } from "@/lib/calculator/fields/line-items";
import {
  collectScriptCompletions,
  detectScriptCompletionContext,
} from "@/lib/calculator/schema/script-completions";
import type { ScriptProjectFileId } from "@/lib/calculator/script/project-types";

export interface FormulaCompletionItem {
  label: string;
  type:
    | "field"
    | "property"
    | "constant"
    | "macro"
    | "calculation"
    | "output"
    | "keyword";
  detail?: string;
  insertText: string;
}

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

  for (const macro of config.macros ?? []) {
    if (macro.id === target.fieldId) {
      continue;
    }
    items.push({
      label: macro.id,
      type: "macro",
      detail: macro.label,
      insertText: macro.id,
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

export interface BuildFormulaCompletionsOptions {
  scriptMode?: boolean;
  scriptSource?: string;
  scriptPos?: number;
  scriptFileId?: ScriptProjectFileId;
}

export function buildFormulaCompletions(
  config: CalculatorConfig,
  target: FormulaTarget,
  options?: BuildFormulaCompletionsOptions,
): FormulaCompletionItem[] {
  if (options?.scriptMode && options.scriptSource != null && options.scriptPos != null) {
    const scriptContext = detectScriptCompletionContext(
      options.scriptSource,
      options.scriptPos,
    );

    const formulaTarget: FormulaTarget =
      scriptContext.entityId != null
        ? { fieldId: scriptContext.entityId }
        : target;

    const scriptItems = collectScriptCompletions(
      scriptContext,
      options.scriptFileId,
    );

    if (scriptContext.kind === "formula-expr") {
      return [
        ...mergeNodeCompletions(config, formulaTarget),
        ...buildDynamicCompletions(config, formulaTarget),
      ];
    }

    if (scriptContext.kind === "formula-body") {
      return scriptItems;
    }

    if (scriptContext.kind === "file-root") {
      return scriptItems;
    }

    return scriptItems;
  }

  const items: FormulaCompletionItem[] = [
    ...mergeNodeCompletions(config, target),
    ...buildDynamicCompletions(config, target),
  ];

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
