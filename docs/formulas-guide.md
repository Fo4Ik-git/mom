# Formulas, blocks, and code — beginner guide

This document mirrors the in-app **Help** page (`/docs`, tab **Getting started**) and goes deeper for contributors. End users should open **Help** in the app for localized content.

## One source of truth

```
CalculatorConfig (JSON)
  ├── inputs[], constants[], macros[]
  ├── calculations[]  → each has expression: BlockExpression (AST)
  └── outputs[]       → each has expression: BlockExpression (AST)
```

There is **no** separate `formulaCode` string in the database. What you see as text or blocks is always generated from (or parsed into) that AST via `lib/formula/nodes/registry.ts`.

| Layer | Folder / UI | Responsibility |
|-------|-------------|----------------|
| **Types** | `types/calculator.ts` | `BlockExpression` union (operation, operand, conditional, round, …) |
| **Registry** | `lib/formula/nodes/` | Eval, format to code, parse from code, palette, completions, docs examples |
| **Sync** | `lib/formula/sync/formula-field-sync.ts` | Single field: AST ↔ `formula { … }` text |
| **Blocks UI** | `app/components/builder/scratch/` | DnD workspace, `CompositeBracket` for IF/ROUND |
| **Code UI** | `formula-code-editor.tsx`, `config-code-sheet.tsx` | CodeMirror, full script project |
| **Unified** | `formula-unified-editor.tsx` | Code + blocks side by side with debounced parse |
| **Runtime** | `lib/formula/runtime/` | `field-graph`, `evaluate`, public `calculate` |

## Configuration parts (what each section is for)

| Builder section | Script keyword | In formulas |
|-----------------|----------------|-------------|
| Input fields | `input field_*` | `field_id.qty`, `field_id.var_*` |
| Constants | `constant const_*` | `const_id` |
| Macros | `macro macro_*` | `macro_id` (body edited once) |
| Calculation fields | `calc calc_*` | `calc_id` (intermediate, hidden on calculator screen) |
| Result fields | `output output_*` | `output_id` (shown after **Calculate**) |

**Auto calculations** are generated when you enable “auto total” on a property (`qty × var`). They appear as calc fields and in the read-only `auto-calculations.calc` tab.

## Block editor

- Workspace: dashed area under **Calculation logic** on each calc/output.
- **＋** slots accept palette drops; tap a slot then pick a block on mobile.
- **Operands** come from palette groups (per input field, constants, macros, other calcs).
- **Operators** (`+ − × ÷`, comparisons) sit between sub-expressions.
- **Aggregates**: `SUM(…)`, `AVG(…)`, … — drop values inside the colored bracket.
- **IF** / **ROUND**: composite brackets with labeled slots (registry-driven `block-ui-registry.ts`).
- **Groups** `( )`: nest sub-expressions; drag the group handle to move.
- **Row aggregates** (line-item tables): `SUM_ROWS`, etc. — build per-row formula with `row.qty`, `row.var_*` inside.

Preview line **Reads as** uses `formatBlockExpression` (labels for humans). Calculator breakdown uses `formatBlockExpressionWithValues` (numbers via registry eval).

## Formula code (single field)

Syntax inside `formula { … }`:

```calc
formula {
  local subtotal = field_item.qty * field_item.var_cost
  local with_tax = subtotal * const_markup
  return ROUND(with_tax, 2)
}
```

Rules:

- `local` lines only before `return`.
- Identifiers: lowercase `[a-z][a-z0-9_]*`.
- Comparisons yield `1` or `0`; `IF(cond, a, b)` is true when `cond != 0`.
- Same functions as blocks: `SUM`, `IF`, `ROUND`, `SUM_ROWS`, …

Invalid code does not overwrite blocks until the parser succeeds (debounced in unified editor).

## Full script (Code sheet)

Toolbar **Code** opens virtual files:

| File | Declarations |
|------|----------------|
| `inputs.calc` | `input` |
| `constants.calc` | `constant` |
| `macros.calc` | `macro` |
| `calculations.calc` | `calc` |
| `outputs.calc` | `output` |
| `auto-calculations.calc` | read-only |

**Apply** parses all tabs → `CalculatorConfig`. While the sheet is open:

- If you have **not** edited the script, builder changes auto-reload the tabs.
- If the script is **dirty**, you get a banner to **Reload from builder** (`calculatorConfigFingerprint`).

See [calculator-script.md](./calculator-script.md) for `#include`, `#use`, and presets.

## Evaluation order

1. User quantities and line-item rows.
2. Calculations (including auto calcs) in topological order; cycles are errors.
3. Outputs.
4. Locals only within one output’s formula.

Implementation: `evaluateAllFormulaFields` in `field-graph.ts`, per-node eval in `registry.ts`.

## Reference cards

The **Formulas & blocks** and **Calculator script** tabs on `/docs` are generated from:

- `collectFormulaDocs()` → primitives from `ALL_PRIMITIVES`, script entities from `getAllConfigEntities()`.
- Copy in `messages/en.json` and `messages/uk.json` under `docs.*` (title, description, `codeUsage`, `blockUsage`).

Adding a primitive: implement `*.node.ts`, register in `primitives/index.ts`, add i18n keys under `docs.primitives.<id>`.

## Examples

### Quantity × price with markup (blocks or code)

**Code:**

```calc
return field_item.qty * field_item.var_price * const_markup
```

**Blocks:** drag `qty`, `×`, `var_price`, `×`, constant `const_markup`.

### Tiered price with IF

**Code:**

```calc
return IF(field_item.qty >= 10, field_item.var_price * 0.9, field_item.var_price)
```

**Blocks:** drag **IF**, put `qty >= 10` in condition slot, discounted price in ✓, full price in ✗.

### Line items total

**Code:**

```calc
return SUM_ROWS(field_lines, row.qty * row.var_cost)
```

**Blocks:** under the table field, **SUM rows** bracket, inside use `row.qty` and `row.var_cost`.

## Tests

```bash
npx vitest run tests/formula
npx vitest run tests/docs
```

## Related files

- `lib/formula/README.md` — developer map of `formula/`
- `docs/calculator-script.md` — script DSL reference
- `TODO.md` §6–§10 — roadmap for code/blocks unification
