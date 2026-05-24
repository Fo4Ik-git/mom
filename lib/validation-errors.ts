import { z } from "zod";

const PATH_LABELS: Record<string, string> = {
  name: "Назва калькулятора",
  description: "Опис",
  config: "Конфігурація",
  inputs: "Поля вводу",
  outputs: "Поля результату",
  constants: "Константи",
  properties: "Змінні позиції",
  label: "назва",
  id: "ідентифікатор",
  expression: "формула",
  value: "значення",
  operator: "оператор",
  operand: "операнд",
  inner: "вміст дужок",
  left: "ліва частина",
  right: "права частина",
};

const CODE_MESSAGES: Record<string, string> = {
  too_small: "занадто коротке або порожнє",
  too_big: "занадто довге",
  invalid_format: "некоректний формат",
  invalid_type: "некоректний тип",
  invalid_value: "некоректне значення",
  invalid_union: "некоректна структура",
  custom: "некоректне значення",
};

function segmentLabel(segment: string | number, parentKey?: string): string {
  if (typeof segment === "number") {
    if (parentKey === "inputs") {
      return `Позиція ${segment + 1}`;
    }
    if (parentKey === "outputs") {
      return `Результат ${segment + 1}`;
    }
    if (parentKey === "constants") {
      return `Константа ${segment + 1}`;
    }
    if (parentKey === "properties") {
      return `Змінна ${segment + 1}`;
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
  const location = path.length > 0 ? formatPath(path) : "Дані";

  const code = issue.code;
  let detail = CODE_MESSAGES[code] ?? issue.message;

  if (code === "invalid_format" && "format" in issue && issue.format === "regex") {
    if (path.includes("id")) {
      detail =
        "ідентифікатор має містити лише латинські літери a-z, цифри та _ (наприклад var_cost). Перейменуйте поле латиницею або очистіть назву і введіть знову";
    } else {
      detail = "некоректний формат";
    }
  }

  if (code === "too_small" && "minimum" in issue && issue.minimum === 1) {
    if (path.includes("label")) {
      detail = "заповніть назву";
    } else if (path.includes("inputs")) {
      detail = "додайте хоча б одне поле вводу";
    } else if (path.includes("outputs")) {
      detail = "додайте хоча б одне поле результату";
    }
  }

  return `${location}: ${detail}`;
}

export function formatZodIssues(error: z.ZodError): string[] {
  return error.issues.map(formatIssueMessage);
}

export function validationErrorResponse(issues: string[]) {
  return {
    error:
      issues.length === 1
        ? issues[0]
        : `Знайдено ${issues.length} помилок. Перевірте список нижче.`,
    issues,
  };
}
