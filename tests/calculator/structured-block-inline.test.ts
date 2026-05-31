import { describe, expect, it } from "vitest";
import { parseCalculatorScript } from "@/lib/calculator/script/parse";

describe("inline property assignments", () => {
  it("reads value from one-line property blocks", () => {
    const script = `input field_paint {
  label = "Краска"
  quantity = 1
  property var_price { label = "Стоимость" value = 30 }
  property var_cost { label = "Себестоимость" value = 10 }
}

output output_total {
  formula { return field_paint.qty * field_paint.var_price }
}`;

    const result = parseCalculatorScript(script);
    expect(result.errors).toEqual([]);
    const props = result.config?.inputs[0]?.properties ?? [];
    expect(props.find((p) => p.id === "var_price")?.value).toBe(30);
    expect(props.find((p) => p.id === "var_cost")?.value).toBe(10);
  });
});
