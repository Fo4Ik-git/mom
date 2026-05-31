# `formula/` — formula language, blocks, and code

One AST (`BlockExpression` in JSON) — three **views**: blocks, code, numeric preview. Logic is not duplicated: eval / format / parse go through `nodes/registry.ts`; field-level sync uses `sync/formula-field-sync.ts`.

**User-facing docs:** `/docs` in the app (Getting started + reference cards). Repo copies: `docs/formulas-guide.md`, `docs/calculator-script.md`.

## Mental model

```
                    ┌─────────────────────┐
                    │  BlockExpression    │  ← stored in CalculatorConfig
                    │  (JSON AST)         │
                    └──────────┬──────────┘
           format ▲            │ parse
                  │            ▼
     ┌────────────┴────────────┴────────────┐
     │         nodes/registry.ts            │
     │  evaluate · formatCode · parseCodeCall │
     └────────────┬────────────┬────────────┘
                  │            │
          block UI workspace   formula { … } text
          (scratch/*)          (code/* + sync/*)
```

## Directory map

```
formula/
├── nodes/           registry — single source of truth per primitive
│   ├── primitives/  plus, sum, if, round, … (*.node.ts)
│   ├── block-ui-registry.ts   composite brackets (IF, ROUND)
│   ├── registry.ts            dispatch + formatExpressionWithValuesViaRegistry
│   └── reference-code.ts      operands → code text
├── sync/            formulaFieldToCode / formulaFieldFromCode
├── code/            parse/format DSL, completions, formula-program (locals)
├── blocks/          block-tree, palette, composite-node-ops, block-format-values
├── runtime/         field-graph, calculate, block-evaluate
├── core/            builders, snippets, formula-target, labels
└── docs/            collectFormulaDocs() for /docs page
```

## Who owns what (for newcomers)

| Question | Answer |
|----------|--------|
| Where is the formula stored? | `calculation.expression` / `output.expression` in `CalculatorConfig` |
| How do blocks change the AST? | `block-tree.ts` — slot paths, palette apply, composite slots via `composite-node-ops` |
| How does code change the AST? | `code-parse.ts` → registry `parseCodeCall` / infix; field wrapper in `formula-field-sync.ts` |
| How is code generated from blocks? | `formatExpressionCodeViaRegistry` / `formulaFieldToCode` |
| How is preview with numbers built? | `formatExpressionWithValuesViaRegistry` (eval + formatCode) |
| Where is IF/ROUND UI defined? | `block-ui-registry.ts` + `CompositeBracket` (not per-type files) |
| Full calculator script? | `lib/calculator/script/*` — not under `formula/`, but formulas inside entities use the same registry |

## `nodes/` — adding a primitive

1. Copy `primitives/_template.primitive.node.ts` → `my-fn.node.ts`
2. Implement `evaluate`, optional `formatCode`, `parseCodeCall`, `paletteItems`, `doc.example`
3. Register in `primitives/index.ts` → `ALL_PRIMITIVES`
4. Extend `BlockExpression` in `types/calculator.ts` if new AST shape
5. For composite nodes (like IF): add entry to `block-ui-registry.ts`, implement `*.node.ts`
6. Add i18n: `messages/en.json` + `uk.json` → `docs.primitives.<id>` (title, description, `codeUsage`, `blockUsage`)

| Capability | Registry API |
|------------|----------------|
| Eval | `evaluateExpressionViaRegistry` |
| Code out | `formatExpressionCodeViaRegistry` |
| Code in | `parseExpressionViaRegistry` |
| Block labels | `formatExpressionLabelViaRegistry` |
| Numeric preview | `formatExpressionWithValuesViaRegistry` |
| Palette | `paletteItems` on primitive |
| Autocomplete | `call` + `astType` or custom `completions` |

Structural nodes (not primitives): `empty`, `group`, `operand` — `empty.node.ts`, etc.

## `blocks/`

| File | Role |
|------|------|
| `block-tree.ts` | Slot paths, DnD, `removeCompositeAt`, palette apply |
| `composite-node-ops.ts` | Read/write composite slots, `firstEmptyCompositeSlot` |
| `block-ui-registry.ts` | IF/ROUND metadata (slots, colors, drop targets) |
| `block-palette.ts` | Palette from registry |
| `block-format.ts` | Human labels for workspace |
| `block-format-values.ts` | Breakdown with numbers → registry |
| `block-tokens.ts` | Flatten/reorder simple chains |

UI: `app/components/builder/scratch/` — `formula-scratch-editor`, `formula-linear-workspace`, `composite-expression-node`.

## `sync/`

`formula-field-sync.ts` — one calc/output field:

- `formulaFieldToCode(expression, target, config)` → `formula { … }`
- `formulaFieldFromCode(text, target, config)` → AST or errors

Used by `formula-unified-editor.tsx` (debounced parse).

## `code/`

| File | Role |
|------|------|
| `code-parse.ts` | Text → AST |
| `code-format.ts` | AST → text |
| `formula-program.ts` | `local` lines + `return` |
| `formula-code-completions.ts` | Fields, macros, SUM, … |

## `runtime/`

| File | Role |
|------|------|
| `field-graph.ts` | Dependency order, macros, cycles |
| `block-evaluate.ts` | EvalContext, per-node eval |
| `calculate.ts` | Public API for calculator page |

## Config code sheet

`app/components/builder/config-code-sheet.tsx` — multi-tab script; fingerprint sync via `lib/calculator/config/config-fingerprint.ts`. Documented in `docs/calculator-script.md`.

## Tests

```bash
npx vitest run tests/formula
npx vitest run tests/docs
```

## Dependencies

- Types: `@/types/calculator`
- Config / fields: `lib/calculator/config`, `lib/calculator/fields`
- Script entities: `lib/calculator/schema/registry` (separate from formula primitives but shares formula body syntax)
