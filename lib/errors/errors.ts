/**
 * Central registry of API / app error codes by module.
 * `code` is numeric per module; `codeName` is the stable string key for logs and UI.
 */

export const MODULE = {
  GENERAL: "GENERAL",
  AUTH: "AUTH",
  CALCULATOR: "CALCULATOR",
  CALCULATOR_BUILDER: "CALCULATOR_BUILDER",
  SHARE: "SHARE",
  ADMIN: "ADMIN",
  PLATFORM: "PLATFORM",
  ACCESS: "ACCESS",
} as const;

export type ErrorModuleKey = keyof typeof MODULE;

export const ERRORS = {
  GENERAL: {
    OK: 0,
  },
  AUTH: {
    UNAUTHORIZED: 1,
    EXPIRED_SESSION: 2,
    FORBIDDEN: 3,
  },
  CALCULATOR: {
    INVALID_VALUE: 1,
    VALIDATION_FAILED: 2,
    NOT_FOUND: 3,
    FORBIDDEN: 4,
    CREATE_FAILED: 5,
    UPDATE_FAILED: 6,
    DELETE_FAILED: 7,
  },
  CALCULATOR_BUILDER: {
    SAVE_FAILED: 1,
    VALIDATION_FAILED: 2,
    READ_ONLY: 3,
  },
  SHARE: {
    USER_NOT_FOUND: 1,
    CANNOT_SHARE_WITH_OWNER: 2,
    NOT_FOUND: 3,
    FORBIDDEN: 4,
  },
  ADMIN: {
    FORBIDDEN: 1,
    NOT_FOUND: 2,
    INVALID_DATA: 3,
    DATABASE_ERROR: 4,
    SERVER_ERROR: 5,
  },
  PLATFORM: {
    INVALID_DATA: 1,
    SERVER_ERROR: 2,
    VALIDATION_FAILED: 3,
  },
  ACCESS: {
    BANNED: 1,
    ACCESS_EXPIRED: 2,
    CALCULATOR_LIMIT: 3,
    UNAUTHORIZED: 4,
  },
} as const;

export type ErrorCodeName<M extends ErrorModuleKey> = keyof (typeof ERRORS)[M];

/** Default user-facing API error messages (English). */
export const ERROR_MESSAGES: {
  [M in ErrorModuleKey]: Record<ErrorCodeName<M>, string>;
} = {
  GENERAL: {
    OK: "OK",
  },
  AUTH: {
    UNAUTHORIZED: "Sign in required",
    EXPIRED_SESSION: "Session expired — sign in again",
    FORBIDDEN: "Access denied",
  },
  CALCULATOR: {
    INVALID_VALUE: "Invalid value in calculator",
    VALIDATION_FAILED: "Calculator configuration has errors",
    NOT_FOUND: "Calculator not found",
    FORBIDDEN: "No permission for this calculator",
    CREATE_FAILED: "Could not create calculator",
    UPDATE_FAILED: "Could not update calculator",
    DELETE_FAILED: "Could not delete calculator",
  },
  CALCULATOR_BUILDER: {
    SAVE_FAILED: "Could not save in builder",
    VALIDATION_FAILED: "Fix validation errors before saving",
    READ_ONLY: "Calculator is read-only",
  },
  SHARE: {
    USER_NOT_FOUND: "No user with this email",
    CANNOT_SHARE_WITH_OWNER: "Cannot share with the owner",
    NOT_FOUND: "Share not found",
    FORBIDDEN: "No permission to manage sharing",
  },
  ADMIN: {
    FORBIDDEN: "Admin access required",
    NOT_FOUND: "Record not found",
    INVALID_DATA: "Invalid data",
    DATABASE_ERROR: "Database error",
    SERVER_ERROR: "Server error",
  },
  PLATFORM: {
    INVALID_DATA: "Invalid data",
    SERVER_ERROR: "Internal error",
    VALIDATION_FAILED: "Validation failed",
  },
  ACCESS: {
    BANNED: "Account is banned",
    ACCESS_EXPIRED: "Access has expired",
    CALCULATOR_LIMIT: "Calculator limit reached",
    UNAUTHORIZED: "Access denied",
  },
};

/** @deprecated Use ERROR_MESSAGES */
export const ERROR_MESSAGES_UK = ERROR_MESSAGES;

export function getErrorMeta<M extends ErrorModuleKey>(
  moduleKey: M,
  codeName: ErrorCodeName<M>,
): {
  module: (typeof MODULE)[M];
  code: number;
  codeName: string;
} {
  const code = ERRORS[moduleKey][codeName] as number;
  return {
    module: MODULE[moduleKey],
    code,
    codeName: String(codeName),
  };
}

export function findCodeNameByNumber(
  moduleKey: ErrorModuleKey,
  code: number,
): string | undefined {
  const table = ERRORS[moduleKey];
  for (const [name, value] of Object.entries(table)) {
    if (value === code) {
      return name;
    }
  }
  return undefined;
}
