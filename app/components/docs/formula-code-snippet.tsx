/** Lightweight formula/script syntax colors — no extra deps. */
export function FormulaCodeSnippet({ code }: { code: string }) {
  const tokens = tokenizeFormulaCode(code);

  return (
    <pre className="overflow-x-auto rounded-lg bg-muted/50 px-3 py-2 font-mono text-xs whitespace-pre-wrap">
      <code>
        {tokens.map((token, index) => (
          <span key={index} className={TOKEN_CLASS[token.kind]}>
            {token.text}
          </span>
        ))}
      </code>
    </pre>
  );
}

type TokenKind = "plain" | "keyword" | "number" | "ident" | "op";

const TOKEN_CLASS: Record<TokenKind, string> = {
  plain: "",
  keyword: "font-semibold text-violet-700 dark:text-violet-300",
  number: "text-amber-700 dark:text-amber-300",
  ident: "text-sky-800 dark:text-sky-300",
  op: "text-rose-700 dark:text-rose-300",
};

const KEYWORDS = new Set([
  "SUM",
  "COUNT",
  "AVG",
  "MIN",
  "MAX",
  "SUM_ROWS",
  "COUNT_ROWS",
  "AVG_ROWS",
  "MIN_ROWS",
  "MAX_ROWS",
  "return",
  "input",
  "output",
  "calc",
  "constant",
  "property",
  "formula",
  "mode",
  "label",
  "highlight",
  "section",
  "quantity",
  "auto_total",
]);

function tokenizeFormulaCode(source: string): Array<{ kind: TokenKind; text: string }> {
  const tokens: Array<{ kind: TokenKind; text: string }> = [];
  let i = 0;

  while (i < source.length) {
    const rest = source.slice(i);

    if (/^[+\-*/=(),.]/.test(rest)) {
      tokens.push({ kind: "op", text: rest[0]! });
      i += 1;
      continue;
    }

    if (/^\d+(\.\d+)?/.test(rest)) {
      const match = rest.match(/^\d+(\.\d+)?/)![0]!;
      tokens.push({ kind: "number", text: match });
      i += match.length;
      continue;
    }

    if (/^[a-zA-Z_][a-zA-Z0-9_]*/.test(rest)) {
      const match = rest.match(/^[a-zA-Z_][a-zA-Z0-9_]*/)![0]!;
      const upper = match.toUpperCase();
      if (KEYWORDS.has(upper) || KEYWORDS.has(match)) {
        tokens.push({ kind: "keyword", text: match });
      } else {
        tokens.push({ kind: "ident", text: match });
      }
      i += match.length;
      continue;
    }

    tokens.push({ kind: "plain", text: rest[0]! });
    i += 1;
  }

  return tokens;
}
