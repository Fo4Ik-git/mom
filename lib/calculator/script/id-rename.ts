import {
  autoCalculationId,
  isAutoCalculationId,
} from "@/lib/calculator/config/auto-calculations";
import {
  SCRIPT_FILE_AUTO_CALCULATIONS,
  SCRIPT_FILE_CALCULATIONS,
  SCRIPT_FILE_CONSTANTS,
  SCRIPT_FILE_OUTPUTS,
  type ScriptProject,
} from "@/lib/calculator/script/project-types";
import type {
  BlockExpression,
  BlockOperand,
  CalculatorConfig,
  InputField,
} from "@/types/calculator";

export interface ScriptIdRenames {
  inputs: Map<string, string>;
  /** oldFieldId.oldPropertyId → newPropertyId */
  properties: Map<string, string>;
  constants: Map<string, string>;
  calculations: Map<string, string>;
  outputs: Map<string, string>;
  autoCalculations: Map<string, string>;
}

export function hasScriptIdRenames(renames: ScriptIdRenames): boolean {
  return (
    renames.inputs.size > 0 ||
    renames.properties.size > 0 ||
    renames.constants.size > 0 ||
    renames.calculations.size > 0 ||
    renames.outputs.size > 0 ||
    renames.autoCalculations.size > 0
  );
}

function detectEntityRenames<T extends { id: string; label: string }>(
  oldItems: T[],
  newItems: T[],
): Map<string, string> {
  const renames = new Map<string, string>();
  const newById = new Map(newItems.map((item) => [item.id, item]));
  const claimedNewIds = new Set<string>();

  for (const oldItem of oldItems) {
    if (newById.has(oldItem.id)) {
      claimedNewIds.add(oldItem.id);
    }
  }

  for (let index = 0; index < oldItems.length; index += 1) {
    const oldItem = oldItems[index]!;
    if (newById.has(oldItem.id)) {
      continue;
    }

    const atIndex = newItems[index];
    if (
      atIndex &&
      atIndex.label === oldItem.label &&
      !claimedNewIds.has(atIndex.id)
    ) {
      renames.set(oldItem.id, atIndex.id);
      claimedNewIds.add(atIndex.id);
      continue;
    }

    const byLabel = newItems.find(
      (item) => item.label === oldItem.label && !claimedNewIds.has(item.id),
    );
    if (byLabel) {
      renames.set(oldItem.id, byLabel.id);
      claimedNewIds.add(byLabel.id);
    }
  }

  return renames;
}

function detectPropertyRenames(
  oldField: InputField,
  newField: InputField,
): Map<string, string> {
  const renames = new Map<string, string>();
  const newById = new Map(newField.properties.map((item) => [item.id, item]));
  const claimedNewIds = new Set<string>();

  for (const oldProperty of oldField.properties) {
    if (newById.has(oldProperty.id)) {
      claimedNewIds.add(oldProperty.id);
    }
  }

  for (let index = 0; index < oldField.properties.length; index += 1) {
    const oldProperty = oldField.properties[index]!;
    if (newById.has(oldProperty.id)) {
      continue;
    }

    const atIndex = newField.properties[index];
    if (
      atIndex &&
      atIndex.label === oldProperty.label &&
      !claimedNewIds.has(atIndex.id)
    ) {
      renames.set(oldProperty.id, atIndex.id);
      claimedNewIds.add(atIndex.id);
      continue;
    }

    const byLabel = newField.properties.find(
      (item) =>
        item.label === oldProperty.label && !claimedNewIds.has(item.id),
    );
    if (byLabel) {
      renames.set(oldProperty.id, byLabel.id);
      claimedNewIds.add(byLabel.id);
    }
  }

  return renames;
}

function pairInputFields(
  oldInputs: InputField[],
  newInputs: InputField[],
  inputRenames: Map<string, string>,
): Array<{ old: InputField; next: InputField }> {
  const newById = new Map(newInputs.map((field) => [field.id, field]));
  const pairs: Array<{ old: InputField; next: InputField }> = [];

  for (const oldField of oldInputs) {
    const nextId = inputRenames.get(oldField.id) ?? oldField.id;
    const nextField = newById.get(nextId);
    if (nextField) {
      pairs.push({ old: oldField, next: nextField });
    }
  }

  return pairs;
}

