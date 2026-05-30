import type { CalculatorConfig, InputField } from "@/types/calculator";
import { autoCalculationId } from "@/lib/calculator/auto-calculations";
import {
  createLineItemsField,
  LINE_COST_ID,
  LINE_PRICE_ID,
  LINE_QTY_ID,
  type LineItemsLabels,
} from "@/lib/calculator/line-items";
import { finalizeConfig } from "@/lib/calculator/config-sync";
import { normalizeInputSection } from "@/lib/calculator/input-sections";
import { isTimeField } from "@/lib/calculator/time-service";

function isCostPriceLikeField(field: InputField) {
  if (isTimeField(field) || field.inputMode === "lineItems") {
    return false;
  }
  const ids = field.properties.map((property) => property.id);
  return ids.includes("var_cost") && ids.includes("var_price");
}

export function findMigratableCostPriceGroups(config: CalculatorConfig) {
  const groups = new Map<string, InputField[]>();
  for (const field of config.inputs) {
    if (!isCostPriceLikeField(field)) {
      continue;
    }
    const section = normalizeInputSection(field.section);
    const list = groups.get(section) ?? [];
    list.push(field);
    groups.set(section, list);
  }
  return [...groups.entries()].filter(([, fields]) => fields.length >= 2);
}

export function migrateCostPriceGroupToLineItems(
  config: CalculatorConfig,
  section: string,
  labels: LineItemsLabels,
  totalLabel: string,
): CalculatorConfig {
  const group = findMigratableCostPriceGroups(config).find(
    ([key]) => key === section,
  );
  if (!group) {
    return config;
  }

  const [, fields] = group;
  const table = createLineItemsField(
    `field_${section}_items`.replace(/__+/g, "_").slice(0, 48),
    labels.lineItems,
    labels,
    { defaultRowCount: fields.length },
  );

  table.section = section;
  table.defaultRows = fields.map((field) => ({
    [LINE_QTY_ID]: field.defaultQuantity ?? 1,
    [LINE_COST_ID]:
      field.properties.find((property) => property.id === "var_cost")?.value ??
      0,
    [LINE_PRICE_ID]:
      field.properties.find((property) => property.id === "var_price")?.value ??
      0,
  }));

  const removeIds = new Set(fields.map((field) => field.id));
  let next: CalculatorConfig = {
    ...config,
    inputs: [
      ...config.inputs.filter((field) => !removeIds.has(field.id)),
      table,
    ],
  };

  const rewriteExpression = (expression: unknown): unknown => {
    if (!expression || typeof expression !== "object") {
      return expression;
    }
    const node = expression as Record<string, unknown>;
    if (node.type === "operand" && node.operand && typeof node.operand === "object") {
      const operand = node.operand as Record<string, unknown>;
      if (
        operand.kind === "calculation" &&
        typeof operand.calculationId === "string"
      ) {
        for (const field of fields) {
          for (const property of field.properties) {
            const oldId = autoCalculationId(field.id, property.id);
            const newId = autoCalculationId(table.id, property.id);
            if (operand.calculationId === oldId) {
              return {
                ...node,
                operand: { ...operand, calculationId: newId },
              };
            }
          }
        }
      }
    }
    if (node.type === "operation") {
      return {
        ...node,
        left: rewriteExpression(node.left),
        right: rewriteExpression(node.right),
      };
    }
    if (node.type === "group") {
      return { ...node, inner: rewriteExpression(node.inner) };
    }
    if (node.type === "aggregate" && Array.isArray(node.args)) {
      return {
        ...node,
        args: node.args.map((arg) => rewriteExpression(arg)),
      };
    }
    if (node.type === "rowAggregate") {
      return { ...node, inner: rewriteExpression(node.inner) };
    }
    return node;
  };

  next = {
    ...next,
    calculations: (next.calculations ?? []).map((calc) => ({
      ...calc,
      expression: rewriteExpression(calc.expression) as typeof calc.expression,
    })),
    outputs: next.outputs.map((output) => ({
      ...output,
      expression: rewriteExpression(output.expression) as typeof output.expression,
    })),
  };

  return finalizeConfig(next, totalLabel);
}
