import { describe, expect, it } from "vitest";
import { calculationEntity } from "@/lib/calculator/schema/entities/calculation.entity";
import { outputEntity } from "@/lib/calculator/schema/entities/output.entity";
import { emptyCalculatorConfig } from "@/lib/calculator/config/defaults";
import { parseEntityHeader } from "@/lib/calculator/schema/patterns/structured-block";
import {
  formatFormulaProgram,
  parseFormulaProgram,
  tryParseFormulaProgram,
} from "@/lib/formula/code/formula-program";
import { evaluateFormulaWithLocals } from "@/lib/formula/runtime/block-evaluate";
import { buildOutputBreakdowns } from "@/lib/formula/blocks/block-format-values";
import { createEvalContext } from "../helpers/fixtures";

describe("formula program locals", () => {
  const target = { fieldId: "calc_123123" };

  const source = `calc calc_123123 {
  label = "123123"
  formula {
    local price = field_item.qty * field_item.var_price
    return if(field_item.qty >= 10, price * 1.2, price)
  }
}`;

  it("parses local variables and return expression", () => {
    const program = parseFormulaProgram(
      `local price = field_item.qty * field_item.var_price
return if(field_item.qty >= 10, price * 1.2, price)`,
      target,
    );

    expect(program.locals).toHaveLength(1);
    expect(program.locals[0]?.id).toBe("price");
    expect(program.expression.type).toBe("conditional");
  });

  it("round-trips through calc entity", () => {
    const header = parseEntityHeader("calc calc_123123 {", "calc")!;
    const body = source.slice(source.indexOf("{") + 1, source.lastIndexOf("}"));
    const parsed = calculationEntity.parseBody!(body, header, {
      fileId: "calculations.calc",
    });
    expect(parsed).not.toHaveProperty("error");
    if ("error" in parsed || parsed.kind !== "calculation") {
      throw new Error("parse failed");
    }

    expect(parsed.data.locals).toHaveLength(1);
    expect(parsed.data.locals?.[0]?.id).toBe("price");

    const lines = calculationEntity.format(parsed, {
      config: emptyCalculatorConfig,
      includeAutoCalculations: false,
    });
    const text = lines.join("\n");
    expect(text).toContain("local price = field_item.qty * field_item.var_price");
    expect(text).toContain("return IF(field_item.qty >= 10, price * 1.2, price)");
  });

  it("evaluates locals before return", () => {
    const program = tryParseFormulaProgram(
      `local price = field_item.qty * field_item.var_price
return if(field_item.qty >= 10, price * 1.2, price)`,
      target,
    );
    expect(program.ok).toBe(true);
    if (!program.ok) {
      return;
    }

    const ctx = createEvalContext();
    const lowQty = evaluateFormulaWithLocals(
      program.program.expression,
      program.program.locals,
      ctx,
    );
    expect(lowQty).toBe(60);

    const highQty = evaluateFormulaWithLocals(
      program.program.expression,
      program.program.locals,
      createEvalContext({ quantities: { field_item: 10, field_lines: 2 } }),
    );
    expect(highQty).toBe(240);
  });

  it("formats and re-parses a program", () => {
    const program = parseFormulaProgram(
      "local subtotal = field_item.qty * 2\nreturn subtotal + 1",
      target,
    );
    const formatted = formatFormulaProgram(program, target);
    const reparsed = parseFormulaProgram(formatted, target);
    expect(reparsed.locals[0]?.id).toBe("subtotal");
    expect(reparsed.expression.type).toBe("operation");
  });

  it("rejects duplicate local names", () => {
    const result = tryParseFormulaProgram(
      "local x = 1\nlocal x = 2\nreturn x",
      target,
    );
    expect(result.ok).toBe(false);
  });
});

describe("output breakdown with locals", () => {
  it("substitutes local variable values in breakdown text", () => {
    const source = `output output_total {
  label = "Total"
  highlight = true
  formula {
    local price = field_item.var_price * field_item.qty
    return IF(field_item.qty >= 10, price + const_factor, price)
  }
}`;

    const header = parseEntityHeader("output output_total {", "output")!;
    const body = source.slice(source.indexOf("{") + 1, source.lastIndexOf("}"));
    const parsed = outputEntity.parseBody!(body, header);
    if ("error" in parsed || parsed.kind !== "output") {
      throw new Error("parse failed");
    }

    const config = {
      ...emptyCalculatorConfig,
      inputs: [
        {
          ...emptyCalculatorConfig.inputs[0]!,
          properties: [
            { id: "var_cost", label: "Cost", value: 10 },
            { id: "var_price", label: "Price", value: 20 },
          ],
          defaultQuantity: 10,
        },
      ],
      outputs: [parsed.data],
    };

    const quantities = { field_item: 10 };
    const breakdowns = buildOutputBreakdowns(config, quantities, {
      output_total: 201.2,
    });

    expect(breakdowns.output_total).toBe(
      "price = 200; IF(10 ≥ 10, 200 + 1.20, 200) = 201.20",
    );
  });
});
