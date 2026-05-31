export type AdminApiErrorBody = {
  error?: string;
};

export function adminApiErrorMessage(
  body: AdminApiErrorBody,
  t: (key: string) => string,
): string {
  switch (body.error) {
    case "forbidden":
    case "forbidden_role_change":
    case "forbidden_ai_access":
      return t("errorForbidden");
    case "cannot_modify_elevated_user":
    case "cannot_modify_superadmin":
      return t("errorCannotModifyElevatedUser");
    case "cannot_demote_self":
      return t("errorCannotDemoteSelf");
    case "cannot_ban_superadmin":
      return t("errorCannotBanSuperadmin");
    case "database_error":
    case "server_error":
      return t("serviceUnavailable");
    default:
      return t("serviceUnavailable");
  }
}
