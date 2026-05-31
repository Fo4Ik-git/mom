- **Роли и права доступа (RBAC)**
  - [x] `USER` — без админ-панели и staff API
  - [x] `ADMIN` — админ-панель, управление только `USER` (лимиты, бан, пароль, email, реферал)
  - [x] `ADMIN` **не может** менять других `ADMIN` / `SUPERADMIN` (пароль, бан, лимиты, роли и т.д.)
  - [x] `ADMIN` **не может** выдавать доступ к ИИ и квоты (`/api/admin/users/[id]/ai`, дефолты AI в settings)
  - [x] `SUPERADMIN` — один на систему, полные права (роли, ИИ, все пользователи)
  - [x] Центр правил: `lib/auth/permissions.ts` + проверки в API и UI

- [x] Передача калькулятора другому пользователю (Админ)
- [x] Давать доступ к калькулятору другому пользователю
- [x] Редактирование чужого калькулятора (Админ)
- [x] Удаление калькулятора

- **ИИ-ассистент: учёт токенов, доступ и квоты**
  - Контекст: сейчас Gemini доступен только админам в билдере; нет учёта `input`/`output` токенов, нет выдачи доступа пользователям и лимитов по периоду.

  - **1. Учёт потраченных токенов**
    - [x] Логировать каждый вызов `generate-calculator` / чат: `userId`, модель, `promptTokens`, `completionTokens`, `totalTokens`, timestamp, `calculatorId` (опционально)
    - [x] Агрегаты в БД: сумма за всё время + за текущий период (день / неделя / месяц — см. п.3)
    - [x] Брать цифры из ответа Gemini API (`usageMetadata`), не оценивать «на глаз»

  - **2. Доступ к ИИ для пользователя (выдаёт суперадмин)**
    - [x] Поля на пользователе: `aiAccessMode`, `aiAccessExpiresAt`, `aiAccessGrantedAt`, `aiAccessDurationDays`
      - режим срока: **без срока** | **до даты** | **на N дней** с момента выдачи
    - [x] UI в админке → модалка пользователя → раздел «ІІ-асистент»
    - [x] Проверка на `POST /api/ai/generate-calculator`: ADMIN **или** выданный доступ + не истёк срок
    - [x] Админы без лимита токенов (`aiTokenQuota = null`)

  - **3. Лимит токенов на период**
    - [x] Квота на пользователя: лимит + **период сброса** — день | неделя | месяц
    - [x] `null` лимита = безлимит (для админа / VIP)
    - [x] При исчерпании — 429 `ai_quota_exceeded` + `resetAt`
    - [x] Дефолтная квота в `PlatformSettings` (`defaultAiTokenQuota`, API settings)

  - **4. Админ-панель — визуализация**
    - [x] В таблице пользователей: колонка «ІІ токени»
    - [x] В модалке пользователя → раздел «ІІ-асистент» (статистика + настройки)
    - [ ] Опционально: график расхода за 30 дней на overview

  - **5. Интерфейс для пользователя**
    - [x] Остаток в панели ІІ-чату в билдере
    - [x] «Залишилось ~{remaining} токенів до {date}» / «без обмежень»
    - [x] Кнопка асистента только при `canUseAi` (доступ выдан)

  - **6. История чата (MVP)**
    - [x] `AiChatThread` + `AiChatMessage` в БД (на пользователя + калькулятор)
    - [x] API `GET/PUT/DELETE /api/ai/chat`
    - [x] Восстановление при открытии панели; сохранение после каждого успешного ответа
    - [x] Черновик без `calculatorId` — localStorage в браузере
    - [ ] Перенос черновика в БД после первого сохранения калькулятора

  - **Рекомендуемый порядок (MVP)**
    1. Модель БД + логирование токенов после каждого запроса
    2. Проверка доступа (админ выдал) + лимит на месяц
    3. Админ UI: раздел в модалке пользователя + цифры в таблице
    4. Остаток токенов в билдере для пользователя с доступом
    5. Периоды день/неделя + графики — по необходимости

