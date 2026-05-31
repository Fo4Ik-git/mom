# Calculator script reference

Text format for **Code** mode in the builder. The live **Help** page (`/docs` → **Calculator script**) lists the same entities with examples; primitive/function cards are under **Formulas & blocks**.

## Three views, one config

| View | Where | What you edit |
|------|--------|----------------|
| **Blocks** | Calculation logic → Blocks | AST via drag & drop |
| **Formula code** | Same panel → Code, or `formula { }` inside script | Expression text for one field |
| **Full script** | Toolbar **Code** → tabbed `.calc` files | Entire `CalculatorConfig` |

All views persist to the same JSON. There is no second “script copy” in the database.

For architecture and beginner steps, see [formulas-guide.md](./formulas-guide.md).

## Entity syntax

Declarations use keyword blocks with `{ … }` bodies.

### `input` — fields the user fills

```calc
input field_item {
  label = "Item"
  quantity = 1

  property var_cost {
    label = "Cost"
    value = 0
  }

  property var_price {
    label = "Price"
    value = 0
  }
}
```

- **Blocks:** add the field in the sidebar; palette shows `qty` and each property under the field group.
- **Code:** reference `field_item.qty`, `field_item.var_cost`, `field_item.var_price`.

Line-item tables use the line-items input pattern; row properties appear as `row.var_*` inside `SUM_ROWS`.

### `constant` — fixed numbers

```calc
constant const_markup {
  label = "Markup"
  value = 1.2
}
```

- **Blocks:** drag from **Constants** in the palette.
- **Code:** `const_markup` alone (no prefix).

### `macro` — reusable formula fragment

```calc
macro macro_sheet_cost {
  label = "Sheet cost"
  formula {
    return field_item.var_pages * field_item.var_paper
  }
}
```

- **Blocks:** define macro body in **Macros** section; drag macro chip into any formula.
- **Code:** `macro_sheet_cost` where you would use a number.

Macros are not shown on the public calculator screen.

### `calc` — intermediate calculation

```calc
calc calc_subtotal {
  label = "Subtotal"
  formula {
    return field_item.qty * field_item.var_cost
  }
}
```

- **Blocks:** open the calc field → build formula in workspace.
- **Code:** reference `calc_subtotal` in later formulas.

Order matters: do not reference a calc before it is defined (dependency graph).

### `output` — result shown to the user

```calc
output output_total {
  label = "Total"
  formula {
    local subtotal = calc_subtotal
    return ROUND(subtotal * const_markup, 2)
  }
}
```

- **Blocks:** result field → formula workspace.
- **Code:** `formula { local …; return … }` optional.

## Formula language inside `formula { … }`

### Operators and comparisons

| Code | Meaning | Block palette |
|------|---------|---------------|
| `+` `-` `*` `/` | Arithmetic | Actions → operators |
| `>` `<` `>=` `<=` `==` `!=` | Returns 1 or 0 | Comparison chips |

Use `>=` and `<=` in code (ASCII). Breakdown preview uses the same symbols.

### Functions

| Code | Blocks | Notes |
|------|--------|-------|
| `SUM(a, b, …)` | SUM bracket | Comma-separated args |
| `AVG`, `MIN`, `MAX`, `COUNT` | Same family | |
| `IF(cond, then, else)` | IF bracket | cond truthy when ≠ 0 |
| `ROUND(value, decimals)` | ROUND bracket | decimals 0–10 |
| `SUM_ROWS(table, expr)` | SUM rows | `row.*` inside expr |
| `AVG_ROWS`, `MIN_ROWS`, `MAX_ROWS`, `COUNT_ROWS` | Row aggregate blocks | |

### Locals

```calc
formula {
  local price = field_item.qty * field_item.var_price
  local discounted = IF(field_item.qty >= 10, price * 0.9, price)
  return discounted
}
```

Locals are scoped to this formula only. Names must be lowercase identifiers.

### Complete mini-calculator

```calc
input field_item {
  label = "Item"
  quantity = 1
  property var_cost { label = "Cost"; value = 0 }
  property var_price { label = "Price"; value = 0 }
}

constant const_markup {
  label = "Markup"
  value = 1.2
}

calc calc_cost_line {
  label = "Line cost"
  formula { return field_item.qty * field_item.var_cost }
}

output output_total {
  label = "Total"
  formula {
    return ROUND(calc_cost_line * const_markup, 2)
  }
}
```

## Multi-file project (Code sheet tabs)

| File | Allowed declarations |
|------|----------------------|
| `inputs.calc` | `input` only |
| `constants.calc` | `constant` only |
| `macros.calc` | `macro` only |
| `calculations.calc` | `calc` only |
| `outputs.calc` | `output` only |
| `auto-calculations.calc` | auto-generated (read-only) |

**Apply** merges tabs in order: inputs → constants → macros → calculations → outputs. Errors include `file:line`.

### Sync with block builder

- If the script sheet is open and you **have not** edited text, changes in the block UI reload the script automatically.
- If you **have** edited the script, a banner warns that the builder changed; use **Reload from builder** to discard local script text and match blocks.

### `#include "other.calc"`

```calc
#include "constants.calc"

output output_total {
  …
}
```

Unknown paths and include cycles are rejected (max depth 8).

### `#use "template-id"`

```calc
#use "print-shop-basic"
```

Loads a built-in preset; user declarations append per file. One `#use` per project.

| Id | Description |
|----|-------------|
| `print-shop-basic` | Item + cost/price + markup + total |
| `typography` | Typography shop preset (builder picker) |
| `salon` | Salon / services preset |

## Errors and tooling

- Parser errors: `inputs.calc:12 — message` in the sheet problems panel.
- **Format** regenerates script from config.
- Autocomplete: Ctrl+Space in formula and script editors.
- Tests: `npx vitest run tests/formula`, `npm run test:script` if defined.

## Related

- In-app: **Help** → `/docs` (Getting started + reference cards)
- [formulas-guide.md](./formulas-guide.md) — blocks vs code, evaluation, file map
- `lib/formula/README.md` — registry and adding primitives
- Export static docs: `npm run docs:build` → `docs/generated/` (if configured)
