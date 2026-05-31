import type { FormulaCompletionItem } from "@/lib/formula/code/formula-code-completions";
import type { ScriptFieldCompletion } from "@/lib/calculator/schema/_definition";
import { INPUT_SECTION_IDS } from "@/lib/calculator/config/input-sections";
import { getAllConfigEntities } from "@/lib/calculator/schema/registry";
import {
  FILE_ALLOWED_KINDS,
  type ScriptProjectFileId,
} from "@/lib/calculator/script/project-types";

export type ScriptCompletionContextKind =
  | "file-root"
  | "input-body"
  | "output-body"
  | "calculation-body"
  | "constant-body"
  | "macro-body"
  | "property-body"
  | "formula-body"
  | "formula-expr";

export interface DetectedScriptContext {
  kind: ScriptCompletionContextKind;
  /** calc/output id when inside formula block */
  entityId?: string;
}

type StackFrame =
  | { type: "root" }
  | { type: "input" }
  | { type: "output"; id: string }
  | { type: "calculation"; id: string }
  | { type: "constant" }
  | { type: "macro"; id: string }
  | { type: "property" }
  | { type: "formula"; entityId: string };

const ENTITY_KIND_MAP: Record<
  StackFrame["type"],
  ScriptCompletionContextKind | null
> = {
  root: "file-root",
  input: "input-body",
  output: "output-body",
  calculation: "calculation-body",
  constant: "constant-body",
  macro: "macro-body",
  property: "property-body",
  formula: "formula-body",
};

function skipWhitespaceAndComments(source: string, pos: number): number {
  let i = pos;
  while (i < source.length) {
    const char = source[i];
    if (char === " " || char === "\t" || char === "\r" || char === "\n") {
      i += 1;
      continue;
    }
    if (char === "/" && source[i + 1] === "/") {
      i += 2;
      while (i < source.length && source[i] !== "\n") {
        i += 1;
      }
      continue;
    }
    break;
  }
  return i;
}

function skipQuotedString(source: string, pos: number): number {
  if (source[pos] !== '"') {
    return pos;
  }
  let i = pos + 1;
  while (i < source.length) {
    if (source[i] === "\\") {
      i += 2;
      continue;
    }
    if (source[i] === '"') {
      return i + 1;
    }
    i += 1;
  }
  return i;
}

function readIdentifier(source: string, pos: number): { value: string; end: number } | null {
  let i = skipWhitespaceAndComments(source, pos);
  const start = i;
  if (!/[a-zA-Z_]/.test(source[i] ?? "")) {
    return null;
  }
  i += 1;
  while (i < source.length && /[a-zA-Z0-9_]/.test(source[i] ?? "")) {
    i += 1;
  }
  return { value: source.slice(start, i), end: i };
}

function skipUntilBlockOpen(source: string, pos: number, limit: number): number {
  let i = pos;
  while (i < limit) {
    i = skipWhitespaceAndComments(source, i);
    if (i >= limit) {
      break;
    }
    if (source[i] === "{") {
      return i;
    }
    if (source[i] === '"') {
      i = skipQuotedString(source, i);
      continue;
    }
    i += 1;
  }
  return -1;
}

