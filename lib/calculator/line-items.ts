import type {
  AggregateFunction,
  BlockExpression,
  CalculationField,
  InputField,
  InputProperty,
  LineItemRow,
  LineItemRowsState,
} from "@/types/calculator";
import { autoCalculationId } from "@/lib/calculator/auto-calculations";
import {
  lineColumnOperand,
  lineColumnTimesColumn,
  rowAggregateExpression,
} from "@/lib/formula/expression-builders";

export const LINE_QTY_ID = "var_qty";
export const LINE_COST_ID = "var_cost";
export const LINE_PRICE_ID = "var_price";

export interface LineItemsLabels {
  qty: string;
  cost: string;
  price: string;
  lineItems: string;
}

export function isLineItemsField(field: InputField) {
  return field.inputMode === "lineItems";
}

export function lineItemMaxRows(field: InputField) {
  return field.lineItemMaxRows ?? 100;
}

export function lineItemMinRows(field: InputField) {
  return field.lineItemMinRows ?? 1;
}

export function lineItemDefaultRowCount(field: InputField) {
  return field.lineItemDefaultRowCount ?? 1;
}

export function defaultRowFromProperties(field: InputField): LineItemRow {
  return Object.fromEntries(
    field.properties.map((property) => [property.id, property.value]),
  );
}

export function buildInitialLineItemRows(field: InputField): LineItemRow[] {
  if (field.defaultRows?.length) {
    return field.defaultRows.slice(0, lineItemMaxRows(field));
  }
  const count = lineItemDefaultRowCount(field);
  const template = defaultRowFromProperties(field);
  return Array.from({ length: count }, () => ({ ...template }));
}

export function buildInitialLineItemRowsState(
  inputs: InputField[],
): LineItemRowsState {
  return Object.fromEntries(
    inputs
      .filter(isLineItemsField)
      .map((field) => [field.id, buildInitialLineItemRows(field)]),
  );
}

export function createEmptyLineItemRow(field: InputField): LineItemRow {
  return defaultRowFromProperties(field);
}

export function createLineItemsField(
  fieldId: string,
  label: string,
  labels: LineItemsLabels,
  options?: {
    defaultRowCount?: number;
    properties?: InputProperty[];
  },
): InputField {
  return {
    id: fieldId,
    label,
    inputMode: "lineItems",
    lineItemDefaultRowCount: options?.defaultRowCount ?? 1,
    lineItemMinRows: 1,
    lineItemMaxRows: 100,
    properties: options?.properties ?? [
      { id: LINE_QTY_ID, label: labels.qty, value: 1, autoTotal: false },
      { id: LINE_COST_ID, label: labels.cost, value: 0, autoTotal: true },
      { id: LINE_PRICE_ID, label: labels.price, value: 0, autoTotal: true },
    ],
  };
}

export function hasLineQtyColumn(field: InputField) {
  return field.properties.some((property) => property.id === LINE_QTY_ID);
}

export function lineItemAutoCalculationInner(
  field: InputField,
  property: InputProperty,
): BlockExpression {
  if (
    hasLineQtyColumn(field) &&
    property.id !== LINE_QTY_ID
  ) {
    return lineColumnTimesColumn(field.id, LINE_QTY_ID, property.id);
  }
  return lineColumnOperand(field.id, property.id);
}

export function buildLineItemAutoCalculation(
  field: InputField,
  property: InputProperty,
  totalLabel: string,
): CalculationField {
  const base = field.label.trim() || "…";
  const prop = property.label.trim() || "…";
  return {
    id: autoCalculationId(field.id, property.id),
    label: `${base} · ${prop} ${totalLabel}`,
    expression: rowAggregateExpression(
      field.id,
      "SUM",
      lineItemAutoCalculationInner(field, property),
    ),
  };
}

export function rowAggregateLabel(
  fn: AggregateFunction,
  fieldLabel: string,
  rowsLabel: string,
) {
  return `${fn} ${rowsLabel} (${fieldLabel.trim() || "…"})`;
}
