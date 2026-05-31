import fs from "fs";

const guide = JSON.parse(
  fs.readFileSync("lib/formula/docs/guide-sections.json", "utf8"),
);

const primitivesCodeUsage = {
  plus: {
    en: "Write `a + b` with field references, e.g. `field_item.qty + 1`.",
    uk: "Пишіть `a + b`, напр. `field_item.qty + 1`.",
  },
  minus: {
    en: "Write `a - b`, e.g. `field_item.var_price - field_item.var_cost`.",
    uk: "Пишіть `a - b`, напр. `field_item.var_price - field_item.var_cost`.",
  },
  multiply: {
    en: "Write `a * b` — the usual qty × price pattern.",
    uk: "Пишіть `a * b` — типово qty × ціна.",
  },
  divide: {
    en: "Write `a / b`. Parentheses group sub-expressions: `(a + b) / c`.",
    uk: "Пишіть `a / b`. Дужки: `(a + b) / c`.",
  },
  gt: {
    en: "Use in `IF(field_item.qty > 10, …)` — result is 1 or 0.",
    uk: "У `IF(field_item.qty > 10, …)` — результат 1 або 0.",
  },
  lt: {
    en: "Use `a < b` inside `IF` or compare calc outputs.",
    uk: "`a < b` у `IF` або порівняння calc.",
  },
  gte: {
    en: "Type `>=` in code (not a single Unicode char).",
    uk: "У коді саме `>=`.",
  },
  lte: {
    en: "Type `<=` in code.",
    uk: "У коді `<=`.",
  },
  eq: {
    en: "Type `==` for equality tests.",
    uk: "У коді `==`.",
  },
  neq: {
    en: "Type `!=` for inequality.",
    uk: "У коді `!=`.",
  },
  sum: {
    en: "`SUM(a, b, c)` — comma-separated; nest calls: `SUM(a, SUM(b, c))`.",
    uk: "`SUM(a, b, c)` через кому; вкладені виклики дозволені.",
  },
  count: {
    en: "`COUNT(a, b, …)` counts how many arguments you pass.",
    uk: "`COUNT(a, b, …)` — кількість аргументів.",
  },
  avg: {
    en: "`AVG(a, b, c)` — arithmetic mean.",
    uk: "`AVG(a, b, c)` — середнє.",
  },
  min: {
    en: "`MIN(a, b, …)` — smallest argument value.",
    uk: "`MIN(a, b, …)` — мінімум.",
  },
  max: {
    en: "`MAX(a, b, …)` — largest argument value.",
    uk: "`MAX(a, b, …)` — максимум.",
  },
  "sum-rows": {
    en: "`SUM_ROWS(field_lines, row.qty * row.var_cost)` — `row.*` only inside the second argument.",
    uk: "`SUM_ROWS(field_lines, row.qty * row.var_cost)` — `row.*` лише в другому аргументі.",
  },
  "count-rows": {
    en: "`COUNT_ROWS(table_id, row.qty)` — per-row expression.",
    uk: "`COUNT_ROWS(table_id, row.qty)` — вираз по рядку.",
  },
  "avg-rows": {
    en: "`AVG_ROWS(table_id, row.var_price)` averages over rows.",
    uk: "`AVG_ROWS(table_id, row.var_price)` — середнє по рядках.",
  },
  "min-rows": {
    en: "`MIN_ROWS(table_id, row.var_cost)`.",
    uk: "`MIN_ROWS(table_id, row.var_cost)`.",
  },
  "max-rows": {
    en: "`MAX_ROWS(table_id, row.var_price)`.",
    uk: "`MAX_ROWS(table_id, row.var_price)`.",
  },
  if: {
    en: "`IF(condition, thenValue, elseValue)` — condition true when ≠ 0. Example: `IF(field_item.qty >= 10, price * 0.9, price)`.",
    uk: "`IF(умова, так, ні)` — умова істинна, якщо ≠ 0.",
  },
  round: {
    en: "`ROUND(value, decimals)` — e.g. `ROUND(calc_subtotal, 2)`.",
    uk: "`ROUND(значення, знаки)` — напр. `ROUND(calc_subtotal, 2)`.",
  },
};

