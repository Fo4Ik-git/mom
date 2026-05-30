import type {
  BlockExpression,
  BlockOperand,
} from "@/types/calculator";
import { emptyBlockExpression, isFormulaOperator } from "@/types/calculator";
import { filledAggregateArgs } from "@/lib/formula/core/aggregate-helpers";
import { parseCodeReference } from "@/lib/formula/nodes/reference-code";
import {
  getInfixPrecedence,
  parseCodeCallViaRegistry,
} from "@/lib/formula/nodes/registry";
import type { FormulaCodeParseContext } from "@/lib/formula/nodes/_definition";
import type { FormulaTarget } from "@/lib/formula/core/formula-target";

import { FormulaParseError } from "@/lib/formula/code/formula-parse-error";

export { FormulaParseError };
type Token =
  | { type: "number"; value: number; start: number; end: number }
  | { type: "ident"; value: string; start: number; end: number }
  | { type: "op"; value: string; start: number; end: number }
  | { type: "lparen"; start: number; end: number }
  | { type: "rparen"; start: number; end: number }
  | { type: "comma"; start: number; end: number }
  | { type: "eof"; start: number; end: number };

interface ParseOptions {
  target: FormulaTarget;
  rowFieldId?: string;
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < source.length) {
    const start = i;
    const char = source[i];

    if (char === " " || char === "\t" || char === "\n" || char === "\r") {
      i += 1;
      continue;
    }

    if (char === "(") {
      tokens.push({ type: "lparen", start, end: i + 1 });
      i += 1;
      continue;
    }
    if (char === ")") {
      tokens.push({ type: "rparen", start, end: i + 1 });
      i += 1;
      continue;
    }
    if (char === ",") {
      tokens.push({ type: "comma", start, end: i + 1 });
      i += 1;
      continue;
    }
    if ("+-*/".includes(char)) {
      tokens.push({ type: "op", value: char, start, end: i + 1 });
      i += 1;
      continue;
    }

    if (char === ">" || char === "<" || char === "!" || char === "=") {
      const pair = source.slice(i, i + 2);
      if (pair === ">=" || pair === "<=" || pair === "!=" || pair === "==") {
        tokens.push({ type: "op", value: pair, start, end: i + 2 });
        i += 2;
        continue;
      }
      if (char === ">" || char === "<") {
        tokens.push({ type: "op", value: char, start, end: i + 1 });
        i += 1;
        continue;
      }
      throw new FormulaParseError(`Unexpected character "${char}"`, start);
    }

    if (char >= "0" && char <= "9") {
      let end = i + 1;
      while (end < source.length && /[\d.]/.test(source[end] ?? "")) {
        end += 1;
      }
      const value = Number(source.slice(i, end));
      if (Number.isNaN(value)) {
        throw new FormulaParseError(`Invalid number at ${start}`, start);
      }
      tokens.push({ type: "number", value, start, end });
      i = end;
      continue;
    }

    if (/[a-zA-Z]/.test(char)) {
      let end = i + 1;
      while (end < source.length && /[a-zA-Z0-9_]/.test(source[end] ?? "")) {
        end += 1;
      }
      while (source[end] === ".") {
        const segmentStart = end + 1;
        const segmentChar = source[segmentStart];
        if (!segmentChar || !/[a-zA-Z]/.test(segmentChar)) {
          break;
        }
        end = segmentStart + 1;
        while (end < source.length && /[a-zA-Z0-9_]/.test(source[end] ?? "")) {
          end += 1;
        }
      }
      tokens.push({
        type: "ident",
        value: source.slice(i, end),
        start,
        end,
      });
      i = end;
      continue;
    }

    throw new FormulaParseError(`Unexpected character "${char}"`, start);
  }

  tokens.push({ type: "eof", start: i, end: i });
  return tokens;
}

class Parser {
  private index = 0;

  constructor(
    private readonly tokens: Token[],
    private options: ParseOptions,
  ) {}

  parse(): BlockExpression {
    const expr = this.parseExpression(0);
    if (this.current().type !== "eof") {
      const token = this.current();
      throw new FormulaParseError(
        `Unexpected token "${tokenLabel(token)}"`,
        token.start,
      );
    }
    return expr;
  }

  private current(): Token {
    return this.tokens[this.index] ?? { type: "eof", start: 0, end: 0 };
  }

  private advance(): Token {
    const token = this.current();
    this.index += 1;
    return token;
  }

  private parseExpression(minPrec: number): BlockExpression {
    let left = this.parseUnary();

    while (this.current().type === "op") {
      const opToken = this.current();
      if (opToken.type !== "op") {
        break;
      }
      const prec = opPrec(opToken.value);
      if (prec < minPrec) {
        break;
      }
      if (!isFormulaOperator(opToken.value)) {
        throw new FormulaParseError(
          `Unknown operator "${opToken.value}"`,
          opToken.start,
        );
      }
      this.advance();
      const right = this.parseExpression(prec + 1);
      left = {
        type: "operation",
        operator: opToken.value,
        left,
        right,
      };
    }

    return left;
  }

