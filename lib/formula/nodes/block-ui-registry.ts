import type { BlockExpression } from "@/types/calculator";

export type BlockSlotSpec = {
  key: string;
  label: string;
};

export type CompositeBlockUi = {
  type: Exclude<
    BlockExpression["type"],
    "empty" | "operand" | "operation" | "group"
  >;
  /** Label in block UI (IF, ROUND, SUM, …) */
  keyword: string;
  /** DnD droppable `data.target` */
  dropTarget: string;
  /** Workspace draggable `data.kind` */
  workspaceKind: string;
  borderClass: string;
  keywordTextClass: string;
  parenTextClass: string;
  dragHandleKey: string;
  removeKey: string;
  slots: BlockSlotSpec[];
  /** Slot order when unwrapping node on remove */
  unwrapSlotPriority: string[];
};

const COMPOSITE_UI: CompositeBlockUi[] = [
  {
    type: "conditional",
    keyword: "IF",
    dropTarget: "conditional",
    workspaceKind: "conditional",
    borderClass: "border-rose-400/50 bg-rose-500/10",
    keywordTextClass: "text-rose-800 dark:text-rose-200",
    parenTextClass: "text-rose-700 dark:text-rose-300",
    dragHandleKey: "dragHandleConditional",
    removeKey: "removeConditional",
    slots: [
      { key: "condition", label: "?" },
      { key: "whenTrue", label: "✓" },
      { key: "whenFalse", label: "✗" },
    ],
    unwrapSlotPriority: ["whenTrue", "whenFalse", "condition"],
  },
  {
    type: "round",
    keyword: "ROUND",
    dropTarget: "round",
    workspaceKind: "round",
    borderClass: "border-lime-400/50 bg-lime-500/10",
    keywordTextClass: "text-lime-800 dark:text-lime-200",
    parenTextClass: "text-lime-700 dark:text-lime-300",
    dragHandleKey: "dragHandleRound",
    removeKey: "removeRound",
    slots: [
      { key: "value", label: "v" },
      { key: "decimals", label: "d" },
    ],
    unwrapSlotPriority: ["value"],
  },
];

const uiByType = new Map(COMPOSITE_UI.map((ui) => [ui.type, ui]));

export function getCompositeBlockUi(
  type: BlockExpression["type"],
): CompositeBlockUi | undefined {
  if (
    type === "empty" ||
    type === "operand" ||
    type === "operation" ||
    type === "group"
  ) {
    return undefined;
  }
  return uiByType.get(type);
}

export function isCompositeExpressionType(
  type: BlockExpression["type"],
): type is CompositeBlockUi["type"] {
  return uiByType.has(type as CompositeBlockUi["type"]);
}

export function getCompositeBlockSlots(
  type: BlockExpression["type"],
): BlockSlotSpec[] | null {
  const ui = getCompositeBlockUi(type);
  return ui?.slots ?? null;
}

export function isCompositeBlockType(type: BlockExpression["type"]): boolean {
  return getCompositeBlockUi(type) != null;
}

export function listCompositeBlockUi(): CompositeBlockUi[] {
  return COMPOSITE_UI;
}
