"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useTranslations } from "next-intl";
import type { BlockExpression, CalculatorConfig } from "@/types/calculator";
import { formatBlockOperand } from "@/lib/formula/block-format";
import type { FormulaTarget } from "@/lib/formula/formula-target";
import {
  flattenExpression,
  isReorderableChain,
  type FlatToken,
} from "@/lib/formula/block-tokens";
import type { SlotPath } from "@/lib/formula/block-tree";
import { slotPathsEqual } from "@/lib/formula/slot-path";
import {
  CONTINUE_PATH,
  showContinuationAfter,
  showContinuationAfterLeft,
  showContinuationInsideGroup,
} from "@/lib/formula/block-tree";
import { DragHandle } from "@/app/components/builder/scratch/drag-handle";
import { BlockSlot } from "@/app/components/builder/scratch/block-slot";
import { GroupBracket } from "@/app/components/builder/scratch/group-bracket";
import { OperatorChip } from "@/app/components/builder/scratch/operator-chip";

interface FormulaLinearWorkspaceProps {
  outputKey: string;
  expression: BlockExpression;
  config: CalculatorConfig;
  formulaTarget: FormulaTarget;
  quantityLabel: string;
  nested?: boolean;
  onSlotClear: (path: SlotPath[]) => void;
  onOperationRemove: (path: SlotPath[]) => void;
  onGroupRemove: (path: SlotPath[]) => void;
  onSlotTap: (path: SlotPath[]) => void;
  activeSlotPath?: SlotPath[] | null;
}

function hasGroups(expression: BlockExpression): boolean {
  if (expression.type === "group") {
    return true;
  }
  if (expression.type === "operation") {
    return hasGroups(expression.left) || hasGroups(expression.right);
  }
  return false;
}

function operandColor(
  token: FlatToken,
): "quantity" | "property" | "output" | "calculation" | "constant" | "number" {
  if (token.kind !== "operand") {
    return "number";
  }
  switch (token.operand.kind) {
    case "quantity":
      return "quantity";
    case "property":
      return "property";
    case "output":
      return "output";
    case "calculation":
      return "calculation";
    case "constant":
      return "constant";
    default:
      return "number";
  }
}

interface SortableTokenProps {
  token: FlatToken;
  outputKey: string;
  config: CalculatorConfig;
  formulaTarget: FormulaTarget;
  quantityLabel: string;
  onSlotClear: (path: SlotPath[]) => void;
  onOperationRemove: (path: SlotPath[]) => void;
  onSlotTap: (path: SlotPath[]) => void;
  activeSlotPath?: SlotPath[] | null;
}

function SortableToken({
  token,
  outputKey,
  config,
  formulaTarget,
  quantityLabel,
  onSlotClear,
  onOperationRemove,
  onSlotTap,
  activeSlotPath = null,
}: SortableTokenProps) {
  const t = useTranslations("builder");

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: token.id,
    data: { source: "workspace-token", tokenId: token.id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  if (token.kind === "operator") {
    return (
      <div ref={setNodeRef} style={style} className="flex select-none items-center gap-0.5">
        <DragHandle
          setNodeRef={setActivatorNodeRef}
          listeners={listeners}
          attributes={attributes}
          label={t("dragHandle")}
          compact
        />
        <OperatorChip
          operator={token.operator}
          onRemove={() => onOperationRemove(token.path)}
        />
      </div>
    );
  }

  const slotId = `${outputKey}-${token.path.join("-") || "root"}`;
  const filledLabel =
    token.kind === "operand"
      ? formatBlockOperand(
          token.operand,
          config,
          formulaTarget,
          quantityLabel,
        )
      : undefined;

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-0.5">
      <DragHandle
        setNodeRef={setActivatorNodeRef}
        listeners={listeners}
        attributes={attributes}
        label={t("dragHandle")}
        compact
      />
      <BlockSlot
        slotId={slotId}
        path={token.path}
        expression={
          token.kind === "operand"
            ? { type: "operand", operand: token.operand }
            : { type: "empty" }
        }
        filledLabel={filledLabel}
        color={token.kind === "operand" ? operandColor(token) : "empty"}
        compact
        draggable={token.kind === "operand"}
        isActive={slotPathsEqual(activeSlotPath, token.path)}
        onClear={
          token.kind === "operand"
            ? () => onSlotClear(token.path)
            : undefined
        }
        onTap={() => onSlotTap(token.path)}
      />
    </div>
  );
}

interface ExpressionNodeProps extends Omit<FormulaLinearWorkspaceProps, "nested"> {
  path: SlotPath[];
}

function ContinuationSlot({
  outputKey,
  path,
  onSlotTap,
  activeSlotPath,
}: {
  outputKey: string;
  path: SlotPath[];
  onSlotTap: (path: SlotPath[]) => void;
  activeSlotPath?: SlotPath[] | null;
}) {
  const pathKey = path.join("-") || "root";
  return (
    <BlockSlot
      slotId={`${outputKey}-${pathKey}-continue`}
      path={path}
      expression={{ type: "empty" }}
      compact
      isActive={slotPathsEqual(activeSlotPath, path)}
      onTap={() => onSlotTap(path)}
    />
  );
}

