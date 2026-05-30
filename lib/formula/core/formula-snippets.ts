import type {
  BlockExpression,
  CalculatorConfig,
  InputField,
  InputProperty,
} from "@/types/calculator";
import { emptyBlockExpression } from "@/types/calculator";
import { collectTotalOperands } from "@/lib/formula/core/collect-total-operands";
import {
  costLike,
  priceLike,
} from "@/lib/formula/core/property-matchers";
import {
  operationExpression,
  propertyMinusProperty,
  propertyTimesConstant,
  quantityTimesProperty,
  sumExpressions,
} from "@/lib/formula/core/expression-builders";
import type { PaletteBlock } from "@/lib/formula/blocks/block-palette";

export type SnippetPickKind = "property" | "propertyPair" | "propertyConstant";

export interface FormulaSnippetPick {
  kind: SnippetPickKind;
  fieldId: string;
  fieldLabel: string;
  properties: InputProperty[];
  constants?: { id: string; label: string }[];
  snippetId: string;
  label: string;
}

export type SnippetBlock = PaletteBlock & {
  category: "snippet";
  color: "snippet";
  pick?: FormulaSnippetPick;
};

function findCostPrice(field: InputField) {
  const cost = field.properties.find(costLike);
  const price = field.properties.find(priceLike);
  return { cost, price };
}

function fieldLabel(field: InputField) {
  return field.label.trim() || "…";
}

function snippetMeta(field: InputField, title: string, hint: string) {
  return {
    groupId: field.id,
    groupLabel: fieldLabel(field),
    title,
    hint,
  };
}

export function buildFormulaSnippets(
  config: CalculatorConfig,
  quantityLabel: string,
  labels: {
    qtyTimes: string;
    margin: string;
    withConstant: string;
    pickProperty: string;
    pickPrice: string;
    pickCost: string;
    pickConstant: string;
    sumAllCost?: string;
    sumAllPrice?: string;
    globalMargin?: string;
  },
): SnippetBlock[] {
  const snippets: SnippetBlock[] = [];

  const costOperands = collectTotalOperands(config, costLike);
  const priceOperands = collectTotalOperands(config, priceLike);

  if (labels.sumAllCost && costOperands.length > 0) {
    snippets.push({
      id: "snip-global-sum-cost",
      label: labels.sumAllCost,
      category: "snippet",
      color: "snippet",
      meta: { groupId: "global", groupLabel: labels.sumAllCost, title: labels.sumAllCost },
      dragData: {
        kind: "expression",
        expression: sumExpressions(costOperands),
      },
    });
  }

  if (labels.sumAllPrice && priceOperands.length > 0) {
    snippets.push({
      id: "snip-global-sum-price",
      label: labels.sumAllPrice,
      category: "snippet",
      color: "snippet",
      meta: { groupId: "global", groupLabel: labels.sumAllPrice, title: labels.sumAllPrice },
      dragData: {
        kind: "expression",
        expression: sumExpressions(priceOperands),
      },
    });
  }

  if (labels.globalMargin && costOperands.length > 0 && priceOperands.length > 0) {
    const marginExpression = operationExpression(
      "-",
      sumExpressions(priceOperands),
      sumExpressions(costOperands),
    );

    snippets.push({
      id: "snip-global-margin",
      label: labels.globalMargin,
      category: "snippet",
      color: "snippet",
      meta: { groupId: "global", groupLabel: labels.globalMargin, title: labels.globalMargin },
      dragData: { kind: "expression", expression: marginExpression },
    });
  }

  for (const input of config.inputs) {
    const group = fieldLabel(input);

    for (const property of input.properties) {
      snippets.push({
        id: `snip-qty-${input.id}-${property.id}`,
        label: `${property.label} (${group})`,
        category: "snippet",
        color: "snippet",
        meta: snippetMeta(
          input,
          property.label,
          `${quantityLabel} × ${property.label}`,
        ),
        dragData: {
          kind: "expression",
          expression: quantityTimesProperty(input.id, property.id),
        },
      });
    }

    const { cost, price } = findCostPrice(input);
    if (cost && price && cost.id !== price.id) {
      snippets.push({
        id: `snip-margin-${input.id}`,
        label: `${labels.margin} (${group})`,
        category: "snippet",
        color: "snippet",
        meta: snippetMeta(
          input,
          labels.margin,
          `${price.label} − ${cost.label}`,
        ),
        dragData: {
          kind: "expression",
          expression: propertyMinusProperty(input.id, price.id, cost.id),
        },
      });
    } else if (input.properties.length >= 2) {
      snippets.push({
        id: `snip-margin-pick-${input.id}`,
        label: `${labels.margin} (${group})`,
        category: "snippet",
        color: "snippet",
        meta: snippetMeta(input, labels.margin, labels.pickProperty),
        dragData: {
          kind: "expression",
          expression: emptyBlockExpression(),
        },
        pick: {
          kind: "propertyPair",
          fieldId: input.id,
          fieldLabel: input.label,
          properties: input.properties,
          snippetId: `snip-margin-pick-${input.id}`,
          label: labels.margin,
        },
      });
    }

    for (const property of input.properties) {
      for (const constant of config.constants ?? []) {
        snippets.push({
          id: `snip-const-${input.id}-${property.id}-${constant.id}`,
          label: `${property.label} × ${constant.label}`,
          category: "snippet",
          color: "snippet",
          meta: snippetMeta(
            input,
            `${property.label} × ${constant.label}`,
            labels.withConstant,
          ),
          dragData: {
            kind: "expression",
            expression: propertyTimesConstant(
              input.id,
              property.id,
              constant.id,
            ),
          },
        });
      }
    }
  }

  return snippets;
}

export function resolveSnippetPick(
  pick: FormulaSnippetPick,
  selection: {
    propertyId?: string;
    leftPropertyId?: string;
    rightPropertyId?: string;
    constantId?: string;
  },
): BlockExpression | null {
  if (pick.kind === "propertyPair") {
    const { leftPropertyId, rightPropertyId } = selection;
    if (!leftPropertyId || !rightPropertyId) {
      return null;
    }
    return propertyMinusProperty(pick.fieldId, leftPropertyId, rightPropertyId);
  }

  if (pick.kind === "propertyConstant") {
    const { propertyId, constantId } = selection;
    if (!propertyId || !constantId) {
      return null;
    }
    return propertyTimesConstant(pick.fieldId, propertyId, constantId);
  }

  if (pick.kind === "property") {
    const { propertyId } = selection;
    if (!propertyId) {
      return null;
    }
    return quantityTimesProperty(pick.fieldId, propertyId);
  }

  return null;
}

export function snippetPickTitle(
  pick: FormulaSnippetPick,
  labels: {
    pickPrice: string;
    pickCost: string;
  },
) {
  if (pick.kind === "propertyPair") {
    return `${pick.label}: ${labels.pickPrice} − ${labels.pickCost}`;
  }
  return pick.label;
}
