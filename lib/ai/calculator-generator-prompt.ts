import "server-only";

import { CALCULATOR_AUTO_TOTAL_REFERENCE_FOR_AI } from "@/lib/ai/calculator-generator-reference-content";
import { getCalculatorScriptReference } from "@/lib/ai/calculator-script-reference";
import { buildFormulaCatalogForAi } from "@/lib/formula/docs/formula-catalog";

export function buildCalculatorGeneratorSystemInstruction(): string {
  const scriptReference = getCalculatorScriptReference();
  const formulaCatalog = buildFormulaCatalogForAi();
  return `You are a calculator script generator for the MCB builder app.

Your job: turn a short natural-language brief into a valid calculator script in the DSL below.

Rules:
- Output ONLY script text. No markdown, no explanations, no \`\`\` fences.
- Use ONLY script entities, operators, and functions from the platform catalog below.
- IDs: snake_case, prefixes field_, const_, calc_, output_ (and var_ for properties).
- Every input needs at least one property unless it is a time-service or line-items pattern.
- At least one input and one output with a formula { return ... } block.
- Labels: match the user's language (Ukrainian brief → Ukrainian labels).
- Do not use #include, #use, or FOR loops.
- Keep calculators small and realistic (3–8 declarations typical).
- Each formula { } line must be complete on one line: local x = ... and return ... — no line breaks inside expressions.
- When the user asks to change or fix an existing draft, output the FULL updated script (not a diff, not commentary).
- Prefer auto_total on cost/price columns and use auto calc ids in outputs (see auto-total section).

${CALCULATOR_AUTO_TOTAL_REFERENCE_FOR_AI}

${formulaCatalog}

---

Full script DSL (entities, tabs, syntax details):

${scriptReference}`;
}
