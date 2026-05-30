import type { z } from "zod";
import type {
  BlockExpression,
  BlockOperand,
  CalculatorConfig,
} from "@/types/calculator";
import type { FormulaTarget } from "@/lib/formula/formula-target";
import type { EvalContext } from "@/lib/formula/block-evaluate";
import type { PaletteBlock } from "@/lib/formula/block-palette-types";
import type { FormulaCompletionItem } from "@/lib/formula/formula-code-completions";

export type ExpressionEvaluator = (
  expression: BlockExpression,
  context: EvalContext,
) => number;

export interface FormulaCodeFormatContext {
  target: FormulaTarget;
  rowFieldId?: string;
  formatChild: (
    expression: BlockExpression,
    options?: { rowFieldId?: string; parentPrec?: number; isRightOperand?: boolean },
  ) => string;
  formatOperand: (operand: BlockOperand, rowFieldId?: string) => string;
}

export interface FormulaDisplayContext {
  config: CalculatorConfig;
  target: FormulaTarget;
  quantityLabel: string;
  rowsLabel?: string;
  formatChild: (expression: BlockExpression) => string;
}

export interface FormulaPaletteContext {
  config: CalculatorConfig;
  target: FormulaTarget;
  quantityLabel: string;
  rowsLabel: string;
}

export interface FormulaCodeParseContext {
  target: FormulaTarget;
  rowFieldId?: string;
  identStart: number;
  identEnd: number;
  peekIsLParen: () => boolean;
  expectLParen: () => void;
  expectRParen: () => void;
  expectIdent: () => { value: string; start: number };
  expectComma: () => void;
  parseExpression: () => BlockExpression;
  parseExpressionWithRowField: (rowFieldId: string) => BlockExpression;
  parseArgumentList: () => BlockExpression[];
  fail: (message: string, offset: number) => never;
}

export interface FormulaNodeDefinition<
  TType extends BlockExpression["type"] = BlockExpression["type"],
> {
  /** Discriminator — matches `BlockExpression.type` */
  type: TType;
  /** Optional Zod schema for this node variant (future: build union from registry) */
  schema?: z.ZodType;
  evaluate: (
    node: Extract<BlockExpression, { type: TType }>,
    context: EvalContext,
    evaluateChild: ExpressionEvaluator,
  ) => number;
  formatCode?: (
    node: Extract<BlockExpression, { type: TType }>,
    ctx: FormulaCodeFormatContext,
  ) => string;
  /** Parse `KEYWORD(...)` call forms handled by this node; return null if keyword is unrelated. */
  parseCodeCall?: (
    keyword: string,
    ctx: FormulaCodeParseContext,
  ) => BlockExpression | null;
  formatLabel?: (
    node: Extract<BlockExpression, { type: TType }>,
    ctx: FormulaDisplayContext,
  ) => string;
  paletteItems?: (ctx: FormulaPaletteContext) => PaletteBlock[];
  completions?: (
    config: CalculatorConfig,
    target: FormulaTarget,
  ) => FormulaCompletionItem[];
  dependencies?: (
    node: Extract<BlockExpression, { type: TType }>,
    config: CalculatorConfig,
  ) => string[];
}
