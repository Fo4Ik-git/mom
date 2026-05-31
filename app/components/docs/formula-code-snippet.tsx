/** Lightweight formula/script syntax colors — no extra deps. */
export function FormulaCodeSnippet({
  code,
  label,
}: {
  code: string;
  label?: string;
}) {
  const tokens = tokenizeFormulaCode(code);

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-[#0f1419] shadow-inner dark:border-border/50">
      {label && (
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-1.5">
          <span className="size-2 rounded-full bg-rose-400/90" aria-hidden />
          <span className="size-2 rounded-full bg-amber-400/90" aria-hidden />
          <span className="size-2 rounded-full bg-emerald-400/90" aria-hidden />
          <span className="ml-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">
            {label}
          </span>
        </div>
      )}
      <pre className="overflow-x-auto px-3 py-2.5 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-slate-300">
        <code>
          {tokens.map((token, index) => (
            <span key={index} className={TOKEN_CLASS[token.kind]}>
              {token.text}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

type TokenKind = "plain" | "keyword" | "number" | "ident" | "op";

const TOKEN_CLASS: Record<TokenKind, string> = {
  plain: "text-slate-300",
  keyword: "font-semibold text-violet-300",
  number: "text-amber-300",
  ident: "text-sky-300",
  op: "text-rose-300",
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
  "IF",
  "ROUND",
  "return",
  "local",
  "input",
  "output",
  "calc",
  "constant",
  "macro",
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