function ExpressionNode({
  expression,
  path,
  outputKey,
  config,
  formulaTarget,
  quantityLabel,
  onSlotClear,
  onOperationRemove,
  onGroupRemove,
  onSlotTap,
  activeSlotPath = null,
}: ExpressionNodeProps) {
  if (expression.type === "group") {
    const groupPath = path;
    return (
      <GroupBracket
        outputKey={outputKey}
        path={groupPath}
        onRemove={() => onGroupRemove(groupPath)}
      >
        <ExpressionNode
          expression={expression.inner}
          path={[...path, "inner"]}
          outputKey={outputKey}
          config={config}
          formulaTarget={formulaTarget}
          quantityLabel={quantityLabel}
          onSlotClear={onSlotClear}
          onOperationRemove={onOperationRemove}
          onGroupRemove={onGroupRemove}
          onSlotTap={onSlotTap}
          activeSlotPath={activeSlotPath}
        />
        {showContinuationInsideGroup(expression.inner) && (
          <ContinuationSlot
            outputKey={outputKey}
            path={[...path, "inner", "continue"]}
            onSlotTap={onSlotTap}
            activeSlotPath={activeSlotPath}
          />
        )}
      </GroupBracket>
    );
  }

  if (expression.type === "empty" || expression.type === "operand") {
    const slotId = `${outputKey}-${path.join("-") || "root"}`;
    const filledLabel =
      expression.type === "operand"
        ? formatBlockOperand(
            expression.operand,
            config,
            formulaTarget,
            quantityLabel,
          )
        : undefined;

    const color =
      expression.type === "operand"
        ? expression.operand.kind === "quantity"
          ? "quantity"
          : expression.operand.kind === "property"
            ? "property"
            : expression.operand.kind === "output"
              ? "output"
              : expression.operand.kind === "constant"
                ? "constant"
                : "number"
        : "empty";

    return (
      <BlockSlot
        slotId={slotId}
        path={path}
        expression={expression}
        filledLabel={filledLabel}
        color={color}
        compact
        draggable={expression.type === "operand"}
        isActive={slotPathsEqual(activeSlotPath, path)}
        onClear={
          expression.type === "operand"
            ? () => onSlotClear(path)
            : undefined
        }
        onTap={() => onSlotTap(path)}
      />
    );
  }

  return (
    <>
      <ExpressionNode
        expression={expression.left}
        path={[...path, "left"]}
        outputKey={outputKey}
        config={config}
        formulaTarget={formulaTarget}
        quantityLabel={quantityLabel}
        onSlotClear={onSlotClear}
        onOperationRemove={onOperationRemove}
        onGroupRemove={onGroupRemove}
        onSlotTap={onSlotTap}
        activeSlotPath={activeSlotPath}
      />
      {showContinuationAfterLeft(expression) && (
        <ContinuationSlot
          outputKey={outputKey}
          path={[...path, "left", "continue"]}
          onSlotTap={onSlotTap}
          activeSlotPath={activeSlotPath}
        />
      )}
      <OperatorChip
        operator={expression.operator}
        path={path}
        draggable
        onRemove={() => onOperationRemove(path)}
      />
      <ExpressionNode
        expression={expression.right}
        path={[...path, "right"]}
        outputKey={outputKey}
        config={config}
        formulaTarget={formulaTarget}
        quantityLabel={quantityLabel}
        onSlotClear={onSlotClear}
        onOperationRemove={onOperationRemove}
        onGroupRemove={onGroupRemove}
        onSlotTap={onSlotTap}
        activeSlotPath={activeSlotPath}
      />
    </>
  );
}

export function FormulaLinearWorkspace({
  nested = false,
  onGroupRemove,
  ...props
}: FormulaLinearWorkspaceProps) {
  const { expression, outputKey } = props;
  const tokens = flattenExpression(expression);
  const canSort =
    isReorderableChain(expression) && !hasGroups(expression);

  const inner = canSort ? (
    <SortableContext
      items={tokens.map((t) => t.id)}
      strategy={horizontalListSortingStrategy}
    >
      <div className="flex flex-wrap select-none items-center gap-2">
        {tokens.map((token) => (
          <SortableToken key={token.id} token={token} {...props} />
        ))}
        {showContinuationAfter(expression) && (
          <ContinuationSlot
            outputKey={outputKey}
            path={CONTINUE_PATH}
            onSlotTap={props.onSlotTap}
            activeSlotPath={props.activeSlotPath}
          />
        )}
      </div>
    </SortableContext>
  ) : (
    <div className="flex flex-wrap select-none items-center gap-2">
      <ExpressionNode path={[]} {...props} onGroupRemove={onGroupRemove} />
      {showContinuationAfter(expression) && (
        <ContinuationSlot
          outputKey={outputKey}
          path={CONTINUE_PATH}
          onSlotTap={props.onSlotTap}
          activeSlotPath={props.activeSlotPath}
        />
      )}
    </div>
  );

  if (nested) {
    return inner;
  }

  return (
    <div className="min-h-[52px] select-none rounded-2xl border-2 border-dashed border-accent/30 bg-accent-muted/10 p-3">
      {inner}
    </div>
  );
}
