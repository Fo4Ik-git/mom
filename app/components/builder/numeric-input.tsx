"use client";

import { useEffect, useState } from "react";

interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
}

function formatDisplayValue(value: number): string {
  return String(value);
}

function parseNumericText(text: string): number | null {
  const normalized = text.trim().replace(",", ".");
  if (normalized === "" || normalized === "-" || normalized === ".") {
    return null;
  }
  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

export function NumericInput({
  value,
  onChange,
  className,
  placeholder,
}: NumericInputProps) {
  const [text, setText] = useState(() => formatDisplayValue(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(formatDisplayValue(value));
    }
  }, [value, focused]);

  return (
    <input
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      value={text}
      onFocus={(e) => {
        setFocused(true);
        if (text === "0") {
          setText("");
        }
        e.target.select();
      }}
      onChange={(e) => {
        const next = e.target.value.replace(",", ".");
        if (next !== "" && !/^-?\d*\.?\d*$/.test(next)) {
          return;
        }
        setText(next);
        const parsed = parseNumericText(next);
        if (parsed !== null) {
          onChange(parsed);
        }
      }}
      onBlur={() => {
        setFocused(false);
        const parsed = parseNumericText(text);
        const finalValue = parsed ?? 0;
        onChange(finalValue);
        setText(formatDisplayValue(finalValue));
      }}
      className={className}
    />
  );
}
