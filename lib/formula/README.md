# `formula/` — мова формул та обчислення

Один AST (`BlockExpression` у JSON) — три UI: блоки, код, preview.

## Структура

```
formula/
├── runtime/     обчислення та порядок eval
├── code/        текстовий DSL (SUM, field.qty, …)
├── blocks/      візуальний конструктор (palette, DnD tree)
├── core/        спільні builders, labels, snippets
└── nodes/       registry примітивів (single source of truth)
```

## `nodes/` — головна точка розширення

### Один файл = один примітив

Оператори та функції живуть у **`nodes/primitives/`**:

```
primitives/
├── plus.node.ts       →  a + b
├── minus.node.ts      →  a - b
├── multiply.node.ts   →  a * b
├── divide.node.ts     →  a / b
├── sum.node.ts        →  SUM(...)
├── avg.node.ts        →  AVG(...)
├── count.node.ts, min.node.ts, max.node.ts
├── sum-rows.node.ts   →  SUM_ROWS(field, expr)
└── index.ts           →  ALL_PRIMITIVES (реєстр)
```

Кожен файл експортує повний `FormulaPrimitiveDefinition`.  
`_helpers.ts` — тільки parse/format/palette (без логіки обчислення).

| Можливість | Що робить registry |
|------------|-------------------|
| **eval** | `evaluateExpressionViaRegistry` |
| **код** | parse (`parseCodeCall` / infix), format (`formatCode`) |
| **блоки** | палитра DnD (`paletteItems`) |
| **autocomplete** | auto з `call` + `astType` (`generateDefaultCompletions`); опційно `completions` override |

### Додати новий примітив

1. Скопіюй `primitives/_template.primitive.node.ts` → `round.node.ts`
2. Напиши **evaluate** зі своєю логікою в цьому файлі
3. Додай import + рядок у `primitives/index.ts` → `ALL_PRIMITIVES`

Більше ніде switch не потрібен.

### Структурні вузли (не примітиви)

`empty.node.ts`, `group.node.ts`, `operand.node.ts` — контейнери AST.

Dynamic operands (поля з config) — `reference-operands.ts`, `reference-code.ts`.

### Registry

`nodes/registry.ts` — dispatch eval/format/palette/completions з `ALL_PRIMITIVES` + structural nodes.

## `runtime/`

| Файл | Роль |
|------|------|
| `block-evaluate.ts` | Eval одного виразу |
| `field-graph.ts` | Залежності, цикли, порядок calc/output |
| `calculate.ts` | Публічний API для екрана калькулятора |
| `evaluate.ts` | Валідація конфігу + re-exports |

## `code/`

| Файл | Роль |
|------|------|
| `code-parse.ts` | Текст → AST |
| `code-format.ts` | AST → текст |
| `formula-code-completions.ts` | Autocomplete (SUM, поля, …) |
| `formula-code-document.ts` | Документ на кілька формул |

## `blocks/`

| Файл | Роль |
|------|------|
| `block-tree.ts` | Дерево слотів для DnD |
| `block-palette.ts` | Палитра з registry |
| `block-format.ts` | Людиночитні підписи блоків |
| `slot-path.ts` | Шлях до слота в дереві |

## `core/`

| Файл | Роль |
|------|------|
| `expression-builders.ts` | Фабрики AST (`quantityTimesProperty`, …) |
| `formula-target.ts` | Контекст «для якого calc/output» |
| `formula-snippets.ts` | Готові шматки формул |
| `operand-labels.ts` | Підписи operand у UI |

## Залежності

`formula/` ↔ `calculator/fields` + `calculator/config` (line items, auto-calcs).  
Типи AST — `@/types/calculator`.
