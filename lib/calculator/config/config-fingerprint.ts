import { finalizeConfig } from "@/lib/calculator/config/sync";
import type { CalculatorConfig } from "@/types/calculator";

/** Stable fingerprint for comparing builder config vs code sheet base. */
export function calculatorConfigFingerprint(
  config: CalculatorConfig,
  autoTotalSuffix: string,
): string {
  return JSON.stringify(finalizeConfig(config, autoTotalSuffix));
}
