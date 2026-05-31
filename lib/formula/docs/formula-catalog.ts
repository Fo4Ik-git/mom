import { getAllConfigEntities } from "@/lib/calculator/schema/registry";
import { getAllFormulaPrimitives } from "@/lib/formula/nodes/registry";
import type { FormulaPrimitiveDefinition } from "@/lib/formula/nodes/_definition";

function syntaxForPrimitive(primitive: FormulaPrimitiveDefinition): string {
  if (primitive.infix) {
    return `a ${primitive.infix.symbol} b`;
  }
  if (primitive.call) {
    if (primitive.astType === "rowAggregate") {
      return `${primitive.call.keyword}(field_id, expression)`;
    }
    if (primitive.astType === "conditional") {
      return `${primitive.call.keyword}(condition, thenValue, elseValue)`;
    }
    if (primitive.astType === "round") {
      return `${primitive.call.keyword}(value, decimals)`;
    }
    return `${primitive.call.keyword}(a, b, …)`;
  }
  return primitive.id;
}

function exampleForPrimitive(primitive: FormulaPrimitiveDefinition): string {
  if (primitive.doc?.example) {
    return primitive.doc.example;
  }
  if (primitive.infix) {
    return `field_item.qty ${primitive.infix.symbol} 10`;
  }
  const kw = primitive.call?.keyword;
  if (!kw) {
    return "";
  }
  if (primitive.astType === "rowAggregate") {
    return `${kw}(field_lines, row.qty * row.var_cost)`;
  }
  if (primitive.astType === "conditional") {
    return `IF(field_item.qty >= 10, calc_field_item_var_price * 0.9, calc_field_item_var_price)`;
  }
  if (primitive.astType === "round") {
    return `ROUND(calc_field_item_var_price, 2)`;
  }
  if (kw === "COUNT") {
    return `${kw}(calc_field_item_var_cost, calc_field_item_var_price)`;
  }
  return `${kw}(field_item.var_cost, field_item.var_price)`;
}

const FORMULA_OPERANDS = [
  { syntax: "field_id.qty", note: "input quantity" },
  { syntax: "field_id.var_*", note: "input property (e.g. var_cost, var_price)" },
  { syntax: "const_id", note: "constant" },
  { syntax: "calc_id", note: "calculation (incl. auto calc_field_X_var_Y)" },
  { syntax: "output_id", note: "another output (avoid cycles)" },
  { syntax: "macro_id", note: "formula macro" },
  { syntax: "row.var_*", note: "inside SUM_ROWS / row aggregates only" },
] as const;

const FORMULA_PROGRAM = [
  "formula { local name = expr; return expr }",
  "Comparisons return 1 (true) or 0 (false). IF(cond, a, b) is true when cond ≠ 0.",
  "Use field_id.qty — never field_id.quantity.",
] as const;

/**
 * Machine-readable list of every formula/script construct in the platform.
 * Regenerated from registry on each prompt build — new primitives appear automatically.
 */
export function buildFormulaCatalogForAi(): string {
  const primitives = getAllFormulaPrimitives();
  const entities = getAllConfigEntities();

  const infix = primitives
    .filter((p) => p.infix)
    .sort((a, b) => (b.infix?.precedence ?? 0) - (a.infix?.precedence ?? 0));
  const functions = primitives.filter((p) => p.call);

  const lines: string[] = [
    "## Platform catalog (registry)",
    "",
    "Use ONLY constructs listed here. Do not invent other function names or operators.",
    "",
    "### Script entities",
    "",
  ];

  for (const entity of entities) {
    const snippet = entity.scriptCompletions?.declarationSnippet;
    lines.push(`- **${entity.keyword}** — ${entity.label}`);
    if (snippet) {
      lines.push(`  Example header: ${snippet.split("\n")[0]}`);
    }
  }

  lines.push("", "### Input property flags", "");
  lines.push("- **auto_total = true** — auto-creates `calc_{field_id}_{property_id}` = qty × property");
  lines.push("- **auto_total = false** — no auto calc (rates, hours, page counts)");
  lines.push("- Default true for var_cost, var_price, cost/price-like labels");
  lines.push("- **mode = lineItems** — table input; use SUM_ROWS etc.");
  lines.push("- **mode = time** — time-based service pattern");

  lines.push("", "### Formula references", "");
  for (const op of FORMULA_OPERANDS) {
    lines.push(`- \`${op.syntax}\` — ${op.note}`);
  }

  lines.push("", "### Formula program", "");
  for (const rule of FORMULA_PROGRAM) {
    lines.push(`- ${rule}`);
  }

  lines.push("", "### Infix operators", "");
  for (const p of infix) {
    const ex = exampleForPrimitive(p);
    lines.push(
      `- \`${syntaxForPrimitive(p)}\` (id: ${p.id})${ex ? ` — e.g. \`${ex}\`` : ""}`,
    );
  }

  lines.push("", "### Functions", "");
  for (const p of functions) {
    const ex = exampleForPrimitive(p);
    lines.push(
      `- \`${syntaxForPrimitive(p)}\` (id: ${p.id})${ex ? ` — e.g. \`${ex}\`` : ""}`,
    );
  }

  lines.push("");
  lines.push(
    `Total: ${entities.length} script entities, ${infix.length} infix operators, ${functions.length} functions.`,
  );

  return lines.join("\n");
}

/** Primitive ids — for tests and i18n completeness checks. */
export function getRegisteredPrimitiveIds(): string[] {
  return getAllFormulaPrimitives().map((p) => p.id);
}
