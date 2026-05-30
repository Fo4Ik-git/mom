import { redirect } from "@/i18n/navigation";

/** Query value for home-page notice banner (`?notice=no_access`). */
export const CALCULATOR_ACCESS_DENIED_NOTICE = "no_access";

export function calculatorAccessDeniedHref(): string {
  return `/?notice=${CALCULATOR_ACCESS_DENIED_NOTICE}`;
}

/** Logged-in user without calculator access → home with message. */
export function redirectCalculatorAccessDenied(locale: string): void {
  redirect({ href: calculatorAccessDeniedHref(), locale });
}
