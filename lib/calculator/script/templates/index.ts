import type { ScriptProject } from "@/lib/calculator/script/project-types";

export type CalculatorTemplate = {
  id: string;
  aliases?: string[];
  label: string;
  description: string;
  project: ScriptProject;
};

/** Built-in calculator presets referenced by `#use "…"` in script files. */
export const CALCULATOR_TEMPLATES: CalculatorTemplate[] = [
  {
    id: "print-shop-basic",
    aliases: ["platform/templates/print-shop"],
    label: "Print shop (basic)",
    description:
      "Single item with cost/price properties, markup constant, and total output.",
    project: {
      "inputs.calc": `input field_item {
  label = "Item"
  quantity = 1

  property var_cost {
    label = "Cost"
    value = 0
  }

  property var_price {
    label = "Price"
    value = 0
  }
}`,
      "constants.calc": `constant const_markup {
  label = "Markup factor"
  value = 1.2
}`,
      "auto-calculations.calc": "",
      "calculations.calc": "",
      "outputs.calc": `output output_total {
  label = "Total"
  highlight = true
  formula {
    return field_item.var_price * field_item.qty * const_markup
  }
}`,
    },
  },
];

const templateById = new Map<string, CalculatorTemplate>();

for (const template of CALCULATOR_TEMPLATES) {
  templateById.set(template.id, template);
  for (const alias of template.aliases ?? []) {
    templateById.set(alias, template);
  }
}

export function getCalculatorTemplate(id: string): CalculatorTemplate | undefined {
  return templateById.get(id.trim());
}

export function listCalculatorTemplateIds(): string[] {
  return CALCULATOR_TEMPLATES.map((template) => template.id);
}
