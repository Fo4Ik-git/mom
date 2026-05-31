import { describe, expect, it } from "vitest";
import { parseScriptFile } from "@/lib/calculator/script/parse-file";
import { formatDeclaration } from "@/lib/calculator/script/format";
import { SCRIPT_FILE_MACROS } from "@/lib/calculator/script/project-types";

describe("macro script entity", () => {
  it("parses and formats macro declaration", () => {
    const source = `macro macro_unit "Unit" {
  label = "Unit"
  formula {
    return field_item.var_price
  }
}`;

    const parsed = parseScriptFile(source, SCRIPT_FILE_MACROS);
    expect(parsed.errors).toEqual([]);
    expect(parsed.declarations).toHaveLength(1);
    expect(parsed.declarations[0]?.kind).toBe("macro");
    if (parsed.declarations[0]?.kind === "macro") {
      expect(parsed.declarations[0].data.id).toBe("macro_unit");
      const formatted = formatDeclaration(parsed.declarations[0]);
      expect(formatted).toContain("macro macro_unit");
      expect(formatted).toContain("return field_item.var_price");
    }
  });
});
