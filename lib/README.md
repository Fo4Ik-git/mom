# `lib/` — серверна логіка та домени калькулятора

Код розбитий за **доменами**, а не «все в одну купу в корені».

```
lib/
├── access/          доступ користувачів, ключі, ліміти, бан
├── admin/           адмін-панель: аналітика, помилки API, списки
├── api/             безпека запитів, клієнт appFetch, cron
├── auth/            сесія, паролі, signup URL
├── platform/        БД (Prisma), slug, налаштування, валідація
├── calculator/      калькулятор: конфіг, поля, script DSL
├── formula/         формули: eval, блоки, код, registry
└── hooks/           React-хуки (клієнт)
```

## Домени платформи

| Папка | Призначення | Типові імпорти |
|-------|-------------|----------------|
| `access/` | Термін доступу, access keys, квоти | `@/lib/access/user-limits` |
| `admin/` | Адмін API helpers | `@/lib/admin/admin-analytics` |
| `api/` | Origin check, `appFetch`, cron bearer | `@/lib/api/api-client` |
| `auth/` | `requireAuth`, bcrypt | `@/lib/auth/auth-session` |
| `platform/` | Prisma singleton, slug, settings | `@/lib/platform/db` |

## Калькulator (`calculator/`)

| Підпапка | Що всередині |
|----------|--------------|
| `service.ts`, `route.ts` | CRUD калькуляторів, slug/route resolution |
| `config/` | `CalculatorConfig`: defaults, sync, auto-calculations, input patterns/sections, snippets |
| `fields/` | Типи полів: line items, time service, міграції |
| `schema/` | DSL-сущності (`input`, `calc`, …) + patterns |
| `script/` | Парсер/форматер `.calc` файлів, `#include`, rename |

**Потік script:** `script/parse-project` → `schema/registry` → merge → `CalculatorConfig`

## Формули (`formula/`)

| Підпапка | Що всередині |
|----------|--------------|
| `runtime/` | Обчислення: `evaluate`, `calculate`, `field-graph` |
| `code/` | Текстовий DSL: parse/format, autocomplete, document |
| `blocks/` | Візуальний редактор: palette, tree, tokens, slot-path |
| `core/` | Спільне: expression builders, labels, snippets, target |
| `nodes/` | **Registry** — один файл = один примітив (`SUM`, `+`, operand, …) |

**Три представлення однієї формули:** блоки ↔ код ↔ JSON AST — все через `nodes/registry`.

**Документація:** `/docs` у застосунку; у репозиторії — `docs/formulas-guide.md`, `docs/calculator-script.md`, `lib/formula/README.md`.

## Клієнт vs сервер

Файли з `"use client"`: `api/api-client.ts`, `hooks/*`. Решта — server-safe.

## Додати нове

- Новий примітив формули → `formula/nodes/my.node.ts` + `register()` у `registry.ts`
- Нова сущність script → `calculator/schema/entities/` + `schema/registry.ts`
- Нова платформна фіча → odповідна папка домену, не корінь `lib/`
