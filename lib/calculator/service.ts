import { db } from "@/lib/platform/db";
import { slugify, randomSuffix } from "@/lib/platform/slug";
import { formatZodIssues } from "@/lib/platform/validation-errors";
import {
  calculatorConfigSchema,
  parseCalculatorConfig,
  serializeCalculatorConfig,
  type CalculatorConfig,
} from "@/types/calculator";
import { validateConfigFormulas } from "@/lib/formula/runtime/evaluate";

export class CalculatorValidationError extends Error {
  issues: string[];

  constructor(issues: string[]) {
    super(
      issues.length === 1
        ? issues[0]
        : `Знайдено ${issues.length} помилок у калькуляторі`,
    );
    this.name = "CalculatorValidationError";
    this.issues = issues;
  }
}

export async function createUniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "calculator";
  let slug = base;
  let attempt = 0;

  while (await db.calculator.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${base}-${randomSuffix(4)}`;
    if (attempt > 20) {
      slug = `${base}-${Date.now()}`;
      break;
    }
  }

  return slug;
}

export function collectCalculatorConfigIssues(config: unknown): string[] {
  const parsed = calculatorConfigSchema.safeParse(config);
  if (!parsed.success) {
    return formatZodIssues(parsed.error);
  }

  return validateConfigFormulas(parsed.data).map((item) => item.message);
}

export function validateCalculatorConfig(config: unknown): CalculatorConfig {
  const issues = collectCalculatorConfigIssues(config);
  if (issues.length > 0) {
    throw new CalculatorValidationError(issues);
  }
  return calculatorConfigSchema.parse(config);
}

export function toCalculatorResponse(calculator: {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  config: string;
  isPublic: boolean;
  isTemplate: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: calculator.id,
    name: calculator.name,
    description: calculator.description,
    slug: calculator.slug,
    config: parseCalculatorConfig(calculator.config),
    isPublic: calculator.isPublic,
    isTemplate: calculator.isTemplate,
    userId: calculator.userId,
    createdAt: calculator.createdAt.toISOString(),
    updatedAt: calculator.updatedAt.toISOString(),
  };
}

export function serializeConfig(config: CalculatorConfig): string {
  return serializeCalculatorConfig(config);
}