function buildAutoCalculationRenames(
  inputPairs: Array<{ old: InputField; next: InputField }>,
  propertyRenames: Map<string, string>,
): Map<string, string> {
  const renames = new Map<string, string>();

  for (const { old, next } of inputPairs) {
    for (const oldProperty of old.properties) {
      const propertyKey = `${old.id}.${oldProperty.id}`;
      const nextPropertyId =
        propertyRenames.get(propertyKey) ??
        next.properties.find((item) => item.label === oldProperty.label)?.id ??
        oldProperty.id;
      const oldAutoId = autoCalculationId(old.id, oldProperty.id);
      const nextAutoId = autoCalculationId(next.id, nextPropertyId);
      if (oldAutoId !== nextAutoId) {
        renames.set(oldAutoId, nextAutoId);
      }
    }
  }

  return renames;
}

export function detectScriptIdRenames(
  baseConfig: CalculatorConfig,
  nextConfig: CalculatorConfig,
): ScriptIdRenames {
  const inputs = detectEntityRenames(baseConfig.inputs, nextConfig.inputs);
  const constants = detectEntityRenames(
    baseConfig.constants ?? [],
    nextConfig.constants ?? [],
  );
  const calculations = detectEntityRenames(
    (baseConfig.calculations ?? []).filter((calc) => !isAutoCalculationId(calc.id)),
    (nextConfig.calculations ?? []).filter((calc) => !isAutoCalculationId(calc.id)),
  );
  const outputs = detectEntityRenames(baseConfig.outputs, nextConfig.outputs);

  const properties = new Map<string, string>();
  const inputPairs = pairInputFields(
    baseConfig.inputs,
    nextConfig.inputs,
    inputs,
  );
  for (const { old, next } of inputPairs) {
    for (const [oldPropertyId, newPropertyId] of detectPropertyRenames(
      old,
      next,
    )) {
      properties.set(`${old.id}.${oldPropertyId}`, newPropertyId);
    }
  }

  const autoCalculations = buildAutoCalculationRenames(inputPairs, properties);

  return {
    inputs,
    properties,
    constants,
    calculations,
    outputs,
    autoCalculations,
  };
}

function mapCalculationId(id: string, renames: ScriptIdRenames): string {
  return (
    renames.calculations.get(id) ??
    renames.autoCalculations.get(id) ??
    id
  );
}

function rewriteOperand(operand: BlockOperand, renames: ScriptIdRenames): BlockOperand {
  switch (operand.kind) {
    case "quantity":
      return {
        ...operand,
        fieldId: renames.inputs.get(operand.fieldId) ?? operand.fieldId,
      };
    case "property": {
      const propertyKey = `${operand.fieldId}.${operand.propertyId}`;
      const nextFieldId =
        renames.inputs.get(operand.fieldId) ?? operand.fieldId;
      const nextPropertyId =
        renames.properties.get(propertyKey) ?? operand.propertyId;
      return {
        ...operand,
        fieldId: nextFieldId,
        propertyId: nextPropertyId,
      };
    }
    case "lineColumn": {
      const propertyKey = `${operand.fieldId}.${operand.propertyId}`;
      const nextFieldId =
        renames.inputs.get(operand.fieldId) ?? operand.fieldId;
      const nextPropertyId =
        renames.properties.get(propertyKey) ?? operand.propertyId;
      return {
        ...operand,
        fieldId: nextFieldId,
        propertyId: nextPropertyId,
      };
    }
    case "calculation":
      return {
        ...operand,
        calculationId: mapCalculationId(operand.calculationId, renames),
      };
    case "output":
      return {
        ...operand,
        outputId: renames.outputs.get(operand.outputId) ?? operand.outputId,
      };
    case "constant":
      return {
        ...operand,
        constantId:
          renames.constants.get(operand.constantId) ?? operand.constantId,
      };
    default:
      return operand;
  }
}

export function rewriteBlockExpression(
  expression: BlockExpression,
  renames: ScriptIdRenames,
): BlockExpression {
  if (expression.type === "empty" || expression.type === "operand") {
    if (expression.type === "operand") {
      return {
        type: "operand",
        operand: rewriteOperand(expression.operand, renames),
      };
    }
    return expression;
  }

  if (expression.type === "group") {
    return {
      type: "group",
      inner: rewriteBlockExpression(expression.inner, renames),
    };
  }

  if (expression.type === "operation") {
    return {
      type: "operation",
      operator: expression.operator,
      left: rewriteBlockExpression(expression.left, renames),
      right: rewriteBlockExpression(expression.right, renames),
    };
  }

  if (expression.type === "aggregate") {
    return {
      ...expression,
      args: expression.args.map((arg) => rewriteBlockExpression(arg, renames)),
    };
  }

  return {
    ...expression,
    fieldId: renames.inputs.get(expression.fieldId) ?? expression.fieldId,
    inner: rewriteBlockExpression(expression.inner, renames),
  };
}