function isInsideFormulaStatementExpression(source: string, pos: number): boolean {
  const before = source.slice(0, pos);
  const lineStart = before.lastIndexOf("\n") + 1;
  const currentLine = before.slice(lineStart);

  if (/^\s*local\s+[a-zA-Z_][a-zA-Z0-9_]*\s*=\s*/i.test(currentLine)) {
    return true;
  }

  if (/^\s*return\b/i.test(currentLine)) {
    return true;
  }

  const returnIndex = before.lastIndexOf("return");
  if (returnIndex < 0) {
    return false;
  }

  const returnLineStart = before.lastIndexOf("\n", returnIndex - 1) + 1;
  const beforeReturnOnLine = before.slice(returnLineStart, returnIndex);
  if (!/^\s*$/.test(beforeReturnOnLine)) {
    return false;
  }

  const afterReturn = before.slice(returnIndex + "return".length);
  return /[\w."(]/.test(afterReturn.trimStart()[0] ?? "");
}

/** Detect script DSL context at cursor for context-aware autocomplete. */
export function detectScriptCompletionContext(
  source: string,
  pos: number,
): DetectedScriptContext {
  const stack: StackFrame[] = [{ type: "root" }];
  let i = 0;
  const limit = Math.min(pos, source.length);

  while (i < limit) {
    i = skipWhitespaceAndComments(source, i);
    if (i >= limit) {
      break;
    }

    const char = source[i];
    if (char === "{") {
      i += 1;
      continue;
    }
    if (char === "}") {
      if (stack.length > 1) {
        stack.pop();
      }
      i += 1;
      continue;
    }
    if (char === '"') {
      i = skipQuotedString(source, i);
      continue;
    }

    const ident = readIdentifier(source, i);
    if (!ident) {
      i += 1;
      continue;
    }

    const keyword = ident.value.toLowerCase();
    i = ident.end;

    if (keyword === "input") {
      const id = readIdentifier(source, i);
      if (!id) {
        continue;
      }
      i = id.end;
      const open = skipUntilBlockOpen(source, i, limit);
      if (open >= 0 && open < limit) {
        stack.push({ type: "input" });
        i = open + 1;
      }
      continue;
    }

    if (keyword === "output") {
      const id = readIdentifier(source, i);
      if (!id) {
        continue;
      }
      i = id.end;
      const open = skipUntilBlockOpen(source, i, limit);
      if (open >= 0 && open < limit) {
        stack.push({ type: "output", id: id.value });
        i = open + 1;
      }
      continue;
    }

    if (keyword === "calc" || keyword === "calculation") {
      const id = readIdentifier(source, i);
      if (!id) {
        continue;
      }
      i = id.end;
      const open = skipUntilBlockOpen(source, i, limit);
      if (open >= 0 && open < limit) {
        stack.push({ type: "calculation", id: id.value });
        i = open + 1;
      }
      continue;
    }

    if (keyword === "constant") {
      const id = readIdentifier(source, i);
      if (!id) {
        continue;
      }
      i = id.end;
      const open = skipUntilBlockOpen(source, i, limit);
      if (open >= 0 && open < limit) {
        stack.push({ type: "constant" });
        i = open + 1;
      }
      continue;
    }

    if (keyword === "macro") {
      const id = readIdentifier(source, i);
      if (!id) {
        continue;
      }
      i = id.end;
      const open = skipUntilBlockOpen(source, i, limit);
      if (open >= 0 && open < limit) {
        stack.push({ type: "macro", id: id.value });
        i = open + 1;
      }
      continue;
    }

    if (keyword === "property") {
      const id = readIdentifier(source, i);
      if (!id) {
        continue;
      }
      i = id.end;
      const open = skipUntilBlockOpen(source, i, limit);
      if (open >= 0 && open < limit) {
        stack.push({ type: "property" });
        i = open + 1;
      }
      continue;
    }

    if (keyword === "formula") {
      i = skipWhitespaceAndComments(source, i);
      if (source[i] === "{") {
        const parent = stack[stack.length - 1];
        const entityId =
          parent?.type === "output"
            ? parent.id
            : parent?.type === "calculation"
              ? parent.id
              : parent?.type === "macro"
                ? parent.id
                : undefined;
        if (entityId) {
          stack.push({ type: "formula", entityId });
        }
        i += 1;
      }
      continue;
    }
  }

  const top = stack[stack.length - 1] ?? { type: "root" as const };

  if (top.type === "formula") {
    if (isInsideFormulaStatementExpression(source, pos)) {
      return { kind: "formula-expr", entityId: top.entityId };
    }
    return { kind: "formula-body", entityId: top.entityId };
  }

  const kind = ENTITY_KIND_MAP[top.type] ?? "file-root";
  const entityId =
    top.type === "output" ||
    top.type === "calculation" ||
    top.type === "macro"
      ? top.id
      : undefined;
  return { kind, entityId };
}

function toCompletionItem(field: ScriptFieldCompletion): FormulaCompletionItem {
  return {
    label: field.key,
    type: "keyword",
    detail: field.detail,
    insertText: field.insertText,
  };
}

const FORMULA_BLOCK_FIELDS: ScriptFieldCompletion[] = [
  {
    key: "formula",
    detail: "Formula block",
    insertText: "formula {\n  return \n}",
  },
  {
    key: "local",
    detail: "Local variable in formula block",
    insertText: "local name = ",
  },
  {
    key: "return",
    detail: "Formula expression",
    insertText: "return ",
  },
];

const PROPERTY_BLOCK_SNIPPET: ScriptFieldCompletion = {
  key: "property",
  detail: "Nested property on input",
  insertText: 'property var_cost {\n  label = "Cost"\n  value = 0\n}',
};

const INCLUDE_COMPLETION: ScriptFieldCompletion = {
  key: "#include",
  detail: "Merge another project tab",
  insertText: '#include "inputs.calc"',
};

function entityForKind(
  kind: ScriptCompletionContextKind,
): ReturnType<typeof getAllConfigEntities>[number] | undefined {
  switch (kind) {
    case "input-body":
      return getAllConfigEntities().find((entity) => entity.keyword === "input");
    case "output-body":
      return getAllConfigEntities().find((entity) => entity.keyword === "output");
    case "calculation-body":
      return getAllConfigEntities().find((entity) => entity.keyword === "calc");
    case "constant-body":
      return getAllConfigEntities().find((entity) => entity.keyword === "constant");
    case "macro-body":
      return getAllConfigEntities().find((entity) => entity.keyword === "macro");
    default:
      return undefined;
  }
}

function declarationsForFile(fileId?: ScriptProjectFileId): FormulaCompletionItem[] {
  const allowedKinds = fileId ? FILE_ALLOWED_KINDS[fileId] : null;
  return getAllConfigEntities()
    .filter((entity) => {
      if (!allowedKinds) {
        return true;
      }
      const kind =
        entity.keyword === "calc"
          ? "calculation"
          : (entity.keyword as ScriptDeclarationKind);
      return allowedKinds.includes(kind);
    })
    .map((entity) => ({
      label: entity.keyword,
      type: "keyword" as const,
      detail: entity.label,
      insertText: entity.scriptCompletions.declarationSnippet,
    }));
}

type ScriptDeclarationKind = "input" | "constant" | "macro" | "calculation" | "output";

/** Script DSL completions for the current cursor context. */
export function collectScriptCompletions(
  context: DetectedScriptContext,
  fileId?: ScriptProjectFileId,
): FormulaCompletionItem[] {
  switch (context.kind) {
    case "file-root":
      return [
        toCompletionItem(INCLUDE_COMPLETION),
        ...declarationsForFile(fileId),
      ];

    case "input-body": {
      const entity = entityForKind(context.kind)!;
      const nested = entity.scriptCompletions.nestedBlocks?.property ?? [];
      return [
        ...entity.scriptCompletions.bodyFields.map(toCompletionItem),
        toCompletionItem(PROPERTY_BLOCK_SNIPPET),
        ...nested.map(toCompletionItem),
      ];
    }

    case "property-body": {
      const entity = entityForKind("input-body")!;
      const nested = entity.scriptCompletions.nestedBlocks?.property ?? [];
      return nested.map(toCompletionItem);
    }

    case "output-body": {
      const entity = entityForKind(context.kind)!;
      return [
        ...entity.scriptCompletions.bodyFields.map(toCompletionItem),
        ...FORMULA_BLOCK_FIELDS.map(toCompletionItem),
      ];
    }

    case "calculation-body": {
      const entity = entityForKind(context.kind)!;
      return [
        ...entity.scriptCompletions.bodyFields.map(toCompletionItem),
        ...FORMULA_BLOCK_FIELDS.map(toCompletionItem),
      ];
    }

    case "constant-body": {
      const entity = entityForKind(context.kind)!;
      return entity.scriptCompletions.bodyFields.map(toCompletionItem);
    }

    case "macro-body": {
      const entity = entityForKind(context.kind)!;
      return [
        ...entity.scriptCompletions.bodyFields.map(toCompletionItem),
        ...FORMULA_BLOCK_FIELDS.map(toCompletionItem),
      ];
    }

    case "formula-body":
      return FORMULA_BLOCK_FIELDS.map(toCompletionItem);

    case "formula-expr":
      return [];

    default:
      return [];
  }
}

/** All script body field keys registered on entities — for tests / docs. */
export function getAllScriptBodyFieldKeys(): string[] {
  const keys = new Set<string>();
  for (const entity of getAllConfigEntities()) {
    for (const field of entity.scriptCompletions.bodyFields) {
      keys.add(field.key);
    }
    for (const block of Object.values(entity.scriptCompletions.nestedBlocks ?? {})) {
      for (const field of block) {
        keys.add(field.key);
      }
    }
  }
  return [...keys].sort();
}

export { INPUT_SECTION_IDS };
