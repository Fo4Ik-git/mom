import { z } from "zod";
import { apiErrorBody } from "@/lib/errors/api-error";

const PATH_LABELS: Record<string, string> = {
  name: "Calculator name",
  description: "Description",
  config: "Configuration",
  inputs: "Input fields",
  outputs: "Output fields",
  constants: "Constants",
  properties: "Line item variables",
  label: "label",
  id: "identifier",
  expression: "formula",
  value: "value",
  operator: "operator",
  operand: "operand",
  inner: "group contents",
  left: "left side",
  right: "right side",
};

const CODE_MESSAGES: Record<string, string> = {
  too_small: "too short or empty",
  too_big: "too long",
  invalid_format: "invalid format",
  invalid_type: "invalid type",
  invalid_value: "invalid value",
  invalid_union: "invalid structure",
  custom: "invalid value",
};

function segmentLabel(segment: string | number, parentKey?: string): string {
  if (typeof segment === "number") {
    if (parentKey === "inputs") {
      return `Input ${segment + 1}`;
    }
    if (parentKey === "outputs") {
      return `Output ${segment + 1}`;
    }
    if (parentKey === "constants") {
      return `Constant ${segment + 1}`;
    }
    if (parentKey === "properties") {
      return `Variable ${segment + 1}`;
    }
    return `#${segment + 1}`;
  }
  return PATH_LABELS[segment] ?? segment;
}

function formatPath(path: (string | number)[]): string {
  const parts: string[] = [];
  for (let i = 0; i < path.length; i += 1) {
    const segment = path[i];
    const parentKey = typeof path[i - 1] === "string" ? String(path[i - 1]) : undefined;
    parts.push(segmentLabel(segment, parentKey));
  }
  return parts.join(" → ");
}

function formatIssueMessage(issue: z.ZodIssue): string {
  const path = (
    "path" in issue && Array.isArray(issue.path) ? issue.path : []
  ) as (string | number)[];
  const location = path.length > 0 ? formatPath(path) : "Data";

  const code = issue.code;
  let detail = CODE_MESSAGES[code] ?? issue.message;

  if (code === "invalid_format" && "format" in issue && issue.format === "regex") {
    if (path.includes("id")) {
      detail =
        "identifier must use only a-z, digits and _ (e.g. var_cost). Rename the field or clear the label and try again";
    } else {
      detail = "invalid format";
    }
  }

  if (code === "too_small" && "minimum" in issue && issue.minimum === 1) {
    if (path.includes("label")) {
      detail = "fill in the label";
    } else if (path.includes("inputs")) {
      detail = "add at least one input field";
    } else if (path.includes("outputs")) {
      detail = "add at least one output field";
    }
  }

  return `${location}: ${detail}`;
}

export function formatZodIssues(error: z.ZodError): string[] {
  return error.issues.map(formatIssueMessage);
}

export function validationErrorResponse(
  issues: string[],
  module: "CALCULATOR" | "CALCULATOR_BUILDER" | "PLATFORM" = "CALCULATOR",
) {
  return apiErrorBody(module, "VALIDATION_FAILED", {
    message:
      issues.length === 1
        ? issues[0]
        : `Found ${issues.length} errors. See the list below.`,
    issues,
  });
}
