/** Fix common LLM mistakes before parsing calculator script. */

const FORMULA_BLOCK_RE = /formula\s*\{([\s\S]*?)\}/g;

function joinContinuedExpressionLines(body: string): string {
  const lines = body.split("\n");
  const out: string[] = [];
  let pending = "";

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      continue;
    }
    pending = pending ? `${pending} ${line}` : line;
    if (!/[+\-*/,(]$/.test(line)) {
      out.push(pending);
      pending = "";
    }
  }

  if (pending) {
    out.push(pending);
  }

  return out.join("\n");
}

function normalizeFormulaBody(body: string): string {
  let normalized = joinContinuedExpressionLines(body);
  normalized = normalized.replace(/\.quantity\b/g, ".qty");
  return normalized;
}

export function normalizeAiCalculatorScript(script: string): string {
  return script.replace(FORMULA_BLOCK_RE, (_match, body: string) => {
    return `formula {${normalizeFormulaBody(body)}}`;
  });
}
