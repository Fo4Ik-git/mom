import { z } from "zod";

const idSchema = z
  .string()
  .min(1)
  .regex(/^[a-z][a-z0-9_]*$/);

export const inputPropertySchema = z.object({
  id: idSchema,
  label: z.string().min(1).max(80),
  value: z.number(),
});

export const inputFieldSchema = z.object({
  id: idSchema,
  label: z.string().min(1).max(120),
  properties: z.array(inputPropertySchema).min(1).max(12),
  defaultQuantity: z.number().optional(),
  presets: z.array(z.number()).optional(),
});

export type FormulaOperator = "+" | "-" | "*" | "/";

export const calculatorConstantSchema = z.object({
  id: idSchema,
  label: z.string().min(1).max(80),
  value: z.number(),
});

export type CalculatorConstant = z.infer<typeof calculatorConstantSchema>;

export const blockOperandSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("quantity"), fieldId: z.string() }),
  z.object({
    kind: z.literal("property"),
    fieldId: z.string(),
    propertyId: z.string(),
  }),
  z.object({ kind: z.literal("output"), outputId: z.string() }),
  z.object({ kind: z.literal("number"), value: z.number() }),
  z.object({ kind: z.literal("constant"), constantId: z.string() }),
]);

export type BlockOperand = z.infer<typeof blockOperandSchema>;

export const blockExpressionSchema: z.ZodType<BlockExpression> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("empty") }),
    z.object({ type: z.literal("operand"), operand: blockOperandSchema }),
    z.object({
      type: z.literal("operation"),
      operator: z.enum(["+", "-", "*", "/"]),
      left: blockExpressionSchema,
      right: blockExpressionSchema,
    }),
    z.object({ type: z.literal("group"), inner: blockExpressionSchema }),
  ]),
);

export type BlockExpression =
  | { type: "empty" }
  | { type: "operand"; operand: BlockOperand }
  | {
      type: "operation";
      operator: FormulaOperator;
      left: BlockExpression;
      right: BlockExpression;
    }
  | { type: "group"; inner: BlockExpression };

/** @deprecated Old two-dropdown format */
export type FormulaExpression = {
  left: FormulaOperand;
  operator: FormulaOperator;
  right: FormulaOperand;
};

export type FormulaOperand = {
  kind: "quantity" | "property" | "output" | "number" | "group";
  fieldId?: string;
  propertyId?: string;
  outputId?: string;
  value?: number;
  expression?: FormulaExpression;
};

export const outputFieldSchema = z.object({
  id: idSchema,
  label: z.string().min(1).max(120),
  expression: z.unknown(),
  highlight: z.boolean().optional(),
});

export const calculatorConfigSchema = z.object({
  version: z.literal(2).optional().default(2),
  inputs: z.array(inputFieldSchema).min(1).max(50),
  constants: z.array(calculatorConstantSchema).max(30).optional().default([]),
  outputs: z.preprocess(
    (outputs) =>
      Array.isArray(outputs)
        ? outputs.map((output) => {
            const row = output as Record<string, unknown>;
            return {
              ...row,
              expression: normalizeBlockExpression(row.expression),
            };
          })
        : outputs,
    z.array(
      z.object({
        id: idSchema,
        label: z.string().min(1).max(120),
        expression: blockExpressionSchema,
        highlight: z.boolean().optional(),
      }),
    ).min(1).max(20),
  ),
});

export type InputProperty = z.infer<typeof inputPropertySchema>;
export type InputField = z.infer<typeof inputFieldSchema>;
export type OutputField = {
  id: string;
  label: string;
  expression: BlockExpression;
  highlight?: boolean;
};
export type CalculatorConfig = {
  version?: 2;
  inputs: InputField[];
  constants?: CalculatorConstant[];
  outputs: OutputField[];
};

export interface LegacyCalculatorField {
  name?: string;
  id: string;
  label?: string;
  cost?: number;
  rate?: number;
  defaultValue?: number;
  presets?: number[];
}

export function emptyBlockExpression(): BlockExpression {
  return { type: "empty" };
}

export function normalizeBlockExpression(data: unknown): BlockExpression {
  if (!data || typeof data !== "object") {
    return emptyBlockExpression();
  }

  const record = data as Record<string, unknown>;

  if (record.type === "empty") {
    return { type: "empty" };
  }

  if (record.type === "operand" && record.operand) {
    return blockExpressionSchema.parse(data);
  }

  if (record.type === "operation" || record.type === "group") {
    return blockExpressionSchema.parse(data);
  }

  if ("left" in record && "operator" in record && "right" in record) {
    return legacyExpressionToBlock(record as FormulaExpression);
  }

  return emptyBlockExpression();
}

function legacyExpressionToBlock(expression: FormulaExpression): BlockExpression {
  return {
    type: "operation",
    operator: expression.operator,
    left: legacyOperandToBlock(expression.left),
    right: legacyOperandToBlock(expression.right),
  };
}

