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
  apiErrorBody,
  apiErrorResponse,
  enrichLegacyError,
  type ApiErrorBody,
} from "@/lib/errors/api-error";
export {
  API_STATUS_KEY,
  API_SUCCESS,
  apiJsonResponse,
  withApiStatus,
  hasApiStatusEnvelope,
  hasApiErrorShape,
  getApiStatusBlock,
  isApiStatusBlock,
  formatApiStatusLine,
  type ApiStatusBlock,
} from "@/lib/errors/api-status";
export { mapUserAccessError } from "@/lib/errors/map-user-access";
export {
  formatApiErrorForToast,
  type ApiErrorPayload,
} from "@/lib/errors/format-client-error";
