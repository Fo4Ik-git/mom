import { describe, expect, it } from "vitest";
import { normalizeAiCalculatorScript } from "@/lib/ai/normalize-ai-script";
import { parseCalculatorScript } from "@/lib/calculator/script/parse";

describe("normalizeAiCalculatorScript", () => {
  it("joins line-broken expressions and fixes .quantity in formulas", () => {
    const raw = `input field_paint {
  label = "Краска"
  quantity = 1
  property var_price { label = "Ціна" value = 10 }
}

output output_total {
  formula {
    local total = (field_paint.quantity * field_paint.var_price) +
                  (field_wood.quantity * field_wood.var_price)
    return total
  }
}`;

    const normalized = normalizeAiCalculatorScript(raw);
    expect(normalized).toContain("field_paint.qty");
    expect(normalized).not.toMatch(/formula \{[\s\S]*\.quantity/);
    expect(normalized).toMatch(
      /local total = \(field_paint\.qty \* field_paint\.var_price\) \+ \(field_wood\.qty \* field_wood\.var_price\)/,
    );

    const parsed = parseCalculatorScript(normalized);
    expect(parsed.errors).toEqual([]);
    expect(parsed.config?.outputs[0]?.id).toBe("output_total");
  });
});