  private parseUnary(): BlockExpression {
    const current = this.current();
    if (current.type === "op" && current.value === "-") {
      this.advance();
      const inner = this.parseUnary();
      return {
        type: "operation",
        operator: "*",
        left: { type: "operand", operand: { kind: "number", value: -1 } },
        right: inner,
      };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): BlockExpression {
    const token = this.current();

    if (token.type === "number") {
      this.advance();
      return {
        type: "operand",
        operand: { kind: "number", value: token.value },
      };
    }

    if (token.type === "ident") {
      return this.parseIdentOrCall();
    }

    if (token.type === "lparen") {
      this.advance();
      const inner = this.parseExpression(0);
      this.expect("rparen");
      return { type: "group", inner };
    }

    throw new FormulaParseError("Expected expression", token.start);
  }

  private parseIdentOrCall(): BlockExpression {
    const identToken = this.advance();
    if (identToken.type !== "ident") {
      throw new FormulaParseError("Expected identifier", identToken.start);
    }

    const parseCtx: FormulaCodeParseContext = {
      target: this.options.target,
      rowFieldId: this.options.rowFieldId,
      identStart: identToken.start,
      identEnd: identToken.end,
      peekIsLParen: () => this.current().type === "lparen",
      expectLParen: () => {
        if (this.current().type !== "lparen") {
          throw new FormulaParseError('Expected "("', identToken.end);
        }
        this.advance();
      },
      expectRParen: () => {
        this.expect("rparen");
      },
      expectIdent: () => {
        const token = this.expect("ident");
        return { value: token.value, start: token.start };
      },
      expectComma: () => {
        if (this.current().type !== "comma") {
          const token = this.current();
          throw new FormulaParseError(
            `Expected ",", got ${tokenLabel(token)}`,
            token.start,
          );
        }
        this.advance();
      },
      parseExpression: () => this.parseExpression(0),
      parseExpressionWithRowField: (rowFieldId) =>
        this.parseExpressionWithRowField(rowFieldId),
      parseArgumentList: () => this.parseArgumentList(),
      fail: (message, offset) => {
        throw new FormulaParseError(message, offset);
      },
    };

    const fromRegistry =
      parseCodeCallViaRegistry(
        this.current().type === "lparen"
          ? identToken.value.toUpperCase()
          : identToken.value,
        parseCtx,
      ) ?? parseCodeCallViaRegistry(identToken.value, parseCtx);
    if (fromRegistry) {
      return fromRegistry;
    }

    if (this.current().type === "lparen") {
      throw new FormulaParseError(
        `Unknown function "${identToken.value}"`,
        identToken.start,
      );
    }

    return {
      type: "operand",
      operand: this.resolveReference(identToken.value, identToken.start),
    };
  }

  private parseExpressionWithRowField(rowFieldId: string): BlockExpression {
    const previous = this.options.rowFieldId;
    this.options = { ...this.options, rowFieldId };
    const expr = this.parseExpression(0);
    this.options = { ...this.options, rowFieldId: previous };
    return expr;
  }

  private parseArgumentList(): BlockExpression[] {
    const args: BlockExpression[] = [];
    if (this.current().type === "rparen") {
      return args;
    }

    while (true) {
      args.push(this.parseExpression(0));
      if (this.current().type !== "comma") {
        break;
      }
      this.advance();
    }
    return args;
  }

  private resolveReference(raw: string, offset: number): BlockOperand {
    return parseCodeReference(raw, this.options.target, this.options.rowFieldId, offset);
  }

  private expect(type: "ident"): Extract<Token, { type: "ident" }>;
  private expect(type: Token["type"]): Token;
  private expect(type: Token["type"]): Token {
    const token = this.current();
    if (token.type !== type) {
      throw new FormulaParseError(
        `Expected ${type}, got ${tokenLabel(token)}`,
        token.start,
      );
    }
    return this.advance();
  }
}

function opPrec(op: string): number {
  return getInfixPrecedence(op) ?? 0;
}

function tokenLabel(token: Token): string {
  if (token.type === "ident") {
    return token.value;
  }
  if (token.type === "number") {
    return String(token.value);
  }
  if (token.type === "op") {
    return token.value;
  }
  return token.type;
}

function stripComments(source: string): string {
  return source
    .split("\n")
    .map((line) => {
      const idx = line.indexOf("//");
      return idx >= 0 ? line.slice(0, idx) : line;
    })
    .join("\n")
    .trim();
}

export function parseFormulaCode(
  source: string,
  options: ParseOptions,
): BlockExpression {
  const cleaned = stripComments(source);
  if (!cleaned) {
    return emptyBlockExpression();
  }
  const tokens = tokenize(cleaned);
  return new Parser(tokens, options).parse();
}

export type ParseFormulaResult =
  | { ok: true; expression: BlockExpression }
  | { ok: false; error: string; offset: number };

export function tryParseFormulaCode(
  source: string,
  options: ParseOptions,
): ParseFormulaResult {
  try {
    return { ok: true, expression: parseFormulaCode(source, options) };
  } catch (error) {
    if (error instanceof FormulaParseError) {
      return { ok: false, error: error.message, offset: error.offset };
    }
    return { ok: false, error: "Invalid formula", offset: 0 };
  }
}

/** Normalize for stable round-trip comparisons. */
export function normalizeParsedExpression(
  expression: BlockExpression,
): BlockExpression {
  if (expression.type === "empty") {
    return expression;
  }
  if (expression.type === "operand") {
    return expression;
  }
  if (expression.type === "group") {
    return {
      type: "group",
      inner: normalizeParsedExpression(expression.inner),
    };
  }
  if (expression.type === "operation") {
    return {
      type: "operation",
      operator: expression.operator,
      left: normalizeParsedExpression(expression.left),
      right: normalizeParsedExpression(expression.right),
    };
  }
  if (expression.type === "aggregate") {
    const args = filledAggregateArgs(expression.args).map(normalizeParsedExpression);
    return { ...expression, args };
  }
  if (expression.type === "rowAggregate") {
    return {
      ...expression,
      inner: normalizeParsedExpression(expression.inner),
    };
  }
  if (expression.type === "conditional") {
    return {
      type: "conditional",
      condition: normalizeParsedExpression(expression.condition),
      whenTrue: normalizeParsedExpression(expression.whenTrue),
      whenFalse: normalizeParsedExpression(expression.whenFalse),
    };
  }
  return expression;
}
