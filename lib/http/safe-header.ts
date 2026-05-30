/** HTTP header values must be ByteString (Latin-1). Encode UTF-8 as base64url. */
const PREFIX = "b64:";

export function encodeHeaderUtf8(value: string): string {
  if (/^[\u0000-\u00ff]*$/.test(value)) {
    return value;
  }
  return `${PREFIX}${Buffer.from(value, "utf8").toString("base64url")}`;
}

export function decodeHeaderUtf8(value: string): string {
  if (value.startsWith(PREFIX)) {
    return Buffer.from(value.slice(PREFIX.length), "base64url").toString("utf8");
  }
  return value;
}