export function applyScriptIdRenamesToConfig(
  config: CalculatorConfig,
  renames: ScriptIdRenames,
): CalculatorConfig {
  if (!hasScriptIdRenames(renames)) {
    return config;
  }

  return {
    ...config,
    calculations: (config.calculations ?? []).map((calculation) => ({
      ...calculation,
      expression: rewriteBlockExpression(calculation.expression, renames),
    })),
    outputs: config.outputs.map((output) => ({
      ...output,
      expression: rewriteBlockExpression(output.expression, renames),
    })),
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function identBoundaryPattern(id: string): RegExp {
  return new RegExp(`(?<![a-z0-9_])${escapeRegex(id)}(?![a-z0-9_])`, "g");
}

export function rewriteScriptReferenceText(
  source: string,
  renames: ScriptIdRenames,
): string {
  if (!hasScriptIdRenames(renames)) {
    return source;
  }

  let result = source;

  const propertyKeys = [...renames.properties.keys()].sort(
    (left, right) => right.length - left.length,
  );
  for (const key of propertyKeys) {
    const [oldFieldId, oldPropertyId] = key.split(".");
    if (!oldFieldId || !oldPropertyId) {
      continue;
    }
    const newFieldId = renames.inputs.get(oldFieldId) ?? oldFieldId;
    const newPropertyId = renames.properties.get(key)!;
    const pattern = new RegExp(
      `(?<![a-z0-9_])${escapeRegex(oldFieldId)}\\.${escapeRegex(oldPropertyId)}(?![a-z0-9_])`,
      "g",
    );
    result = result.replace(pattern, `${newFieldId}.${newPropertyId}`);
  }

  for (const [oldFieldId, newFieldId] of renames.inputs) {
    result = result.replace(
      new RegExp(
        `(?<![a-z0-9_])${escapeRegex(oldFieldId)}\\.qty(?![a-z0-9_])`,
        "g",
      ),
      `${newFieldId}.qty`,
    );
    result = result.replace(
      new RegExp(
        `((?:SUM|COUNT|AVG|MIN|MAX)_ROWS\\s*\\(\\s*)${escapeRegex(oldFieldId)}(?=\\s*[,)])`,
        "g",
      ),
      `$1${newFieldId}`,
    );
    result = result.replace(
      new RegExp(
        `(?<![a-z0-9_])${escapeRegex(oldFieldId)}\\.row\\.([a-z][a-z0-9_]*)`,
        "g",
      ),
      `${newFieldId}.row.$1`,
    );
  }

  const entityRenames = [
    ...renames.autoCalculations,
    ...renames.calculations,
    ...renames.constants,
    ...renames.outputs,
    ...renames.inputs,
  ].sort((left, right) => right[0].length - left[0].length);

  for (const [oldId, newId] of entityRenames) {
    result = result.replace(identBoundaryPattern(oldId), newId);
  }

  return result;
}

export function rewriteScriptProjectSources(
  project: ScriptProject,
  renames: ScriptIdRenames,
): ScriptProject {
  if (!hasScriptIdRenames(renames)) {
    return project;
  }

  return {
    ...project,
    [SCRIPT_FILE_CONSTANTS]: rewriteScriptReferenceText(
      project[SCRIPT_FILE_CONSTANTS],
      renames,
    ),
    [SCRIPT_FILE_AUTO_CALCULATIONS]: rewriteScriptReferenceText(
      project[SCRIPT_FILE_AUTO_CALCULATIONS],
      renames,
    ),
    [SCRIPT_FILE_CALCULATIONS]: rewriteScriptReferenceText(
      project[SCRIPT_FILE_CALCULATIONS],
      renames,
    ),
    [SCRIPT_FILE_OUTPUTS]: rewriteScriptReferenceText(
      project[SCRIPT_FILE_OUTPUTS],
      renames,
    ),
  };
}
