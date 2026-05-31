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
      - [ ] Именованные макросы формул в конфиге (переиспользование)
      - [ ] Пресеты целого калькулятора (типография, салон, …)
      - [ ] Простые функции в DSL: `ROUND`, `IF`, `MAX` (без полноценного языка)

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
    - Контекст: логика в JSON (`CalculatorConfig`) как AST `BlockExpression`. MVP: `code-format` / `code-parse`, modal + sheet, CodeMirror, autocomplete. **Проблема:** блоки и код всё ещё описаны в разных файлах → см. **п.7**.

    - **Принципы архитектуры**
      - [ ] Единый источник правды — по-прежнему `CalculatorConfig` в JSON (в БД ничего второго не храним)
      - [ ] Текстовый режим = **представление + редактор**; при «Применить» парсим в AST, при открытии — сериализуем из AST
      - [ ] Блоки и код **всегда синхронны**: изменение в одном месте обновляет другое (или явный diff при конфликте)
      - [ ] Невалидный код **не ломает** сохранённый конфиг до успешного Apply; показывать ошибки парсера/валидатора inline

    - **6.1. Выбор редактора (не писать свой с нуля)**
      - [ ] Оценить и выбрать библиотеку:
        - **Monaco** (`@monaco-editor/react`) — максимально близко к VS Code: подсветка, autocomplete API, diagnostics, themes; тяжелее по bundle (~2–3 MB, lazy load обязателен)
        - **CodeMirror 6** (`@uiw/react-codemirror` или `@codemirror/view`) — легче, хорош на мобилках; кастомный language + `autocompletion` через `@codemirror/autocomplete`
      - [ ] Решение: Monaco для desktop-first «как VS Code» **или** CM6 если критичен вес; в обоих случаях — **dynamic import**, открытие в sheet/modal/отдельной панели
      - [ ] Тема редактора = light/dark из `next-themes`

    - **6.2. Язык / DSL (формулы → код)**
      - [ ] Спроектировать **текстовый синтаксис**, 1:1 с текущим AST (MVP):
        - Операнды: `field_item.qty`, `field_item.var_cost`, `const_factor`, `calc_subtotal`, `output_total`, числа
        - Операции: `+`, `-`, `*`, `/`, скобки
        - Агрегаты: `SUM(...)`, `COUNT`, `AVG`, `MIN`, `MAX`
        - Line items: `SUM_ROWS(field_lines, row => row.qty * row.var_cost)` (или синтаксис ближе к `rowAggregate`)
      - [ ] `lib/formula/code-format.ts` — AST → текст (расширить/заменить `formatBlockExpression` для machine-readable id, не только labels)
      - [ ] `lib/formula/code-parse.ts` — текст → AST (parser: **Chevrotain** / **nearley** / hand-written recursive descent для узкого DSL)
      - [ ] Round-trip тесты: `parse(format(expr)) ≈ expr` для всех типов узлов
      - [ ] Отдельные «файлы»/вкладки в UI: по одной формуле (`calculation` / `output`) или один документ на весь калькулятор (решить на MVP)

    - **6.3. UI в конструкторе**
      - [ ] Кнопка в шапке билдера: «Код» / «Raw» (рядом с сохранением) → открывает редактор
      - [ ] Вариант A: **полноэкранный sheet** (как палитра блоков, resizable)
      - [ ] Вариант B: **split view** — слева блоки, справа код (desktop)
      - [ ] Вариант C: modal по одной формуле (кнопка «</>» у каждого `FormulaBuilder`)
      - [ ] MVP: sheet на весь конфиг **или** modal на активную формулу; split — v2
      - [ ] Toolbar: Apply, Revert, Copy, Format document, подсветка ошибок по строкам
      - [ ] i18n (`builder.codeMode*`, `builder.codeApply`, …)

    - **6.4. Автодополнение (главное для «как VS Code»)**
      - [ ] Completion provider из текущего `config`:
        - `inputs[].id`, `properties[].id`, `constants`, `calculations`, `outputs`
        - ключевые слова: `SUM`, `AVG`, `SUM_ROWS`, …
        - сниппеты: шаблон агрегата, строка line item
      - [ ] Hover/docs: label поля, тип (qty/property/constant), недоступные из-за цикла зависимостей (`field-graph`)
      - [ ] Diagnostics: неизвестный id, цикл, деление на 0 (static), синтаксическая ошибка
      - [ ] Для Monaco: `registerCompletionItemProvider` + `setModelMarkers`; для CM6: `linter` + `autocompletion`

    - **6.5. Двусторонняя синхронизация блоки ↔ код**
      - [ ] При открытии code mode: сериализация текущего `config` (или активной формулы)
      - [ ] Apply: parse → validate (`calculatorConfigSchema` + `field-graph`) → `setConfig`
      - [ ] При правке блоков при **открытом** code panel: debounce re-serialize или badge «есть несохранённые изменения в коде»
      - [ ] Стратегия конфликтов: last-writer-wins с предупреждением **или** блок Apply пока dirty
      - [ ] Auto-calculations (`isAutoCalculationId`): в коде read-only секция или пропуск (не редактировать вручную)

    - **6.6. Расширение DSL (после MVP формул)**
      - [ ] **Условия** `IF(cond, then, else)` → новый узел AST или desugar в существующий (согласовать с п.4 «IF в DSL»)
      - [ ] **Переменные / промежуточные** — по сути `calculations[]`; в коде `let x = ...` или секция `@calculations`
      - [ ] **Макросы** — именованные фрагменты (п.4); в коде `@macro name(...) { ... }`
      - [ ] **Циклы** — только осознанно: fixed-range `FOR i IN 1..12` → развёртка в AST при compile (не хранить runtime loop в JSON); альтернатива — line items вместо циклов
      - [ ] **Весь конфиг текстом** (advanced): декларации `@input`, `@constant`, `@output` — один `.calc` файл; парсится в полный `CalculatorConfig` (отдельный эпик, после стабильного formula-DSL)

    - **6.7. Тесты и качество**
      - [ ] Unit: parse/format round-trip, autocomplete symbols, invalid syntax
      - [ ] Integration: правка в блоках → тот же результат eval, что и после parse кода
      - [ ] E2E (опционально): открыть code mode, ввести формулу, Apply, preview совпадает

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
    - **Проблема сейчас:** один новый конструкт (например `FOR`, `IF`, новый агрегат) требует правок в **6–10 местах**:
      - `types/calculator.ts` — Zod + TS union `BlockExpression`
      - `block-evaluate.ts` — runtime eval
      - `block-palette.ts` — блоки палитры
      - `block-tree.ts` / `block-tokens.ts` — DnD, слоты, linear workspace
      - `block-format.ts` / `block-format-values.ts` — подписи для UI
      - `code-format.ts` / `code-parse.ts` — текстовый DSL
      - `formula-code-completions.ts` — автодополнение
      - `field-graph.ts` — зависимости / циклы
      - React: `aggregate-bracket.tsx`, `row-aggregate-bracket.tsx`, …
    - **Цель:** разработчик добавляет **один файл** по паттерну → автоматически появляются: AST-тип, eval, UI-блок(и), сериализация в код, парсинг из кода, completions, валидация, i18n-ключи (опционально).

    - **Два уровня «истины» (не путать)**
      - **Данные пользователя:** `CalculatorConfig` / AST в JSON (что сохраняем в БД) — не меняется
      - **Платформа:** **реестр примитивов** (`lib/formula/nodes/*.ts`) — описание *всех* допустимых узлов и операций; из него генерируется всё остальное

    - **7.1. Контракт `FormulaNodeDefinition` (один файл = один примитив или семейство)**
      - [ ] Базовый интерфейс, пример `lib/formula/nodes/_definition.ts`:
        - `id` — уникальный ключ (`operation`, `aggregate`, `rowAggregate`, `if`, `for`, …)
        - `schema` — Zod-схема payload узла (валидация AST + migrate)
        - `evaluate(node, ctx)` — вычисление
        - `dependencies(node, config)` — для `field-graph` (циклы, недоступные ссылки)
        - **Code surface:** `formatCode(node, ctx)` + вклад в парсер (`parsePrefix` / grammar rule)
        - **UI surface:** `paletteItems(config, target)` → блоки палитры; `workspaceKind` + `WorkspaceComponent` или generic slot schema
        - **Display:** `formatLabel(node, config, target)` — человекочитаемый preview
        - `completions(config, target)` — подсказки для code mode
        - `meta`: категория палитры, цвет, tab (VARIABLES / ACTIONS), i18n key prefix
      - [ ] Реестр: `lib/formula/node-registry.ts` — `registerNode(def)` + `getAllNodes()` + typed union AST **выводится** из реестра (или codegen)

    - **7.2. Что генерируется / собирается из реестра (не дублировать руками)**
      - [ ] `blockExpressionSchema` — discriminated union из `schema` всех nodes
      - [ ] `evaluateBlockExpression` — dispatch по `node.type` → `registry.get(type).evaluate`
      - [x] `buildPaletteBlocks` — flatMap `paletteItems` по всем nodes + **dynamic operands** (`reference-operands.ts`)
      - [ ] `code-format` / `code-parse` — единый pipeline: операторы из registry + dynamic refs (`.qty`, `const_*`) — format [x], parse refs + `parseCodeCall` для aggregate/rowAggregate [~]
      - [x] `formula-code-completions` — merge `completions` всех nodes + symbols из config
      - [x] `field-graph` — merge `dependencies` (`collect-dependencies.ts`)
      - [ ] `block-tree` slot paths — **slot schema** в definition (`slots: [{ name, accepts, multiple }]`) вместо switch по type

    - **7.3. Dynamic vs static примитивы**
      - **Static (файл в `nodes/`):** `+`, `SUM`, `IF`, `FOR`, `( )`, … — логика платформы
      - **Dynamic (генерируются из config, не отдельный файл):** operand `quantity`, `property`, `constant`, `calculation`, `output`, `lineColumn` — один definition `reference-operand.ts` с фабрикой `buildReferenceOperands(config)`
      - [ ] Чётко разделить: registry = *типы узлов*; config = *экземпляры ссылок*

    - **7.4. UI workspace: generic vs custom**
      - [ ] **Generic slot renderer** — для узлов со `slots[]` (бинарные ops, n-ary aggregate) — один компонент
      - [ ] **Custom workspace** — только где нужен особый UX (row aggregate inner `row.*`, будущий `FOR` с телом)
      - [ ] `block-tokens` / linear view — генерировать из `flatten(node)` hook в definition (default recursive)

    - **7.5. Парсер кода: registry-driven grammar**
      - [ ] Фаза 1 (как сейчас): общий recursive descent + `resolveReference`; nodes регистрируют только `formatCode` + keyword (`SUM`, `IF`)
      - [ ] Фаза 2: **Chevrotain / Lezer grammar**, правила собираются из registry (`codeSyntax: { keyword, argCount, infix? }`)
      - [ ] Round-trip тест на **каждый** node file: `parse(format(sample))` + eval sample fixtures

    - **7.6. Пример: добавить `FOR` (целевой DX)**
      - [ ] Создать `lib/formula/nodes/for-range.ts`:
        ```ts
        // псевдо: FOR i IN 1..12 DO expr  →  compile-time unroll или runtime loop node
        export const forRangeNode: FormulaNodeDefinition = { id: 'forRange', schema, evaluate, formatCode, parseRule, paletteItems, ... }
        ```
      - [ ] `registerNode(forRangeNode)` — без правок в 10 файлах
      - [ ] Документ «Adding a node» в `docs/formula-nodes.md` (чеклист + шаблон файла)

    - **7.7. Миграция с текущего кода (incremental, без big bang)**
      - [x] **Шаг 1:** registry + dispatch в `evaluate` (wrapper над существующим `block-evaluate`)
      - [x] **Шаг 2:** вынести `operation`, `group`, `operand`, `aggregate`, `rowAggregate` в `nodes/*.ts`
      - [x] **Шаг 3:** palette + formatLabel через registry (`mergePaletteItems`, `formatExpressionLabelViaRegistry`, `reference-operands.ts`)
      - [ ] **Шаг 4:** code format/parse через registry hooks — `formatCode` [x], `parseCodeReference` [x], `parseCodeCall` для aggregate/rowAggregate [x]; operation/group/operand inline [ ]
      - [ ] **Шаг 5:** generic workspace slots; удалить дублирующие switch в `block-tree`
      - [ ] **Шаг 6:** новые фичи (`IF`, `FOR`, `ROUND`) — **только** через новые node files

    - **7.8. Codegen (опционально, если TS union раздувается)**
      - [ ] Скрипт `npm run formula:codegen` → `types/calculator.generated.ts` (union AST, type guards)
      - [ ] Или: Zod `z.discriminatedUnion` из registry в runtime без codegen — проще для MVP registry

    - **7.9. Тесты и CI**
      - [ ] На каждый node: unit eval, format/parse round-trip, palette snapshot (optional)
      - [ ] Integration: один калькулятор fixture — blocks ≡ code ≡ eval result
      - [ ] Lint rule / CI check: запрет `switch (expr.type)` вне registry dispatch (eslint custom rule или grep in CI)

    - **7.10. i18n и docs**
      - [ ] Labels палитры: `builder.node.{id}.*` или `labelKey` в definition
      - [ ] Hover в code mode: `docKey` / `detail` из definition
      - [x] **Пользовательская документация** — `/docs`, автогенерация из registry → см. **§9**

    - **Рекомендуемый порядок**
      1. Завершить MVP §6 (код ↔ AST стабилен)
      2. §7.1 + §7.7 шаг 1–2 (registry + evaluate dispatch)
      3. §7.7 шаг 3–4 (palette + code через registry)
      4. Generic workspace (§7.4) — уменьшить `block-tree`
      5. Первый новый примитив через registry: **`IF`** (проще `FOR`)
      6. **`FOR`** / fixed-range через registry (§7.6)
      7. Codegen (§7.8) — только если union станет неудобен

    - **Anti-patterns (не делать)**
      - Два источника правды: отдельные enum для блоков и для кода
      - Копировать логику eval в code mode (только AST → один eval)
      - Добавлять node только в UI без schema + eval + code surface

    - **Структура папок (целевая)**
      ```
      lib/formula/
        node-registry.ts
        nodes/
          _definition.ts      # тип FormulaNodeDefinition
          operation.ts
          group.ts
          operand-reference.ts
          aggregate.ts
          row-aggregate.ts
          if.ts               # будущее
          for-range.ts        # будущее
        codegen/              # опционально
        code/                 # единый format/parse pipeline (registry-aware)
      ```

    - **Статус (2025):** шаги 7.7.1–3 сделаны → registry, eval/format/completions, palette/formatLabel. §8 monolith + §8.5 multi-file v1 + structured block DSL + id rename on Apply + `#include`. Дальше — 7.7.4 (parseCodeCall hooks), 7.7.5 generic workspace, persist script bundle.

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
      - [x] `script/format.ts`, `script/parse.ts`
      - [x] UI: «Код» в билдере → полный скрипт в sheet
      - [x] Round-trip тесты (`npm run test:script`); column в ошибках — [ ]

    - **8.3. Три слоя одной правды**
      - **Platform:** `formula/nodes/*` (SUM, +, …) + `schema/entities/*` (input, calc, …)
      - **User data:** `CalculatorConfig` JSON в БД
      - **Views:** блоки | formula code | full script — всё из JSON, не три копии

    - **8.4. Дальше**
      - [x] Palette/block-tree через formula registry (п.7 шаг 3) — palette [x], block-tree generic [x] (`palette-from-registry.ts`)
      - [x] `IF` — `nodes/if.node.ts` + `IF(cond, then, else)` в formula code і blocks UI; `FOR` — [ ] (planned)
      - [x] `#use "template"` — пресет `print-shop-basic` (+ alias `platform/templates/print-shop`)
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
        - [x] Code sheet → **tabs** (Inputs | Constants | Calculations | Outputs)
        - [ ] Dirty per file; Apply валидирует весь project
        - [x] Ошибки lint: `inputs.calc:12` — file + line
        - [ ] Sync: правка blocks → перегенерация только затронутого файла (или всего project v1)
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
    - **Цель:** отдельная страница «как работает каждый блок / каждая конструкция кода»; контент **генерируется из registry**, не дублируется вручную в 10 местах.
    - **Статус (2025):** MVP — `/docs`, `collectFormulaDocs()` из `ALL_PRIMITIVES` + script entities; UI: `react-markdown` + remark-gfm; i18n UK/EN.

    - **9.1. Источник правды**
      - [x] `lib/formula/docs/collect-formula-docs.ts` — syntax/example из primitives + `getAllConfigEntities()`
      - [x] Описания — `messages/*/docs.primitives.{id}.*` (i18n)
      - [x] Опционально: поле `doc` в primitive + `doc.example` override
      - [x] CI: проверка i18n en + uk (`tests/docs/i18n-completeness.test.ts`, GitHub Actions)

    - **9.2. Страница `/docs`**
      - [x] Вкладки: **Формулы и блоки** | **Скрипт калькулятора**
      - [x] Категории: операторы, агрегаты, row aggregates, операнды, script keywords
      - [x] Поиск по названию / синтаксису / примеру
      - [x] Ссылка «Довідка» / «Help» в шапке
      - [x] Ссылка из билдера (иконка ? рядом с «Код»)
      - [x] Deep link `/docs#sum` — прокрутка к блоку

    - **9.3. Библиотеки (не писать с нуля)**
      - [x] **react-markdown** + **remark-gfm** — intro и будущие guide-страницы
      - [ ] Опционально v2: **Fumadocs** / **Nextra** если нужен полноценный docs-сайт с sidebar
      - [x] Подсветка кода: `FormulaCodeSnippet` (лёгкий highlighter, MVP)

    - **9.4. Расширение**
      - [x] «?» в палитре блоков → `/docs#{id}` + tooltip из i18n
      - [x] Экспорт статики `npm run docs:build` → `docs/generated/`
      - [ ] Гайды (не autogen): «Перший калькулятор», «Line items», «Code mode» — MDX-страницы

    - **Порядок §9**
      1. [x] collect + `/docs` MVP
      2. [x] CI i18n completeness + link from builder
      3. [x] Tooltips из registry + syntax highlight
      4. [ ] MDX guides (ручные туториалы)

