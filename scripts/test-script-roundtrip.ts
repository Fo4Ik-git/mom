import { finalizeConfig } from "@/lib/calculator/config-sync";
import { emptyCalculatorConfig } from "@/lib/calculator/defaults";
import { isAutoCalculationId } from "@/lib/calculator/auto-calculations";
import { formatCalculatorScript } from "@/lib/calculator/script/format";
import { formatScriptProject } from "@/lib/calculator/script/format-project";
import { parseCalculatorScript } from "@/lib/calculator/script/parse";
import { parseScriptProject } from "@/lib/calculator/script/parse-project";
import { scriptProjectToMonolith } from "@/lib/calculator/script/format-project";
import type { CalculatorConfig } from "@/types/calculator";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function normalizeConfig(config: CalculatorConfig): CalculatorConfig {
  return {
    ...config,
    inputs: config.inputs.map((input) => ({
      ...input,
      defaultQuantity:
        input.defaultQuantity === 0 ? undefined : input.defaultQuantity,
    })),
    calculations: (config.calculations ?? []).filter(
      (calc) => !isAutoCalculationId(calc.id),
    ),
    outputs: config.outputs.map((output) => {
      const next = { ...output };
      if (next.highlight === false) {
        delete next.highlight;
      }
      return next;
    }),
  };
}

function assertConfigEquivalent(
  left: CalculatorConfig,
  right: CalculatorConfig,
  label: string,
) {
  assert(
    JSON.stringify(normalizeConfig(left)) === JSON.stringify(normalizeConfig(right)),
    `${label}: config mismatch`,
  );
}

function testMonolithRoundTrip() {
  const source = formatCalculatorScript(emptyCalculatorConfig);
  const parsed = parseCalculatorScript(source, emptyCalculatorConfig);
  assert(parsed.errors.length === 0, `monolith parse errors: ${JSON.stringify(parsed.errors)}`);
  assert(parsed.config, "monolith parse returned no config");
  assertConfigEquivalent(parsed.config, emptyCalculatorConfig, "monolith round-trip");
}

function testProjectRoundTrip() {
  const project = formatScriptProject(emptyCalculatorConfig);
  const parsed = parseScriptProject(project, emptyCalculatorConfig);
  assert(parsed.errors.length === 0, `project parse errors: ${JSON.stringify(parsed.errors)}`);
  assert(parsed.config, "project parse returned no config");
  assertConfigEquivalent(parsed.config, emptyCalculatorConfig, "project round-trip");
}

function testProjectMatchesMonolith() {
  const project = formatScriptProject(emptyCalculatorConfig);
  const monolith = scriptProjectToMonolith(project);
  const fromProject = parseScriptProject(project, emptyCalculatorConfig).config;
  const fromMonolith = parseCalculatorScript(monolith, emptyCalculatorConfig).config;
  assert(fromProject && fromMonolith, "parse failed");
  assertConfigEquivalent(fromProject, fromMonolith, "project vs monolith");
}

function testIdRenamePropagation() {
  const project = formatScriptProject(emptyCalculatorConfig);
  project["inputs.calc"] = project["inputs.calc"].replace(
    "field_item",
    "pos",
  );
  const parsed = parseScriptProject(project, emptyCalculatorConfig);
  assert(parsed.errors.length === 0, `rename parse errors: ${JSON.stringify(parsed.errors)}`);
  assert(parsed.config?.inputs[0]?.id === "pos", "input id not renamed");
  const output = parsed.config?.outputs[0]?.expression;
  assert(
    output?.type === "operation" &&
      output.left.type === "operation" &&
      output.left.left.type === "operand" &&
      output.left.left.operand.kind === "property" &&
      output.left.left.operand.fieldId === "pos",
    "output expression not rewritten to pos",
  );
  assert(
    parsed.project?.["outputs.calc"].includes("pos.var_price"),
    "outputs.calc text not rewritten",
  );
}

function testIncludeExpansion() {
  const project = formatScriptProject(emptyCalculatorConfig);
  project["constants.calc"] = "";
  project["calculations.calc"] = `#include "inputs.calc"

calc calc_margin "Margin" {
  label = "Margin"
  formula {
    return field_item.var_price - field_item.var_cost
  }
}`;

  const parsed = parseScriptProject(project, emptyCalculatorConfig);
  assert(parsed.errors.length === 0, `include parse errors: ${JSON.stringify(parsed.errors)}`);
  assert(parsed.config?.inputs.length === 1, "include should bring inputs");
  assert(
    (parsed.config?.calculations ?? []).some((calc) => calc.id === "calc_margin"),
    "calc from including file should parse",
  );
}

function testIncludeMergedOnce() {
  const project = formatScriptProject(emptyCalculatorConfig);
  project["constants.calc"] = "";
  project["calculations.calc"] = `#include "inputs.calc"

calc calc_margin "Margin" {
  label = "Margin"
  formula { return field_item.var_price - field_item.var_cost }
}`;
  project["outputs.calc"] = `#include "inputs.calc"
${project["outputs.calc"]}`;

  const parsed = parseScriptProject(project, emptyCalculatorConfig);
  assert(parsed.errors.length === 0, `double include errors: ${JSON.stringify(parsed.errors)}`);
  assert(parsed.config?.inputs.length === 1, "inputs merged once");
}

function testIncludeCycle() {
  const project = formatScriptProject(emptyCalculatorConfig);
  project["inputs.calc"] = `#include "outputs.calc"\n${project["inputs.calc"]}`;
  project["outputs.calc"] = `#include "inputs.calc"\n${project["outputs.calc"]}`;

  const parsed = parseScriptProject(project, emptyCalculatorConfig);
  assert(parsed.errors.length > 0, "include cycle should error");
  assert(
    parsed.errors.some((error) => error.message.includes("Include cycle")),
    "expected cycle error",
  );
}

function testAutoCalculationsTab() {
  const config = finalizeConfig(
    {
      ...emptyCalculatorConfig,
      inputs: [
        {
          ...emptyCalculatorConfig.inputs[0]!,
          properties: emptyCalculatorConfig.inputs[0]!.properties.map((property) => ({
            ...property,
            autoTotal: true,
          })),
        },
      ],
    },
    "total",
  );

  const project = formatScriptProject(config);
  assert(
    project["auto-calculations.calc"].includes("calc_field_item_var_cost"),
    "auto tab should contain auto calc",
  );

  const customProject = {
    ...project,
    "auto-calculations.calc": project["auto-calculations.calc"].replace(
      "field_item.var_cost",
      "field_item.var_cost * 2",
    ),
  };

  const parsed = parseScriptProject(customProject, config);
  assert(parsed.errors.length === 0, `auto tab parse: ${JSON.stringify(parsed.errors)}`);
  const autoCalc = parsed.config?.calculations?.find(
    (calc) => calc.id === "calc_field_item_var_cost",
  );
  assert(autoCalc, "auto calc missing after parse");
  assert(
    autoCalc.expression.type === "operation" &&
      autoCalc.expression.operator === "*",
    "custom auto formula should be preserved",
  );
}

function main() {
  testMonolithRoundTrip();
  testProjectRoundTrip();
  testProjectMatchesMonolith();
  testIdRenamePropagation();
  testIncludeExpansion();
  testIncludeMergedOnce();
  testIncludeCycle();
  testAutoCalculationsTab();
  console.log("script round-trip: ok");
}

main();
