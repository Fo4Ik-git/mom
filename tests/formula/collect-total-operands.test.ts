import { describe, expect, it } from "vitest";
import { emptyCalculatorConfig } from "@/lib/calculator/config/defaults";
import { finalizeConfig } from "@/lib/calculator/config/sync";
import { collectTotalOperands } from "@/lib/formula/core/collect-total-operands";
import { costLike } from "@/lib/formula/core/property-matchers";
import { buildFormulaSnippets } from "@/lib/formula/core/formula-snippets";

describe("collectTotalOperands", () => {
  it("includes every cost property even without autoTotal flag", () => {
    const config = {
      ...emptyCalculatorConfig,
      inputs: [
        {
          ...emptyCalculatorConfig.inputs[0]!,
          id: "field_a",
          label: "Surface",
          properties: [
            { id: "var_cost", label: "Собівартість", value: 6 },
            { id: "var_price", label: "Вартість", value: 12 },
          ],
        },
        {
          ...emptyCalculatorConfig.inputs[0]!,
          id: "field_b",
          label: "Oxi",
          properties: [
            { id: "var_cost", label: "Собівартість", value: 0.38 },
            { id: "var_price", label: "Вартість", value: 1.7 },
          ],
        },
      ],
      calculations: [],
    };

    const operands = collectTotalOperands(config, costLike);
    expect(operands).toHaveLength(2);
    expect(operands.every((op) => op.type === "operation")).toBe(true);
  });

  it("global sum-cost snippet lists all cost operands", () => {
    const config = finalizeConfig(
      {
        ...emptyCalculatorConfig,
        inputs: [
          {
            ...emptyCalculatorConfig.inputs[0]!,
            id: "field_surface",
            label: "Surface",
            properties: [
              { id: "var_cost", label: "Собівартість", value: 6, autoTotal: true },
              { id: "var_price", label: "Вартість", value: 12, autoTotal: true },
            ],
          },
          {
            ...emptyCalculatorConfig.inputs[0]!,
            id: "field_oxi",
            label: "Oxi",
            properties: [
              { id: "var_cost", label: "Собівартість", value: 0.38, autoTotal: true },
              { id: "var_price", label: "Вартість", value: 1.7, autoTotal: true },
            ],
          },
        ],
      },
      "разом",
    );

    const snippet = buildFormulaSnippets(config, "Qty", {
      qtyTimes: "×",
      margin: "M",
      withConstant: "C",
      pickProperty: "P",
      pickPrice: "Price",
      pickCost: "Cost",
      sumAllCost: "Sum cost",
    }).find((s) => s.id === "snip-global-sum-cost");

    expect(snippet?.dragData.kind).toBe("expression");
    if (snippet?.dragData.kind === "expression") {
      expect(snippet.dragData.expression.type).toBe("aggregate");
      if (snippet.dragData.expression.type === "aggregate") {
        const filled = snippet.dragData.expression.args.filter(
          (arg) => arg.type !== "empty",
        );
        expect(filled.length).toBeGreaterThanOrEqual(2);
      }
    }
  });
});
