import { isAutoCalculationId } from "@/lib/calculator/config/auto-calculations";
import { formatFormulaCodeBlock } from "@/lib/formula/code/code-format";
import {
  FormulaParseError,
  normalizeParsedExpression,
  parseFormulaCode,
  tryParseFormulaCode,
} from "@/lib/formula/code/code-parse";
import type { BlockExpression, CalculatorConfig } from "@/types/calculator";

export interface FormulaSection {
  id: string;
  label: string;
  kind: "calculation" | "output";
  source: string;
}

export function formatConfigFormulasDocument(config: CalculatorConfig): string {
  const lines: string[] = [];

  for (const calc of config.calculations ?? []) {
    if (isAutoCalculationId(calc.id)) {
      continue;
    }
    lines.push(`[${calc.id}]`);
    if (calc.label.trim()) {
      lines.push(`// ${calc.label.trim()}`);
    }
    lines.push(formatFormulaCodeBlock(calc.expression, { fieldId: calc.id }));
    lines.push("");
  }

  for (const output of config.outputs) {
    lines.push(`[${output.id}]`);
    if (output.label.trim()) {
      lines.push(`// ${output.label.trim()}`);
    }
    lines.push(formatFormulaCodeBlock(output.expression, { fieldId: output.id }));
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

const SECTION_HEADER = /^\[([a-z][a-z0-9_]*)\]\s*$/;

export function parseConfigFormulasDocument(
  source: string,
  config: CalculatorConfig,
): { config: CalculatorConfig; errors: Array<{ id?: string; error: string; offset: number }> } {
  const errors: Array<{ id?: string; error: string; offset: number }> = [];
  const sections = splitFormulaSections(source);

  let nextConfig = { ...config };

  for (const section of sections) {
    const calcIndex = (nextConfig.calculations ?? []).findIndex(
      (item) => item.id === section.id,
    );
    const outputIndex = nextConfig.outputs.findIndex(
      (item) => item.id === section.id,
    );

    if (calcIndex < 0 && outputIndex < 0) {
      errors.push({
        id: section.id,
        error: `Unknown formula id "${section.id}"`,
        offset: section.headerOffset,
      });
      continue;
    }

    if (calcIndex >= 0 && isAutoCalculationId(section.id)) {
      errors.push({
        id: section.id,
        error: "Auto-calculations cannot be edited as code",
        offset: section.headerOffset,
      });
      continue;
    }

    const parsed = tryParseFormulaCode(section.body, {
      target: { fieldId: section.id },
    });
    if (!parsed.ok) {
      errors.push({
        id: section.id,
        error: parsed.error,
        offset: section.bodyOffset + parsed.offset,
      });
      continue;
    }

    const expression = normalizeParsedExpression(parsed.expression);

    if (calcIndex >= 0) {
      const calculations = [...(nextConfig.calculations ?? [])];
      calculations[calcIndex] = {
        ...calculations[calcIndex]!,
        expression,
      };
      nextConfig = { ...nextConfig, calculations };
    } else {
      const outputs = [...nextConfig.outputs];
      outputs[outputIndex] = {
        ...outputs[outputIndex]!,
        expression,
      };
      nextConfig = { ...nextConfig, outputs };
    }
  }

  return { config: nextConfig, errors };
}

function splitFormulaSections(source: string): Array<{
  id: string;
  body: string;
  headerOffset: number;
  bodyOffset: number;
}> {
  const lines = source.split("\n");
  const sections: Array<{
    id: string;
    body: string;
    headerOffset: number;
    bodyOffset: number;
  }> = [];

  let offset = 0;
  let current: {
    id: string;
    bodyLines: string[];
    headerOffset: number;
    bodyOffset: number;
  } | null = null;

  for (const line of lines) {
    const headerMatch = line.trim().match(SECTION_HEADER);
    if (headerMatch) {
      if (current) {
        sections.push({
          id: current.id,
          body: current.bodyLines.join("\n").trim(),
          headerOffset: current.headerOffset,
          bodyOffset: current.bodyOffset,
        });
      }
      current = {
        id: headerMatch[1]!,
        bodyLines: [],
        headerOffset: offset,
        bodyOffset: offset + line.length + 1,
      };
    } else if (current) {
      current.bodyLines.push(line);
    }
    offset += line.length + 1;
  }

  if (current) {
    sections.push({
      id: current.id,
      body: current.bodyLines.join("\n").trim(),
      headerOffset: current.headerOffset,
      bodyOffset: current.bodyOffset,
    });
  }

  return sections;
}

export function listFormulaSections(config: CalculatorConfig): FormulaSection[] {
  const sections: FormulaSection[] = [];

  for (const calc of config.calculations ?? []) {
    if (isAutoCalculationId(calc.id)) {
      continue;
    }
    sections.push({
      id: calc.id,
      label: calc.label,
      kind: "calculation",
      source: formatFormulaCodeBlock(calc.expression, { fieldId: calc.id }),
    });
  }

  for (const output of config.outputs) {
    sections.push({
      id: output.id,
      label: output.label,
      kind: "output",
      source: formatFormulaCodeBlock(output.expression, { fieldId: output.id }),
    });
  }

  return sections;
}

export function assertFormulaDocumentParses(source: string, config: CalculatorConfig) {
  const result = parseConfigFormulasDocument(source, config);
  if (result.errors.length > 0) {
    const first = result.errors[0]!;
    throw new FormulaParseError(first.error, first.offset);
  }
  return result.config;
}
