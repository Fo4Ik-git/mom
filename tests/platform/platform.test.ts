import { describe, expect, it } from "vitest";
import { z } from "zod";
import { slugify, randomSuffix } from "@/lib/platform/slug";
import {
  formatZodIssues,
  validationErrorResponse,
} from "@/lib/platform/validation-errors";

describe("platform slug", () => {
  it("slugify normalizes unicode and trims", () => {
    expect(slugify("  Hello World!  ")).toBe("hello-world");
    expect(slugify("Калькулятор")).toBe("калькулятор");
    expect(slugify("a".repeat(100)).length).toBeLessThanOrEqual(60);
  });

  it("randomSuffix has expected length", () => {
    expect(randomSuffix()).toHaveLength(6);
    expect(randomSuffix(4)).toHaveLength(4);
  });
});

describe("validation errors", () => {
  it("formatZodIssues produces English location messages", () => {
    const schema = z.object({
      name: z.string().min(1),
      inputs: z.array(z.object({ label: z.string().min(1) })).min(1),
    });
    const result = schema.safeParse({ name: "", inputs: [] });
    if (result.success) {
      throw new Error("expected failure");
    }
    const issues = formatZodIssues(result.error);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((msg) => msg.includes("Calculator name"))).toBe(true);
  });

  it("validationErrorResponse single vs multi issue", () => {
    const single = validationErrorResponse(["One error"]);
    expect(single.error).toBe("One error");
    expect(single.status.module).toBe("Calculator");
    expect(single.status.code).toBe(2);

    const multi = validationErrorResponse(["A", "B"]);
    expect(multi.error).toContain("2");
    expect(multi.issues).toHaveLength(2);
  });
});