const operandsCodeUsage = {
  quantity: {
    en: "Reference as `field_item.qty` in any formula.",
    uk: "Посилання `field_item.qty`.",
  },
  property: {
    en: "Reference as `field_item.var_cost` (property id after the dot).",
    uk: "`field_item.var_cost` (id властивості після крапки).",
  },
  constant: {
    en: "Use the constant id alone: `const_markup`.",
    uk: "Id константи: `const_markup`.",
  },
  macro: {
    en: "Use macro id alone: `macro_sheet_cost` (defined in macros.calc).",
    uk: "Id макроса: `macro_sheet_cost`.",
  },
  calculation: {
    en: "Use calc id: `calc_subtotal` (must be declared above in dependency order).",
    uk: "Id calc: `calc_subtotal` (має бути вище за залежностями).",
  },
  "row-property": {
    en: "Only inside `SUM_ROWS(…, …)`: `row.var_cost`, `row.qty`.",
    uk: "Лише в `SUM_ROWS`: `row.var_cost`, `row.qty`.",
  },
};

const scriptMeta = {
  en: {
    macro: {
      title: "macro",
      description:
        "Reusable formula fragment; referenced by id in other formulas.",
      codeUsage:
        "Declare once in `macros.calc`, use as `macro_sheet_cost` elsewhere.",
      blockUsage:
        "Define the macro body with blocks in the Macros section; drag the macro chip into any formula.",
    },
    input: {
      codeUsage:
        "Declare fields the user fills. Properties become `field_id.var_*`.",
      blockUsage:
        "Add inputs in the builder sidebar; they appear in the block palette under each field.",
    },
    constant: {
      codeUsage: "Fixed value; reference as `const_id` in formulas.",
      blockUsage: "Constants section → drag into formulas.",
    },
    calc: {
      codeUsage: "Intermediate formula; reference as `calc_id`.",
      blockUsage:
        "Calculation fields section → open formula → blocks or code.",
    },
    output: {
      codeUsage: "Shown after Calculate; `formula { return … }` body.",
      blockUsage:
        "Result fields section → formula defines what the user sees.",
    },
  },
  uk: {
    macro: {
      title: "macro",
      description: "Повторюваний фрагмент формули; посилання за id.",
      codeUsage: "Оголошення в `macros.calc`, використання `macro_sheet_cost`.",
      blockUsage:
        "Тіло макроса — блоки в розділі Макроси; чіп макроса — у будь-яку формулу.",
    },
    input: {
      codeUsage: "Поля вводу; властивості — `field_id.var_*`.",
      blockUsage: "Розділ полів вводу; у палитрі — група поля.",
    },
    constant: {
      codeUsage: "Фіксоване значення; `const_id` у формулах.",
      blockUsage: "Розділ констант → перетягнути у формулу.",
    },
    calc: {
      codeUsage: "Проміжна формула; `calc_id`.",
      blockUsage: "Розрахунки → формула блоками або кодом.",
    },
    output: {
      codeUsage: "Показується після Розрахувати; `formula { return … }`.",
      blockUsage: "Результати → формула визначає підсумок.",
    },
  },
};

for (const loc of ["en", "uk"]) {
  const m = JSON.parse(fs.readFileSync(`messages/${loc}.json`, "utf8"));
  m.docs.pageDescription =
    loc === "en"
      ? "Beginner guide, block editor, formula code, and full calculator script. Reference cards are generated from the formula registry."
      : "Посібник для новачків, блоки, код формул і повний скрипт. Картки довідника генеруються з registry.";
  m.docs.tabGuide = loc === "en" ? "Getting started" : "З чого почати";
  m.docs.introShort =
    loc === "en"
      ? "Reference cards for every operator and function. Use **Getting started** for a full walkthrough, or search below."
      : "Картки операторів і функцій. Вкладка **З чого почати** — повний посібник; нижче — пошук.";
  m.docs.codeUsageLabel =
    loc === "en" ? "In code / formula text" : "У коді / тексті формули";
  m.docs.intro =
    loc === "en"
      ? "Welcome. This help explains how calculator logic works in **blocks**, in **formula code**, and in the **full script** — all three edit the same underlying formula tree."
      : "Ласкаво просимо. Тут описано логіку калькулятора в **блоках**, **коді формули** та **повному скрипті** — усе редагує одне дерево формули.";
  m.docs.guide = { sections: guide[loc] };

  for (const [id, v] of Object.entries(primitivesCodeUsage)) {
    if (m.docs.primitives[id]) {
      m.docs.primitives[id].codeUsage = v[loc];
    }
  }
  for (const [id, v] of Object.entries(operandsCodeUsage)) {
    if (m.docs.operands[id]) {
      m.docs.operands[id].codeUsage = v[loc];
    }
  }

  for (const [key, meta] of Object.entries(scriptMeta[loc])) {
    if (!m.docs.script[key]) {
      m.docs.script[key] = { title: key, description: "" };
    }
    Object.assign(m.docs.script[key], meta);
  }

  fs.writeFileSync(`messages/${loc}.json`, `${JSON.stringify(m, null, 2)}\n`);
}

console.log("updated messages en + uk");
