import type { UserAccessError } from "@/lib/access/user-limits";
import {
  apiErrorBody,
  type ApiErrorBody,
} from "@/lib/errors/api-error";
import type { ErrorCodeName } from "@/lib/errors/errors";

export function mapUserAccessError(error: UserAccessError): {
  body: ApiErrorBody;
  status: number;
} {
  const codeMap: Record<
    UserAccessError["code"],
    { codeName: ErrorCodeName<"ACCESS">; status: number }
  > = {
    banned: { codeName: "BANNED", status: 403 },
    access_expired: { codeName: "ACCESS_EXPIRED", status: 403 },
    calculator_limit: { codeName: "CALCULATOR_LIMIT", status: 403 },
    unauthorized: { codeName: "UNAUTHORIZED", status: 401 },
  };

  const mapped = codeMap[error.code];
  return {
    body: apiErrorBody("ACCESS", mapped.codeName, { message: error.message }),
    status: mapped.status,
  };
}
