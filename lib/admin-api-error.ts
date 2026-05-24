export type AdminApiErrorBody = {
  error?: string;
};

export function adminApiErrorMessage(
  body: AdminApiErrorBody,
  t: (key: string) => string,
): string {
  switch (body.error) {
    case "forbidden":
      return t("errorForbidden");
    case "database_error":
    case "server_error":
      return t("serviceUnavailable");
    default:
      return t("serviceUnavailable");
  }
}
