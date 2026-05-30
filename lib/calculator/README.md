# `calculator/` — конфіг калькулятора та script DSL

## Структура

```
calculator/
├── service.ts          CRUD + валідація (API layer)
├── route.ts            slug / public path resolution
├── config/             логіка CalculatorConfig
├── fields/             типи полів (line items, time)
├── schema/             парсинг keyword-декларацій (input, calc, …)
└── script/             multi-file .calc проєкт
```

## `config/` — дані користувача

| Файл | Роль |
|------|------|
| `defaults.ts` | Порожній шаблон конфігу |
| `sync.ts` | `finalizeConfig`, reorder inputs, duplicate field |
| `auto-calculations.ts` | Авто-підсумки `qty × property` |
| `input-patterns.ts` | Шаблони полів (cost+price, time, line items) |
| `input-sections.ts` | Секції редактора (materials/services/…) |
| `input-field-clone.ts` | Дублювання поля |
| `output-snippets.ts` | Готові формули для outputs |

## `fields/` — спеціальні типи input

| Файл | Роль |
|------|------|
| `line-items.ts` | Таблиця позиций, row aggregates |
| `line-items-migrate.ts` | Міграція старих конфігів |
| `time-service.ts` | Поля час × ставка |

## `schema/` — script entities

- `entities/*.entity.ts` — по одному keyword (`input`, `constant`, `calc`, `output`)
- `patterns/` — спільний парсинг `{ }` блоків
- `registry.ts` — match header → entity

## `script/` — файловий проєкт

| Файл | Роль |
|------|------|
| `project-types.ts` | Імена вкладок: `inputs.calc`, `auto-calculations.calc`, … |
| `parse-project.ts` | Apply: project → `CalculatorConfig` |
| `format-project.ts` | Config → вкладки в UI |
| `resolve-includes.ts` | `#include` |
| `id-rename.ts` | Пропагація перейменування id |

Залежить від `formula/code/*` для формул у `calc` / `output`.
