"use client";

import type { InputField, LineItemRow } from "@/types/calculator";
import {
  createEmptyLineItemRow,
  lineItemMaxRows,
  lineItemMinRows,
} from "@/lib/calculator/fields/line-items";

interface LineItemsTableProps {
  field: InputField;
  rows: LineItemRow[];
  onChange: (rows: LineItemRow[]) => void;
  labels: {
    addRow: string;
    removeRow: string;
    row: string;
  };
}

export function LineItemsTable({
  field,
  rows,
  onChange,
  labels,
}: LineItemsTableProps) {
  const minRows = lineItemMinRows(field);
  const maxRows = lineItemMaxRows(field);

  function updateCell(rowIndex: number, propertyId: string, value: number) {
    onChange(
      rows.map((row, index) =>
        index === rowIndex ? { ...row, [propertyId]: value } : row,
      ),
    );
  }

  function addRow() {
    if (rows.length >= maxRows) {
      return;
    }
    onChange([...rows, createEmptyLineItemRow(field)]);
  }

  function removeRow(index: number) {
    if (rows.length <= minRows) {
      return;
    }
    onChange(rows.filter((_, rowIndex) => rowIndex !== index));
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                #
              </th>
              {field.properties.map((property) => (
                <th
                  key={property.id}
                  className="px-3 py-2 text-left text-xs font-medium text-muted-foreground"
                >
                  {property.label}
                </th>
              ))}
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-border/70 last:border-0">
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {rowIndex + 1}
                </td>
                {field.properties.map((property) => (
                  <td key={property.id} className="px-2 py-2">
                    <input
                      type="number"
                      step="any"
                      value={row[property.id] ?? 0}
                      onChange={(e) =>
                        updateCell(
                          rowIndex,
                          property.id,
                          Number(e.target.value) || 0,
                        )
                      }
                      className="h-10 w-full min-w-[88px] rounded-lg border border-border bg-input px-2.5 text-sm"
                    />
                  </td>
                ))}
                <td className="px-2 py-2">
                  <button
                    type="button"
                    onClick={() => removeRow(rowIndex)}
                    disabled={rows.length <= minRows}
                    className="rounded-lg px-2 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-40"
                    aria-label={labels.removeRow}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addRow}
        disabled={rows.length >= maxRows}
        className="rounded-xl border border-dashed border-border px-3 py-2 text-sm font-medium text-accent hover:border-accent/50 disabled:opacity-40"
      >
        {labels.addRow}
      </button>
    </div>
  );
}
