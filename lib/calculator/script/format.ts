import { isAutoCalculationId } from "@/lib/calculator/auto-calculations";
import type { ScriptDeclaration, ScriptFormatContext } from "@/lib/calculator/schema/_definition";
import { constantEntity } from "@/lib/calculator/schema/entities/constant.entity";
import { calculationEntity } from "@/lib/calculator/schema/entities/calculation.entity";
import { inputEntity } from "@/lib/calculator/schema/entities/input.entity";
import { outputEntity } from "@/lib/calculator/schema/entities/output.entity";
import type { CalculatorConfig } from "@/types/calculator";

const SCRIPT_HEADER = `// Calculator script — один файл, декларативно
// input = поле вводу (як class Input), property = змінна зі значенням за замовч.
// calc / output = формули (блоки { } або = в один рядок)
`;

export function formatCalculatorScript(config: CalculatorConfig): string {
  const lines: string[] = [SCRIPT_HEADER.trimEnd(), ""];

  for (const input of config.inputs) {
    lines.push(...inputEntity.format({ kind: "input", data: input }, {}));
    lines.push("");
  }

  for (const constant of config.constants ?? []) {
    lines.push(
      ...constantEntity.format({ kind: "constant", data: constant }, {}),
    );
    lines.push("");
  }

  for (const calc of config.calculations ?? []) {
    if (isAutoCalculationId(calc.id)) {
      continue;
    }
    lines.push(
      ...calculationEntity.format({ kind: "calculation", data: calc }, {}),
    );
    lines.push("");
  }

  for (const output of config.outputs) {
    lines.push(...outputEntity.format({ kind: "output", data: output }, {}));
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

export function formatDeclaration(
  declaration: ScriptDeclaration,
  ctx: ScriptFormatContext = {},
): string {
  switch (declaration.kind) {
    case "input":
      return inputEntity.format(declaration, ctx).join("\n");
    case "constant":
      return constantEntity.format(declaration, ctx).join("\n");
    case "calculation":
      return calculationEntity.format(declaration, ctx).join("\n");
    case "output":
      return outputEntity.format(declaration, ctx).join("\n");
    default:
      return "";
  }
}
