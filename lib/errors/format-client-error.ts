import {
  formatApiStatusLine,
  getApiStatusBlock,
  isApiStatusBlock,
} from "@/lib/errors/api-status";

export type ApiErrorPayload = {
  error?: string;
  status?: {
    module?: string;
    code?: number;
  };
  issues?: string[];
};

export function isApiErrorPayload(data: unknown): data is ApiErrorPayload {
  if (!data || typeof data !== "object") {
    return false;
  }
  const block = getApiStatusBlock(data);
  return block !== null;
}

/** Text block for toast description: message + module/code line. */
export function formatApiErrorForToast(
  data: unknown,
  fallbackMessage: string,
): { title: string; description: string } {
  const status = getApiStatusBlock(data);
  if (!status) {
    return { title: fallbackMessage, description: fallbackMessage };
  }

  const row = data as ApiErrorPayload;
  const message =
    typeof row.error === "string" && row.error.trim() ?
      row.error
    : fallbackMessage;

  const issues =
    Array.isArray(row.issues) && row.issues.length > 0 ?
      row.issues.slice(0, 3).join(" · ")
    : "";

  const description = [issues || message, formatApiStatusLine(status)]
    .filter(Boolean)
    .join("\n");

  return {
    title: fallbackMessage,
    description,
  };
}

export { isApiStatusBlock, getApiStatusBlock, formatApiStatusLine };
