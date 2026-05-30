/**
 * Public error registry (see also `errors.ts`).
 * Import: `import { ERRORS, MODULE } from "@/lib/errors/Error"`
 */
export {
  ERRORS,
  MODULE,
  ERROR_MESSAGES,
  ERROR_MESSAGES_UK,
  getErrorMeta,
  findCodeNameByNumber,
  type ErrorModuleKey,
  type ErrorCodeName,
} from "@/lib/errors/errors";
export {
  API_STATUS_KEY,
  API_SUCCESS,
  apiJsonResponse,
  withApiStatus,
  getApiStatusBlock,
  formatApiStatusLine,
} from "@/lib/errors/api-status";
