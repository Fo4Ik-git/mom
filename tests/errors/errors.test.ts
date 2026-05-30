import { describe, expect, it } from "vitest";
import { apiErrorBody } from "@/lib/errors/api-error";
import { ERRORS, getErrorMeta, MODULE } from "@/lib/errors/Error";
import { formatApiErrorForToast } from "@/lib/errors/format-client-error";

describe("errors registry", () => {
  it("exposes ERRORS and MODULE", () => {
    expect(ERRORS.AUTH.UNAUTHORIZED).toBe(1);
    expect(MODULE.CALCULATOR_BUILDER).toBe("calculator-builder");
  });

  it("builds API error body with module and code", () => {
    const body = apiErrorBody("CALCULATOR_BUILDER", "VALIDATION_FAILED", {
      issues: ["Input 1: fill in the label"],
    });
    expect(body.status).toEqual({
      module: "calculator-builder",
      code: 2,
    });
    expect(body.issues).toEqual(["Input 1: fill in the label"]);
    expect(body.error).toBeTruthy();
  });

  it("getErrorMeta returns numeric code", () => {
    expect(getErrorMeta("AUTH", "EXPIRED_SESSION")).toEqual({
      module: "Auth",
      code: 2,
      codeName: "EXPIRED_SESSION",
    });
  });
});

describe("formatApiErrorForToast", () => {
  it("includes module and code in description", () => {
    const formatted = formatApiErrorForToast(
      {
        error: "Calculator configuration has errors",
        status: {
          module: "calculator-builder",
          code: 2,
        },
        issues: ["Input 1: fill in the label"],
      },
      "Could not save",
    );
    expect(formatted.description).toContain("calculator-builder");
    expect(formatted.description).toContain("#2");
  });
});
