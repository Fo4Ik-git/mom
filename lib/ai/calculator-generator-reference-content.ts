/** Auto-total rules for AI (static; formula list comes from registry catalog). */
export const CALCULATOR_AUTO_TOTAL_REFERENCE_FOR_AI = `
## Auto calculations (qty × property)

When a property should total **quantity × unit value**, set **auto_total = true** on that property.
The platform creates calc **calc_{field_id}_{property_id}** automatically — do not declare it in calculations.calc.

- Reference auto calcs in formulas: \`calc_field_item_var_price\`, not \`field_item.qty * field_item.var_price\` when auto_total is on.
- Use manual **calc** only for derived steps (IF tiers, SUM of several calcs, pages × rate, SUM_ROWS, etc.).
`.trim();
