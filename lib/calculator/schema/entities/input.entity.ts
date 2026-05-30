import { isLineItemsField } from "@/lib/calculator/fields/line-items";
import {
  formatEntityOpening,
  formatPropertyBlock,
  formatScalar,
  parseEntityHeader,
  parseLegacyInputProperties,
  parseStructuredBody,
  readNumberField,
  readStringField,
} from "@/lib/calculator/schema/patterns/structured-block";
import type { ConfigEntityDefinition } from "@/lib/calculator/schema/_definition";
import type { InputField, InputProperty } from "@/types/calculator";
import { parseBlockBody, readQuotedString } from "@/lib/calculator/schema/patterns/block-body";

export const inputEntity: ConfigEntityDefinition = {
  keyword: "input",
  label: "Input field",
  format: (declaration, ctx) => {
    if (declaration.kind !== "input") {
      return [];
    }
    const input = declaration.data;
    const indent = ctx.indent ?? "  ";
    const lines: string[] = [formatEntityOpening("input", input.id)];

    lines.push(`${indent}${formatScalar("label", input.label)}`);

    if (input.section?.trim()) {
      lines.push(`${indent}${formatScalar("section", input.section.trim())}`);
    }

    if (isLineItemsField(input)) {
      lines.push(`${indent}${formatScalar("mode", "lineItems")}`);
      if (input.lineItemDefaultRowCount != null) {
        lines.push(
          `${indent}${formatScalar("rows", input.lineItemDefaultRowCount)}`,
        );
      }
    } else if (input.inputMode === "time") {
      lines.push(`${indent}${formatScalar("mode", "time")}`);
      if (input.timeUnit) {
        lines.push(`${indent}${formatScalar("time_unit", input.timeUnit)}`);
      }
    }

    if (input.defaultQuantity != null) {
      lines.push(`${indent}${formatScalar("quantity", input.defaultQuantity)}`);
    }

    if (input.presets?.length) {
      lines.push(`${indent}presets = ${input.presets.join(", ")}`);
    }

    lines.push("");

    for (const property of input.properties) {
      lines.push(
        ...formatPropertyBlock(
          property.id,
          {
            label: property.label,
            value: property.value,
            auto_total: property.autoTotal ? true : undefined,
          },
          indent,
        ),
      );
      lines.push("");
    }

    if (lines[lines.length - 1] === "") {
      lines.pop();
    }

    lines.push("}");
    return lines;
  },
  parseHeader: (line) => parseEntityHeader(line, "input"),
  parseBody: (body, header) => {
    const structured = parseStructuredBody(body);
    if ("error" in structured) {
      return structured;
    }

    let properties: InputProperty[] = structured.properties.map((property) => ({
      id: property.id,
      label: readStringField(property.fields, "label"),
      value: readNumberField(property.fields, "value") ?? 0,
      ...(property.fields.get("auto_total") === true ? { autoTotal: true } : {}),
    }));

    if (properties.length === 0) {
      const legacy = parseLegacyInputProperties(body);
      if ("error" in legacy) {
        return legacy;
      }
      properties = legacy.map((property) => ({
        id: property.id,
        label: readStringField(property.fields, "label"),
        value: readNumberField(property.fields, "value") ?? 0,
      }));
    }

    if (properties.length === 0) {
      return { error: `Input ${header.id} must declare at least one property` };
    }

    const label =
      readStringField(structured.fields, "label") || header.label || header.id;
    let inputMode: InputField["inputMode"];
    let timeUnit: InputField["timeUnit"];
    let lineItemDefaultRowCount: number | undefined;
    let defaultQuantity = readNumberField(structured.fields, "quantity");
    let section = readStringField(structured.fields, "section") || undefined;
    let presets = structured.listFields.get("presets");

    const mode = readStringField(structured.fields, "mode");
    if (mode === "lineItems") {
      inputMode = "lineItems";
      lineItemDefaultRowCount = readNumberField(structured.fields, "rows");
    } else if (mode === "time") {
      inputMode = "time";
      timeUnit =
        (readStringField(structured.fields, "time_unit") as InputField["timeUnit"]) ||
        undefined;
    }

    const bodyMap = parseBlockBody(body);
    for (const [key, values] of bodyMap.entries()) {
      for (const value of values) {
        if (key === "mode" && !mode) {
          if (value === "lineItems") {
            inputMode = "lineItems";
          } else if (value === "time") {
            inputMode = "time";
          }
        }
        if (key === "timeunit" && !timeUnit) {
          if (value === "hour" || value === "minute") {
            timeUnit = value;
          }
        }
        if (key === "rows" && lineItemDefaultRowCount == null) {
          lineItemDefaultRowCount = Number(value) || undefined;
        }
        if (key === "quantity" && defaultQuantity == null) {
          const parts = value.split(/\s+/);
          if (parts[0] === "default") {
            defaultQuantity = Number(parts[1]) || 0;
          }
        }
        if (key === "section" && !section) {
          section = readQuotedString(value.split(/\s+/)[0] ?? "") ?? undefined;
        }
        if (key === "presets" && !presets?.length) {
          presets = value
            .split(",")
            .map((part) => Number(part.trim()))
            .filter((n) => Number.isFinite(n));
        }
      }
    }

    const data: InputField = {
      id: header.id,
      label,
      properties,
      ...(section ? { section } : {}),
      ...(inputMode ? { inputMode } : {}),
      ...(timeUnit ? { timeUnit } : {}),
      ...(lineItemDefaultRowCount != null
        ? { lineItemDefaultRowCount }
        : {}),
      ...(defaultQuantity != null ? { defaultQuantity } : {}),
      ...(presets?.length ? { presets } : {}),
    };

    return { kind: "input", data };
  },
};
