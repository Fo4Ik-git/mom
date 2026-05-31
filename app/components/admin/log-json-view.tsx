"use client";

import { useCallback, useMemo } from "react";
import { useTheme } from "next-themes";
import JsonView from "@uiw/react-json-view";
import { lightTheme } from "@uiw/react-json-view/light";
import { darkTheme } from "@uiw/react-json-view/dark";
import { Button } from "@/app/components/ui/button";

export function LogJsonView({
  value,
  className = "",
  copyLabel = "Copy JSON",
}: {
  value: object;
  className?: string;
  copyLabel?: string;
}) {
  const { resolvedTheme } = useTheme();
  const jsonTheme = resolvedTheme === "dark" ? darkTheme : lightTheme;

  const jsonText = useMemo(() => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }, [value]);

  const copyJson = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
    } catch {
      /* ignore */
    }
  }, [jsonText]);

  return (
    <div className={`flex min-h-0 flex-col gap-2 ${className}`}>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          className="h-7 px-2 text-[11px]"
          onClick={() => void copyJson()}
        >
          {copyLabel}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-card p-2">
        <JsonView
          value={value}
          style={jsonTheme}
          collapsed={2}
          displayDataTypes={false}
          enableClipboard
          shortenTextAfterLength={0}
        />
      </div>
    </div>
  );
}
