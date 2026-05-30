import { getAllConfigEntities } from "@/lib/calculator/schema/registry";
import { getAllFormulaPrimitives } from "@/lib/formula/nodes/registry";

export type FormulaDocCategory =
  | "operators"
  | "aggregates"
  | "rowAggregates"
  | "operands"
  | "script";

export interface FormulaDocEntry {
  id: string;
  category: FormulaDocCategory;
  /** Code syntax shown to users */
  syntax: string;
  example: string;
  /** Palette / block editor category */
  blockCategory?: string;
}

export interface FormulaDocsData {
  primitives: FormulaDocEntry[];
  operands: FormulaDocEntry[];
  script: FormulaDocEntry[];
}

function categoryForPrimitive(
  primitive: ReturnType<typeof getAllFormulaPrimitives>[number],
): FormulaDocCategory {
  if (primitive.infix) {
    return "operators";
  }
  if (primitive.astType === "rowAggregate") {
    return "rowAggregates";
  }
  return "aggregates";
}

function blockCategoryFor(
  primitive: ReturnType<typeof getAllFormulaPrimitives>[number],
): string | undefined {
  if (primitive.infix) {
    return "operator";
  }
  if (primitive.astType === "rowAggregate") {
    return "rowAggregate";
  }
  if (primitive.astType === "aggregate") {
    return "aggregate";
  }
  return undefined;
}

function syntaxForPrimitive(
  primitive: ReturnType<typeof getAllFormulaPrimitives>[number],
): string {
  if (primitive.infix) {
    return `a ${primitive.infix.symbol} b`;
  }
  if (primitive.call) {
    if (primitive.astType === "rowAggregate") {
      return `${primitive.call.keyword}(field_id, expression)`;
    }
    return `${primitive.call.keyword}(a, b, …)`;
  }
  return primitive.id;
}

function defaultExample(
  primitive: ReturnType<typeof getAllFormulaPrimitives>[number],
): string {
  if (primitive.doc?.example) {
    return primitive.doc.example;
  }
  if (primitive.infix) {
    return `field_item.var_cost ${primitive.infix.symbol} field_item.var_price`;
  }
  const kw = primitive.call?.keyword;
  if (!kw) {
    return "";
  }
  if (primitive.astType === "rowAggregate") {
    return `${kw}(field_lines, row.qty * row.var_cost)`;
  }
  if (kw === "COUNT") {
    return `${kw}(field_item.var_cost, field_item.var_price)`;
  }
  return `${kw}(field_item.var_cost, field_item.var_price)`;
}

const OPERAND_DOCS: FormulaDocEntry[] = [
  {
    id: "quantity",
    category: "operands",
    syntax: "field_id.qty",
    example: "field_item.qty",
    blockCategory: "operand",
  },
  {
    id: "property",
    category: "operands",
    syntax: "field_id.property_id",
    example: "field_item.var_cost",
    blockCategory: "operand",
  },
  {
    id: "constant",
    category: "operands",
    syntax: "const_id",
    example: "const_factor",
    blockCategory: "operand",
  },
  {
    id: "calculation",
    category: "operands",
    syntax: "calc_id",
    example: "calc_subtotal",
    blockCategory: "operand",
  },
  {
    id: "row-property",
    category: "operands",
    syntax: "row.property_id",
    example: "row.var_cost",
    blockCategory: "operand",
  },
];

const SCRIPT_EXAMPLES: Record<string, string> = {
  input: `input field_item {
  label = "Item"
  property var_cost { label = "Cost"; value = 0 }
  quantity default 0
}`,
  constant: `constant const_factor {
  label = "Factor"
  value = 1.2
}`,
  calc: `calc calc_subtotal {
  label = "Subtotal"
  formula { return field_item.qty * field_item.var_cost }
}`,
  output: `output output_total {
  label = "Total"
  formula { return calc_subtotal * const_factor }
}`,
};

/** Collect doc entries from registry — single source for /docs page. */
export function collectFormulaDocs(): FormulaDocsData {
  const primitives: FormulaDocEntry[] = getAllFormulaPrimitives().map(
    (primitive) => ({
      id: primitive.id,
      category: categoryForPrimitive(primitive),
      syntax: syntaxForPrimitive(primitive),
      example: defaultExample(primitive),
      blockCategory: blockCategoryFor(primitive),
    }),
  );

  const script: FormulaDocEntry[] = getAllConfigEntities().map((entity) => ({
    id: entity.keyword,
    category: "script" as const,
    syntax: `${entity.keyword} id { … }`,
    example: SCRIPT_EXAMPLES[entity.keyword] ?? `${entity.keyword} …`,
    blockCategory: entity.keyword,
  }));

  return {
    primitives,
    operands: OPERAND_DOCS,
    script,
  };
}

/** All primitive ids — useful for i18n completeness checks. */
export function getFormulaDocPrimitiveIds(): string[] {
  return collectFormulaDocs().primitives.map((entry) => entry.id);
}
