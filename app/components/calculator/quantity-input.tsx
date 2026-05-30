"use client";

import { useState } from "react";

type QuantityInputProps = {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  list?: string;
  className?: string;
};

function parseQuantity(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "" || trimmed === "-") {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.max(0, parsed);
}

/**
 * Quantity field: empty display when 0, no forced "0" while typing.
 */
export function QuantityInput({
  id,
  value,
  onChange,
  min = 0,
  list,
  className,
}: QuantityInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const editing = draft !== null;
  const displayValue = editing ? draft : value === 0 ? "" : String(value);

  return (
    <input
      id={id}
      type="number"
      min={min}
      step="any"
      inputMode="decimal"
      value={displayValue}
      list={list}
      onFocus={(event) => {
        setDraft(value === 0 ? "" : String(value));
        event.currentTarget.select();
      }}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        const parsed = parseQuantity(next);
        if (parsed !== null) {
          onChange(parsed);
        }
      }}
      onBlur={() => {
        const parsed = parseQuantity(draft ?? "");
        onChange(parsed ?? 0);
        setDraft(null);
      }}
      className={className}
    />
  );
}
