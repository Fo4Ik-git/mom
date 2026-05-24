export function signupPathWithKey(code: string): string {
  return `/auth/signup?key=${encodeURIComponent(code)}`;
}

export function signupAbsoluteUrl(code: string, origin: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${signupPathWithKey(code)}`;
}