function legacyOperandToBlock(operand: FormulaOperand): BlockExpression {
  if (operand.kind === "group" && operand.expression) {
    return {
      type: "group",
      inner: legacyExpressionToBlock(operand.expression),
    };
  }
  if (operand.kind === "number") {
    return {
      type: "operand",
      operand: { kind: "number", value: operand.value ?? 0 },
    };
  }
  if (operand.kind === "quantity") {
    return {
      type: "operand",
      operand: { kind: "quantity", fieldId: operand.fieldId! },
    };
  }
  if (operand.kind === "property") {
    return {
      type: "operand",
      operand: {
        kind: "property",
        fieldId: operand.fieldId!,
        propertyId: operand.propertyId!,
      },
    };
  }
  if (operand.kind === "output") {
    return {
      type: "operand",
      operand: { kind: "output", outputId: operand.outputId! },
    };
  }
  return emptyBlockExpression();
}

export function parseCalculatorConfig(raw: string): CalculatorConfig {
  const json = JSON.parse(raw) as unknown;
  return normalizeCalculatorConfig(json);
}

export function serializeCalculatorConfig(config: CalculatorConfig): string {
  return JSON.stringify(config);
}

export function normalizeCalculatorConfig(data: unknown): CalculatorConfig {
  const record = data as Record<string, unknown>;

  if (Array.isArray(record.inputs) && Array.isArray(record.outputs)) {
    return calculatorConfigSchema.parse(data);
  }

  return migrateLegacyConfig(record);
}

function migrateLegacyConfig(record: Record<string, unknown>): CalculatorConfig {
  const legacyFields = (record.fields ?? []) as LegacyCalculatorField[];

  const inputs: InputField[] = legacyFields.map((field) => {
    const properties: InputProperty[] = [];

    if (field.cost !== undefined) {
      properties.push({
        id: "cost",
        label: "Собівартість",
        value: field.cost,
      });
    }
    if (field.rate !== undefined) {
      properties.push({
        id: "price",
        label: "Вартість",
        value: field.rate,
      });
    }
    if (properties.length === 0) {
      properties.push({ id: "value", label: "Значення", value: 0 });
    }

    return {
      id: field.id,
      label: field.label ?? field.name ?? field.id,
      properties,
      defaultQuantity: field.defaultValue,
      presets: field.presets,
    };
  });

  const legacyOutputs = (record.outputs ?? []) as Array<{
    id: string;
    label: string;
    formula?: string;
    highlight?: boolean;
  }>;

  const outputs: OutputField[] = legacyOutputs.map((output) => ({
    id: output.id,
    label: output.label,
    highlight: output.highlight,
    expression: output.formula
      ? parseLegacyFormulaToBlock(output.formula, inputs)
      : emptyBlockExpression(),
  }));

  return calculatorConfigSchema.parse({
    version: 2,
    inputs,
    constants: [],
    outputs,
  });
}

function parseLegacyFormulaToBlock(
  formula: string,
  inputs: InputField[],
): BlockExpression {
  const mulMatch = formula.match(
    /^field_([a-z0-9_]+)_(cost|rate|price)\s*\*\s*field_\1$/,
  );
  if (mulMatch) {
    const [, fieldId, prop] = mulMatch;
    const propertyId = prop === "rate" ? "price" : prop;
    return {
      type: "operation",
      operator: "*",
      left: {
        type: "operand",
        operand: { kind: "property", fieldId, propertyId },
      },
      right: {
        type: "operand",
        operand: { kind: "quantity", fieldId },
      },
    };
  }

  const outputSubMatch = formula.match(
    /^output_([a-z0-9_]+)\s*-\s*\(field_([a-z0-9_]+)_cost\s*\*\s*field_\2\)$/,
  );
  if (outputSubMatch) {
    const [, outputId, fieldId] = outputSubMatch;
    return {
      type: "operation",
      operator: "-",
      left: {
        type: "operand",
        operand: { kind: "output", outputId },
      },
      right: {
        type: "operation",
        operator: "*",
        left: {
          type: "operand",
          operand: { kind: "property", fieldId, propertyId: "cost" },
        },
        right: {
          type: "operand",
          operand: { kind: "quantity", fieldId },
        },
      },
    };
  }

  const firstInput = inputs[0];
  if (firstInput) {
    const prop = firstInput.properties[0];
    return {
      type: "operation",
      operator: "*",
      left: {
        type: "operand",
        operand: {
          kind: "property",
          fieldId: firstInput.id,
          propertyId: prop.id,
        },
      },
      right: {
        type: "operand",
        operand: { kind: "quantity", fieldId: firstInput.id },
      },
    };
  }

  return emptyBlockExpression();
}

export function slugifyId(label: string, prefix: string) {
  const base = label
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/[^a-z0-9_]+/g, "")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .slice(0, 32);
  return base ? `${prefix}_${base}` : `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}
