import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { adminApiErrorMessage } from "@/lib/admin/admin-api-error";
import {
  handleAdminApiError,
  isPrismaClientError,
} from "@/lib/admin/admin-api-response";

describe("admin API helpers", () => {
  const t = (key: string) => key;

  it("adminApiErrorMessage maps known error codes", () => {
    expect(adminApiErrorMessage({ error: "forbidden" }, t)).toBe(
      "errorForbidden",
    );
    expect(adminApiErrorMessage({ error: "database_error" }, t)).toBe(
      "serviceUnavailable",
    );
    expect(adminApiErrorMessage({}, t)).toBe("serviceUnavailable");
  });

  it("isPrismaClientError detects Prisma errors", () => {
    expect(isPrismaClientError(new Error("nope"))).toBe(false);
    expect(
      isPrismaClientError(
        new Prisma.PrismaClientKnownRequestError("msg", {
          code: "P2002",
          clientVersion: "test",
        }),
      ),
    ).toBe(true);
  });

  it("handleAdminApiError returns correct status codes", async () => {
    const forbidden = handleAdminApiError(new Error("Forbidden"));
    expect(forbidden.status).toBe(403);
    expect(await forbidden.json()).toEqual({ error: "forbidden" });

    const db = handleAdminApiError(
      new Prisma.PrismaClientKnownRequestError("msg", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    expect(db.status).toBe(503);

    const server = handleAdminApiError(new Error("boom"));
    expect(server.status).toBe(500);
  });
});
