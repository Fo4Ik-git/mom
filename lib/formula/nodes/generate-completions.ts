import type { FormulaCompletionItem } from "@/lib/formula/code/formula-code-completions";
import type { FormulaPrimitiveDefinition } from "@/lib/formula/nodes/_definition";

/** Default autocomplete snippets derived from primitive metadata (call / astType). */
export function generateDefaultCompletions(
  primitive: FormulaPrimitiveDefinition,
): FormulaCompletionItem[] {
  if (primitive.infix) {
    return [];
  }

  const keyword = primitive.call?.keyword;
  if (!keyword) {
    return [];
  }

  if (primitive.astType === "rowAggregate") {
    return [
      {
        label: keyword,
        type: "keyword",
        insertText: `${keyword}(field_id, $0)`,
        detail: `${keyword}(table, row expression)`,
      },
    ];
  }

  if (primitive.astType === "conditional") {
    return [
      {
        label: keyword,
        type: "keyword",
        insertText: `${keyword}($0, , )`,
        detail: `${keyword}(condition, then, else)`,
      },
    ];
  }

  if (primitive.astType === "round") {
    return [
      {
        label: keyword,
        type: "keyword",
        insertText: `${keyword}($0, 2)`,
        detail: `${keyword}(value, decimals?)`,
      },
    ];
  }

  if (primitive.astType === "aggregate") {
    return [
      {
        label: keyword,
        type: "keyword",
        insertText: `${keyword}($0)`,
        detail: keyword,
      },
    ];
  }

  return [
    {
      label: keyword,
      type: "keyword",
      insertText: `${keyword}($0)`,
      detail: primitive.id,
    },
  ];
}
