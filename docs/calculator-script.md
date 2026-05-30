# Calculator script reference

This document describes the **calculator script DSL** — the text format behind **Code** mode in the builder. The live reference at `/docs` is generated from the same registries as the app; this guide focuses on workflow and multi-file projects.

## Three views, one config

Every calculator is stored as `CalculatorConfig` JSON. You can edit it as:

| View | What you edit |
|------|----------------|
| **Blocks** | Visual formula workspace (drag & drop) |
| **Formula code** | Expression inside `formula { … }` — optional `local` lines + `return` |
| **Full script** | All inputs, constants, calculations, outputs |

Changes in any view sync to the same JSON — there is no separate “script copy” in the database (v1).

## Script syntax (entities)

Declarations use keyword blocks with `{ … }` bodies:

```calc
input field_item {
  label = "Item"
  quantity = 1

  property var_cost {
    label = "Cost"
    value = 0
  }
}

constant const_markup {
  label = "Markup"
  value = 1.2
}

output output_total {
  label = "Total"
  formula {
    return field_item.var_price * field_item.qty * const_markup
  }
}
```

Supported entities: `input`, `constant`, `calc`, `output`. See `/docs` → **Script** tab for field-level details and autocomplete snippets.

### Formula language inside `formula { … }`

Expressions support:

- Operators: `+`, `-`, `*`, `/`
- Comparisons (return **1** for true, **0** for false): `>`, `<`, `>=`, `<=`, `==`, `!=`
- References: `field_id.qty`, `field_id.var_*`, `const_id`, `calc_id`, `output_id`
- Functions: `SUM(…)`, `AVG(…)`, `COUNT(…)`, `MIN(…)`, `MAX(…)`
- Row aggregates (line items): `SUM_ROWS(table_id, row.qty * row.var_cost)`, etc.
- Conditionals: `IF(condition, thenValue, elseValue)` — condition is **truthy when ≠ 0**
- **Local variables** (optional, before `return`):

```calc
formula {
  local price = field_item.qty * field_item.var_price
  return IF(field_item.qty >= 10, price * 1.2, price)
}
```

Names must be lowercase identifiers (`price`, `subtotal`). Locals can reference earlier locals; the final `return` may use any of them.

Example:

```calc
formula {
  return IF(field_item.qty > 10, field_item.var_price * 0.9, field_item.var_price)
}
```

> **Note:** `FOR` loops are planned but not implemented yet.

## Multi-file project (virtual tabs)

In the Code sheet, the script is split into tabs:

| File | Allowed declarations |
|------|----------------------|
| `inputs.calc` | `input` only |
| `constants.calc` | `constant` only |
| `calculations.calc` | `calc` only |
| `outputs.calc` | `output` only |
| `auto-calculations.calc` | auto-generated qty × property calcs (read-only tab) |

**Apply** merges all tabs in order: inputs → constants → calculations → outputs. Duplicate ids across files are errors with `file:line` locations.

### `#include "other.calc"`

Pull declarations from another project file (each included file is parsed once):

```calc
#include "constants.calc"

output output_total {
  …
}
```

- Unknown paths and include cycles are rejected.
- Maximum include depth: 8.

### `#use "template-id"`

Load a **built-in preset** and merge your edits on top. Put the directive in any tab (typically `inputs.calc` when starting a new calculator):

```calc
#use "print-shop-basic"
```

Available templates:

| Id | Alias | Description |
|----|-------|-------------|
| `print-shop-basic` | `platform/templates/print-shop` | Item + cost/price + markup constant + total output |

Only one `#use` per project. User declarations in any tab are appended after the template content for that file.

## Errors and round-trip

- Parser errors show as `inputs.calc:12 — message`.
- **Format** regenerates script from config (project split or monolith).
- Round-trip tests: `npm run test:script`.

## Related

- In-app help: **Help** in the header → `/docs`
- Builder: **?** next to Code opens docs; palette blocks have **?** tooltips
- Export static docs: `npm run docs:build` → `docs/generated/`