- Улучшение редактора калькулятора
  - [x] Drag and drop для уравнений на сенсорных устройствах

  - Упрощение логики (много однотипных полей → сложно работать в редакторе)
    - Контекст: сейчас `inputs` (до 50) + авто-calc (`qty × property`) + ручные `calculations` + `outputs` (блочный редактор). Шаблоны полей уже есть (cost+price, время, расходник).

    - **1. Быстрые победы в UX (без смены модели данных)**
      - [x] Секции в редакторе (Материалы / Услуги / …) — сворачиваемые группы, drag между группами
      - [x] Скрыть/свернуть авто-расчёты по умолчанию (`isAutoCalculationId`) — в списке формул только ручные + итоги
      - [x] «Дублировать поле» с копией свойств
      - [x] «Добавить N позиций» из одного шаблона (пакет cost+price и т.д.)
      - [x] Поиск/фильтр по полям в длинном списке
      - [x] Сниппеты для outputs: сумма всех cost/price, маржа = выручка − себестоимость (один клик)

    - **2. Агрегаты в языке формул (средняя сложность)**
      - [x] Операнды-агрегаты: `SUM` по полям/calc/шаблону property (`var_cost`, `calc_field_*`, …)
      - [x] При необходимости: `COUNT`, `AVG`, `MIN`, `MAX`
      - [x] Палитра + eval (`block-evaluate`, `field-graph`) + валидация зависимостей

    - **3. Line items / таблица позиций (главное для «много строк»)**
      - [x] Новый тип поля «список позиций»: одна схема строки в редакторе, N строк в рантайме у пользователя
      - [x] UI таблицы на экране калькулятора (+ добавить строку)
      - [x] Итоги: `SUM(rows.cost * rows.qty)` и т.п.
      - [x] Миграция старых калькуляторов (опционально)

    - **4. Методы / макросы / шаблоны**
      - [x] Именованные макросы формул в конфиге (переиспользование)
      - [x] Пресеты целого калькулятора (типография, салон, …)
      - [x] `IF(cond, then, else)` в formula DSL и блоках (`if.node.ts`)
      - [x] `MIN` / `MAX` / `COUNT` / `AVG` — агрегаты (п.2) + в коде
      - [x] `ROUND(...)` в DSL

    - **5. Циклы в конфиге — низкий приоритет**
      - [ ] Только если нужны фиксированные N слотов (например 12 месяцев); чаще хватает п.2 или п.3
      - Не начинать с циклов: дорого, раздувает JSON, плохо редактировать «строку 7»

    - **Рекомендуемый порядок (MVP)**
      1. Секции + дубль поля + пакет из шаблона
      2. `SUM` / сниппеты итогов
      3. Line items — отдельный эпик, если типичный кейс — смета на 20–50 позиций

    - Выбор по боли:
      - Долго «добавить поле» → п.1 (дубль, N из шаблона, секции)
      - Долго собирать «сумма всего» → п.2 (SUM, сниппеты)
      - На экране расчёта много одинаковых строк → п.3 (line items)
      - Одна формула в разных местах → п.4 (макросы / шаблон калькулятора)

  - **6. Текстовый / кодовый режим (параллельно с блоками)** — MVP сделан; дальше — п.7 (registry)
    - Контекст: логика в JSON (`CalculatorConfig`) как AST `BlockExpression`. Реализовано: `lib/formula/code/*`, script project (`lib/calculator/script/*`), `config-code-sheet`, `formula-code-modal`, CodeMirror 6. **Остаётся:** полная registry-driven синхронизация без дублирования → **п.7**.

    - **Принципы архитектуры**
      - [x] Единый источник правды — `CalculatorConfig` в JSON (в БД отдельного «code string» нет)
      - [x] Текстовый режим = представление + редактор; Apply → parse → AST; открытие → serialize
      - [ ] Блоки и код **всегда синхронны** при одновременном редактировании (есть live preview в sheet, нет dirty-badge при правке блоков)
      - [x] Невалидный код не ломает сохранённый конфиг до Apply; ошибки inline (CM6 `linter`)

    - **6.1. Выбор редактора (не писать свой с нуля)**
      - [x] Выбран **CodeMirror 6** (`@uiw/react-codemirror`, `@codemirror/*`) — `formula-code-editor.tsx`
      - [ ] Monaco — не используем (CM6 достаточно для MVP)
      - [ ] Dynamic import редактора (сейчас в основном bundle билдера)
      - [x] Тема редактора = light/dark из `next-themes` (`vscodeLight` / `vscodeDark`)

    - **6.2. Язык / DSL (формулы → код)**
      - [x] Текстовый синтаксис formula + script entities (`input` / `constant` / `calc` / `output`, `formula { return … }`)
        - Операнды: `field_item.qty`, `field_item.var_*`, `const_*`, `calc_*`, `output_*`
        - Операции: `+`, `-`, `*`, `/`, скобки, сравнения
        - Агрегаты: `SUM`, `COUNT`, `AVG`, `MIN`, `MAX`
        - Line items: `SUM_ROWS`, `AVG_ROWS`, … (`sum-rows.node.ts` и др.)
      - [x] `lib/formula/code/code-format.ts` + `formula-program.ts` (formula с `local` / `return`)
      - [x] `lib/formula/code/code-parse.ts` (recursive descent + `parseCodeCall`)
      - [x] Round-trip тесты: `tests/formula/code-roundtrip.test.ts`, `reference-code.test.ts`, `code-parse.test.ts`
      - [x] Multi-file вкладки: `config-code-sheet` (`inputs.calc`, `calculations.calc`, …)

    - **6.3. UI в конструкторе**
      - [x] Кнопка «Код» в шапке билдера → `ConfigCodeSheet` (`calculator-builder.tsx`)
      - [x] Полноэкранный resizable sheet (`config-code-sheet.tsx`)
      - [ ] Split view — слева блоки, справа код (v2)
      - [x] Modal на одну формулу — `</>` в `FormulaBuilder` → `formula-code-modal.tsx`
      - [x] Toolbar: Apply, Revert, Format, поиск, go-to-line (`code-editor-toolbar.tsx`)
      - [x] i18n `builder.codeMode*` / `codeEditor*` в `messages/*.json`

    - **6.4. Автодополнение (главное для «как VS Code»)**
      - [x] Completion из `config` — `formula-code-completions.ts`, `script-completions.ts`
      - [x] Ключевые слова и примитивы: `SUM`, `AVG`, `SUM_ROWS`, `IF`, …
      - [x] Панель сниппетов в sheet (`code-snippet-panel.tsx`)
      - [ ] Hover/docs с учётом `field-graph` (циклы зависимостей)
      - [x] Diagnostics: синтаксис, parse script/project, formula program (`formula-code-editor.tsx` linter)

    - **6.5. Двусторонняя синхронизация блоки ↔ код**
      - [x] При открытии sheet: `formatScriptProject(config)` → вкладки
      - [x] Apply: `parseScriptProject` → validate → `onApply(config)`
      - [x] Live preview при правке кода (`onPreviewConfig` + debounce в sheet)
      - [ ] Явная стратегия конфликтов / dirty при правке блоков с открытым sheet
      - [x] Auto-calculations: вкладка `auto-calculations.calc` read-only

    - **6.6. Расширение DSL (после MVP формул)**
      - [x] `IF(cond, then, else)` — `if.node.ts`
      - [x] Локальные переменные в `formula { local x = …; return … }` — `formula-program.ts`
      - [ ] **Макросы** — `@macro` / п.4
      - [ ] **Циклы** `FOR` — п.5 / п.7.6
      - [x] Весь конфиг текстом — script project + `parse-project.ts` / `format-project.ts`

    - **6.7. Тесты и качество**
      - [x] Unit: round-trip, completions, parse errors (`tests/formula/*`)
      - [ ] Integration: блоки ↔ код → одинаковый eval (частично через round-trip, без отдельного suite)
      - [ ] E2E: code mode → Apply → preview

    - **Рекомендуемый порядок (MVP code mode)**
      1. DSL + parse/format + тесты (только `calculations`/`outputs`, без inputs)
      2. Monaco/CM6 в modal на одну формулу + autocomplete по config
      3. Кнопка в шапке + sheet «все формулы»
      4. Sync dirty-state + diagnostics
      5. IF / макросы / полный конфиг-файл — по мере п.4–5 выше

    - **Зависимости (кандидаты в package.json)**
      - `@monaco-editor/react` + `monaco-editor` **или** `@uiw/react-codemirror` + `@codemirror/lang-*` + `@codemirror/autocomplete`
      - parser (если не hand-written): `chevrotain` / `nearley` (dev)

    - **Не делать на старте**
      - Хранить параллельно «code string» в JSON конфига
      - Полноценный TypeScript/JavaScript eval (`eval`, `new Function`) — только свой безопасный DSL
      - Синхронный realtime bidirectional без debounce/conflict UI (сложно и багоёмко)

    - **Связь с п.7:** §6 — первый шаг (код ↔ AST вручную). П.7 — целевая архитектура, где блоки, код, eval и палитра **не пишутся отдельно**, а генерируются из одного описания примитива.

  - **7. Универсальная система примитивов (Expression Registry) — single source of truth для платформы**
    - **Было:** новый конструкт требовал правок в 6–10 файлах. **Сейчас:** примитивы в `lib/formula/nodes/primitives/*.node.ts` + dispatch в `registry.ts`; остаются ручные места: `types/calculator.ts` (union AST), `block-tree.ts` / `block-tokens.ts`, React-brackets, `dependencies` per-node.
    - **Цель (частично достигнута):** один файл примитива → eval, code format/parse, palette, completions; без правок в 10 switch.

    - **Два уровня «истины»**
      - [x] **User data:** `CalculatorConfig` / AST в JSON в БД
      - [x] **Platform:** `lib/formula/nodes/*` + `lib/formula/README.md` (как добавить примитив)

    - **7.1. Контракт `FormulaNodeDefinition` / `FormulaPrimitiveDefinition`**
      - [x] `lib/formula/nodes/_definition.ts` — evaluate, formatCode, parseCodeCall, formatLabel, paletteItems, completions, doc
      - [x] `lib/formula/nodes/registry.ts` — `getAllFormulaPrimitives`, `getAllFormulaNodes`, structural `empty` / `group` / `operand`
      - [x] `primitives/index.ts` → `ALL_PRIMITIVES` (+ `_template.primitive.node.ts`)
      - [ ] Zod `schema` per node → `blockExpressionSchema` из реестра (поле `schema?` заготовлено, union в `types/calculator.ts` вручную)
      - [ ] `dependencies(node, config)` hook в registry → `field-graph` (сейчас `collect-dependencies.ts` обходит AST)

    - **7.2. Что собирается из реестра**
      - [ ] `blockExpressionSchema` — discriminated union из registry (или codegen)
      - [x] `evaluateBlockExpression` → `evaluateExpressionViaRegistry`
      - [x] `buildPaletteBlocks` → `mergePaletteItems` + `reference-operands.ts`
      - [x] `code-format` / `code-parse` — `formatExpressionViaRegistry`, `parseCodeCallViaRegistry`, infix из `ALL_PRIMITIVES`, refs в `reference-code.ts`
      - [x] `mergeNodeCompletions` + `generateDefaultCompletions`
      - [x] `field-graph` — `collectExpressionFieldRefs` (`collect-dependencies.ts`)
      - [ ] `block-tree` — slot schema в definition вместо switch по `type`

    - **7.3. Dynamic vs static примитивы**
      - [x] Static: `+`, `-`, `*`, `/`, сравнения, `SUM`…`MAX`, `SUM_ROWS`…, `IF` — `primitives/*.node.ts`
      - [x] Dynamic operands: `reference-operands.ts`, `reference-code.ts` (qty, property, constant, calc, output, lineColumn)
      - [x] Документировано в `lib/formula/README.md`

    - **7.4. UI workspace: generic vs custom**
      - [ ] Generic slot renderer по `slots[]` в definition
      - [x] Custom UX: `aggregate-bracket`, `row-aggregate-bracket`, conditional UI
      - [x] `palette-from-registry.ts` — создание AST из drag палитры
      - [ ] `block-tokens` / linear view из `flatten` hook в definition

    - **7.5. Парсер кода: registry-driven grammar**
      - [x] Фаза 1: recursive descent + `parseCodeCallViaRegistry` + infix precedence из registry
      - [ ] Фаза 2: Chevrotain / Lezer grammar из registry
      - [x] Round-trip: `tests/formula/code-roundtrip.test.ts` (primitives + row aggregates), `registry.test.ts`, `primitives-eval.test.ts`, `if.test.ts`

    - **7.6. Целевой DX новых примитивов**
      - [x] `IF` — `primitives/if.node.ts` (eval + code + blocks + docs)
      - [ ] `FOR` / fixed-range — `for-range.node.ts`
      - [ ] `ROUND` — `round.node.ts`
      - [x] Гайд разработчику: `lib/formula/README.md` + `_template.primitive.node.ts` (вместо `docs/formula-nodes.md`)

    - **7.7. Миграция (incremental)**
      - [x] **Шаг 1:** registry + `evaluateExpressionViaRegistry`
      - [x] **Шаг 2:** primitives в отдельных файлах; structural `group` / `operand` / `empty`
      - [x] **Шаг 3:** palette + `formatExpressionLabelViaRegistry` + reference operands
      - [x] **Шаг 4:** code format/parse через registry (infix + `parseCodeCall` на всех primitives)
      - [ ] **Шаг 5:** generic workspace; убрать switch в `block-tree` / `block-tokens`
      - [x] **Шаг 6 (частично):** `IF` через node file; `FOR` / `ROUND` — [ ]

    - **7.8. Codegen (опционально)**
      - [ ] `npm run formula:codegen` → generated union / type guards
      - [ ] Runtime `z.discriminatedUnion` из registry

    - **7.9. Тесты и CI**
      - [x] Unit: `registry.test.ts`, `code-roundtrip.test.ts`, `code-parse.test.ts`, `primitives-eval.test.ts`, `generate-completions.test.ts`
      - [ ] Integration fixture: blocks ≡ code ≡ eval
      - [ ] CI lint: запрет `switch (expr.type)` вне registry

    - **7.10. i18n и docs (разработчик / §9)**
      - [x] `doc.example` в primitive + `messages/docs.primitives.*`
      - [x] `?` в палитре → `/docs#{id}` (`block-palette-content.tsx`)
      - [ ] Единые `labelKey` / hover `docKey` в code editor из definition
      - [x] Пользовательская `/docs` — см. **§9**

    - **Рекомендуемый порядок (обновлён)**
      1. [x] §6 MVP code/script stable
      2. [x] §7.7 шаги 1–4
      3. [ ] §7.7 шаг 5 — generic `block-tree`
      4. [ ] `FOR` / `ROUND` через registry (§7.6)
      5. [ ] Codegen §7.8 — при необходимости

    - **Структура (фактическая)**
      ```
      lib/formula/nodes/registry.ts
      lib/formula/nodes/primitives/*.node.ts
      lib/formula/nodes/{empty,group,operand}.node.ts
      lib/formula/nodes/reference-{operands,code}.ts
      lib/formula/code/{code-format,code-parse}.ts
      lib/formula/blocks/{block-palette,palette-from-registry,block-tree}.ts
      ```

    - **Статус (2026-05):** registry MVP готов (eval, palette, code, completions, IF, docs). Дальше: generic block-tree, `FOR`/`ROUND`, schema/codegen, persist script bundle (§8).

  - **8. Calculator Script — один файл на весь калькулятор (как class/script)**
    - **Идея:** `input` ≈ class с полями в `{ }`; `property` ≈ переменная со значением; `calc`/`output` ≈ методы с телом-формулой. Один скрипт → `CalculatorConfig` → блоки + preview автоматически.
    - **Синтаксис MVP (реализовано format/parse):**
      ```calc
      input field_item {
        label = "Item"
        property var_cost { label = "Cost"; value = 0 }
        property var_price { label = "Price"; value = 0 }
        quantity default 0
        presets = 1, 2, 3
      }
      constant const_factor { label = "Factor"; value = 1.2 }
      calc calc_subtotal {
        label = "Subtotal"
        formula { return field_item.qty * field_item.var_cost }
      }
      output output_total {
        label = "Total"
        highlight = true
        formula { return calc_subtotal * const_factor }
      }
      ```
      Legacy one-line синтаксис (`input id "Label" { ... }`, `calc id = expr`) тоже парсится.
    - **Не OOP-бoilerplate:** без `class`/`super` — keyword + block (как HCL, Kotlin DSL, упрощённый Python).

    - **8.1. Schema registry (сущности = отдельные entity-файлы от pattern)**
      - [x] `ConfigEntityDefinition` — `lib/calculator/schema/_definition.ts`
      - [x] Pattern: `schema/patterns/block-body.ts`
      - [x] Entities: `input`, `constant`, `calculation`, `output` в `schema/entities/*.entity.ts`
      - [x] `schema/registry.ts` — match header + dispatch parse/format
      - [x] Новая сущность = файл + `register()` (шаблон `_template.entity.ts`)

    - **8.2. Script pipeline**
      - [x] `script/format.ts`, `script/parse.ts`, `format-project.ts`, `parse-project.ts`
      - [x] UI: «Код» в билдере → `ConfigCodeSheet` (multi-file tabs)
      - [x] Round-trip: `tests/script/*` (`roundtrip`, `merge-declarations`, `includes`, `id-rename`, …)
      - [ ] Column в ошибках парсера (сейчас file + line, без column)

    - **8.3. Три слоя одной правды**
      - **Platform:** `formula/nodes/*` (SUM, +, …) + `schema/entities/*` (input, calc, …)
      - **User data:** `CalculatorConfig` JSON в БД
      - **Views:** блоки | formula code | full script — всё из JSON, не три копии

    - **8.4. Дальше**
      - [x] Palette через registry (`mergePaletteItems`, `palette-from-registry.ts` для drag→AST)
      - [ ] `block-tree` полностью registry-driven (слоты всё ещё в `block-tree.ts`)
      - [x] `IF` в script/formula; `FOR` в script — [ ]
      - [x] `#use "template"` — пресет `print-shop-basic` (`resolve-use.ts`, `tests/script/resolve-use.test.ts`)
      - [x] `docs/calculator-script.md`

    - **8.5. Multi-file script (несколько файлов вместо одного монолита)**
      - **Идея:** как в проекте с `.ts` / `.py` — логика разбита по файлам по смыслу; при Apply собирается один `CalculatorConfig`. В БД по-прежнему один config (или JSON bundle `{ files: Record<string, string> }` — решить на этапе реализации).
      - **Целевая структура (пример):**
        ```
        calculator/
          inputs.calc       # только input { … }
          constants.calc    # constant …
          calculations.calc # calc …
          outputs.calc      # output …
          main.calc         # опционально: #include + meta (name, version)
        ```
      - **Конвенции имён (MVP):**
        - `inputs.calc` / `*.inputs.calc` — только `input`
        - `constants.calc` — только `constant`
        - `calculations.calc` — только `calc`
        - `outputs.calc` — только `output`
        - Либо один `main.calc` с `#include "inputs.calc"` (порядок = порядок merge)
      - **Include / import:**
        - [x] `#include "inputs.calc"` — merge declarations из included файлов (каждый файл один раз)
        - [x] `#use "platform/templates/print-shop"` — готовый пресет (п.8.4), read-only фрагмент
        - [x] Циклы include запрещены; лимит глубины
      - **Parser / compiler pipeline:**
        - [x] `script/parse-source.ts`, `script/parse-file.ts` — один файл → declarations
        - [x] `script/parse-project.ts` — список файлов → merge → `CalculatorConfig`
        - [x] Порядок merge: inputs → constants → calcs → outputs; дубликаты id = ошибка с указанием файла
        - [x] Cross-file refs: calc в `outputs.calc` может ссылаться на input из `inputs.calc` (после merge)
      - **Format (config → files):**
        - [x] `script/format-project.ts` — split по kind в named files
        - [ ] Опция «Export as project» / «Single file» в UI
      - **UI в конструкторе:**
        - [x] Code sheet → **tabs** (Inputs | Constants | Auto-calcs | Calculations | Outputs)
        - [x] Apply валидирует весь project (`parseScriptProject` в `config-code-sheet`)
        - [x] Live preview при правке (`onPreviewConfig`)
        - [ ] Dirty-state per file / conflict badge
        - [x] Ошибки lint: `inputs.calc:12` — file + line (`formula-code-editor` linter)
        - [ ] Sync: правка blocks → перегенерация только затронутого `.calc` файла
      - **Хранение:**
        - [x] v1: виртуальные файлы только в UI (split/join in memory из одного monolith при открытии)
        - [ ] v2: `Calculator.scriptFiles` JSON в config или отдельное поле в БД
        - [ ] v3: git-like diff / версии (не MVP)
      - **Autocomplete:**
        - [x] Symbols из **всех** файлов project после virtual merge (inputs видны в calculations tab)
      - **Тесты:**
        - [x] Fixture project 4 files → parse → same config as monolith
        - [x] Id rename propagation (field_item → pos)
        - [x] Include цикл / duplicate id / unknown include path

    - **Порядок §8**
      1. [x] Monolith script MVP
      2. [x] Multi-file virtual split в UI (v1 — без смены БД)
      3. [x] `#include` + parse-project
      4. [ ] Persist script bundle в config/БД

    - **Структура папок**
      ```
      lib/formula/nodes/           # узлы формул (eval, formatCode, completions)
      lib/calculator/schema/
        patterns/block-body.ts     # общий разбор { }
        entities/*.entity.ts       # input, constant, calc, output
        registry.ts
      lib/calculator/script/       # format, parse, format-project, parse-project
      ```

  - **9. Документация для пользователей (справочник формул и кода)**
    - **Цель:** справочник блоков/кода из registry без дублирования в 10 местах.
    - **Статус (2026-05):** MVP **готов** — `/docs`, autogen из registry, UK/EN, ссылки из билдера и палитры.

    - **9.1. Источник правды**
      - [x] `lib/formula/docs/collect-formula-docs.ts` — primitives + script entities
      - [x] `messages/*/docs.primitives|operands|script.*` (i18n)
      - [x] `doc.example` override в primitive definition
      - [x] Тест полноты i18n: `tests/docs/i18n-completeness.test.ts` (en + uk)
      - [x] `tests/docs/collect-formula-docs.test.ts`, `palette-doc-id.test.ts`

    - **9.2. Страница `/docs`**
      - [x] `app/[locale]/docs/page.tsx` + `formula-docs-view.tsx`
      - [x] Вкладки: формулы/блоки | скрипт калькулятора
      - [x] Категории, поиск по title/syntax/example
      - [x] «Довідка» / Help в шапке (`docs-help-link.tsx`)
      - [x] `?` рядом с «Код» в билдере
      - [x] Deep link `/docs#{id}`

    - **9.3. Библиотеки**
      - [x] **react-markdown** + **remark-gfm**
      - [ ] Fumadocs / Nextra (v2, если нужен полноценный docs-site)
      - [x] `FormulaCodeSnippet` — подсветка примеров

    - **9.4. Расширение**
      - [x] «?» в палитре → `/docs#{id}` (`palette-doc-id`, `block-palette-content.tsx`)
      - [x] `npm run docs:build` → `scripts/build-formula-docs.ts`
      - [ ] Ручные гайды (MDX): «Перший калькулятор», «Line items», «Code mode»

    - **Порядок §9**
      1. [x] collect + `/docs` MVP
      2. [x] i18n completeness test + ссылки из builder/header/palette
      3. [x] Syntax highlight + doc ids
      4. [ ] MDX tutorials

