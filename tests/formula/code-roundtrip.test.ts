import { describe, it } from "vitest";
import { getAllFormulaPrimitives } from "@/lib/formula/nodes/registry";
import { collectFormulaDocs } from "@/lib/formula/docs/collect-formula-docs";
import {
  expectFormulaRoundTrip,
  DEFAULT_FORMULA_TARGET,
} from "../helpers/formula-roundtrip";

describe("formula code round-trip", () => {
  const docs = collectFormulaDocs();

  it.each(docs.primitives.map((entry) => [entry.id, entry.example] as const))(
    "round-trips primitive %s",
    (_id, example) => {
      if (!example.trim()) {
        return;
      }
      expectFormulaRoundTrip(example, DEFAULT_FORMULA_TARGET);
    },
  );

  it("round-trips nested expression with precedence", () => {
    expectFormulaRoundTrip(
      "field_item.var_cost + field_item.var_price * field_item.qty",
    );
  });

  it("round-trips grouped subtraction", () => {
    expectFormulaRoundTrip(
      "(field_item.var_price - field_item.var_cost) / const_factor",
    );
  });

  it("round-trips all row aggregate keywords", () => {
    for (const primitive of getAllFormulaPrimitives()) {
      if (primitive.astType !== "rowAggregate" || !primitive.call) {
        continue;
      }
      const example = `${primitive.call.keyword}(field_lines, row.var_cost * row.var_qty)`;
      expectFormulaRoundTrip(example);
    }
  });

  it("round-trips calculation and output target refs", () => {
    expectFormulaRoundTrip("calc_subtotal + const_factor", {
      fieldId: "output_total",
    });
    expectFormulaRoundTrip("field_item.var_price", {
      fieldId: "calc_margin",
    });
  });
});
