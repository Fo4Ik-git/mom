import type { BlockOperand } from "@/types/calculator";
import type { FormulaTarget } from "@/lib/formula/core/formula-target";
import { FormulaParseError } from "@/lib/formula/code/formula-parse-error";

export function formatOperandCode(
  operand: BlockOperand,
  target: FormulaTarget,
  rowFieldId?: string,
): string {
  switch (operand.kind) {
    case "number":
      return String(operand.value);
    case "quantity":
      return `${operand.fieldId}.qty`;
    case "property":
      return `${operand.fieldId}.${operand.propertyId}`;
    case "lineColumn":
      if (rowFieldId && operand.fieldId === rowFieldId) {
        return `row.${operand.propertyId}`;
      }
      return `${operand.fieldId}.row.${operand.propertyId}`;
    case "constant":
      return operand.constantId;
    case "local":
      return operand.localId;
    case "calculation":
      return operand.calculationId === target.fieldId
        ? "?"
        : operand.calculationId;
    case "output":
      return operand.outputId === target.fieldId ? "?" : operand.outputId;
    default:
      return "?";
  }
}

export function parseCodeReference(
  raw: string,
  target: FormulaTarget,
  rowFieldId: string | undefined,
  offset: number,
  localIds?: ReadonlySet<string>,
): BlockOperand {
  if ((raw === "row" || raw.startsWith("row.")) && !rowFieldId) {
    throw new FormulaParseError(
      `"row.*" is only valid inside *_ROWS(...)`,
      offset,
    );
  }

  const rowParts = raw.split(".");
  if (rowParts.length === 3 && rowParts[1] === "row") {
    const [fieldId, , propertyId] = rowParts;
    return { kind: "lineColumn", fieldId: fieldId!, propertyId: propertyId! };
  }

  if (rowParts.length === 2 && rowParts[0] === "row" && rowFieldId) {
    return {
      kind: "lineColumn",
      fieldId: rowFieldId,
      propertyId: rowParts[1]!,
    };
  }

  if (rowParts.length === 2 && rowParts[1] === "qty") {
    return { kind: "quantity", fieldId: rowParts[0]! };
  }

  if (rowParts.length === 2) {
    return {
      kind: "property",
      fieldId: rowParts[0]!,
      propertyId: rowParts[1]!,
    };
  }

  if (raw.startsWith("const_")) {
    return { kind: "constant", constantId: raw };
  }

  if (raw.startsWith("calc_") || raw.startsWith("calculation_")) {
    if (raw === target.fieldId) {
      throw new FormulaParseError("Formula cannot reference itself", offset);
    }
    return { kind: "calculation", calculationId: raw };
  }

  if (raw.startsWith("output_")) {
    if (raw === target.fieldId) {
      throw new FormulaParseError("Formula cannot reference itself", offset);
    }
    return { kind: "output", outputId: raw };
  }

  if (localIds?.has(raw)) {
    return { kind: "local", localId: raw };
  }

  throw new FormulaParseError(`Unknown reference "${raw}"`, offset);
}

export type FormulaFieldRef = {
  kind: "calculation" | "output";
  id: string;
};

export function fieldRefsFromOperand(operand: BlockOperand): FormulaFieldRef[] {
  switch (operand.kind) {
    case "calculation":
      return [{ kind: "calculation", id: operand.calculationId }];
    case "output":
      return [{ kind: "output", id: operand.outputId }];
    default:
      return [];
  }
}
