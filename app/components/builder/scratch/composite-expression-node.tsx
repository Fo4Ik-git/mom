"use client";

import type { BlockExpression, CalculatorConfig } from "@/types/calculator";
import type { FormulaTarget } from "@/lib/formula/core/formula-target";
import type { SlotPath } from "@/lib/formula/blocks/block-tree";
import { showContinuationAfter } from "@/lib/formula/blocks/block-tree";
import { readCompositeSlot } from "@/lib/formula/blocks/composite-node-ops";
import { getCompositeBlockUi } from "@/lib/formula/nodes/block-ui-registry";
import { CompositeBracket } from "@/app/components/builder/scratch/composite-bracket";

type ExpressionNodeProps = {
  expression: BlockExpression;
  path: SlotPath[];
  outputKey: string;
  config: CalculatorConfig;
  formulaTarget: FormulaTarget;
  quantityLabel: string;
  onSlotClear: (path: SlotPath[]) => void;
  onOperationRemove: (path: SlotPath[]) => void;
  onGroupRemove: (path: SlotPath[]) => void;
  onAggregateRemove: (path: SlotPath[]) => void;
  onRowAggregateRemove: (path: SlotPath[]) => void;
  onCompositeRemove: (path: SlotPath[]) => void;
  onSlotTap: (path: SlotPath[]) => void;
  activeSlotPath?: SlotPath[] | null;
  ExpressionNode: (props: ExpressionNodeProps) => React.ReactNode;
  ContinuationSlot: (props: {
    outputKey: string;
    path: SlotPath[];
    onSlotTap: (path: SlotPath[]) => void;
    activeSlotPath?: SlotPath[] | null;
  }) => React.ReactNode;
};

export function renderCompositeExpression(
  props: ExpressionNodeProps,
): React.ReactNode | null {
  const ui = getCompositeBlockUi(props.expression.type);
  if (!ui) {
    return null;
  }

  const {
    expression,
    path,
    outputKey,
    onCompositeRemove,
    ExpressionNode,
    ContinuationSlot,
  } = props;

  return (
    <CompositeBracket
      ui={ui}
      outputKey={outputKey}
      path={path}
      onRemove={() => onCompositeRemove(path)}
    >
      {ui.slots.map((slot, index) => {
        const child = readCompositeSlot(expression, slot.key);
        const slotPath = [...path, slot.key as SlotPath];
        return (
          <span
            key={`${path.join("-")}-${slot.key}`}
            className="inline-flex items-center gap-1.5"
          >
            {index > 0 && (
              <span className="select-none text-sm font-medium text-muted-foreground">
                ,
              </span>
            )}
            {slot.label ? (
              <span className="select-none text-[10px] font-semibold uppercase opacity-80">
                {slot.label}
              </span>
            ) : null}
            <ExpressionNode
              {...props}
              expression={child}
              path={slotPath}
            />
            {showContinuationAfter(child) && (
              <ContinuationSlot
                outputKey={outputKey}
                path={[...slotPath, "continue"]}
                onSlotTap={props.onSlotTap}
                activeSlotPath={props.activeSlotPath}
              />
            )}
          </span>
        );
      })}
    </CompositeBracket>
  );
}
