"use client";

import { useCallback, useEffect, useState } from "react";

const SIDE_WIDTH_MIN = 480;
const SIDE_WIDTH_MAX = 1100;
const SIDE_WIDTH_DEFAULT = 720;
const MODAL_WIDTH_MAX = 1100;
const MODAL_HEIGHT_MIN = 280;
const MODAL_HEIGHT_MAX_RATIO = 0.95;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function LogDetailShell({
  variant,
  children,
}: {
  variant: "modal" | "side";
  children: React.ReactNode;
}) {
  const [height, setHeight] = useState<number | null>(null);
  const [width, setWidth] = useState(SIDE_WIDTH_DEFAULT);

  useEffect(() => {
    if (variant === "modal") {
      setHeight(Math.round(window.innerHeight * 0.82));
    }
  }, [variant]);

  const startHeightDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (height == null) {
        return;
      }
      e.preventDefault();
      const startY = e.clientY;
      const startH = height;
      const maxH = Math.round(window.innerHeight * MODAL_HEIGHT_MAX_RATIO);

      const onMove = (ev: PointerEvent) => {
        setHeight(clamp(startH + (startY - ev.clientY), MODAL_HEIGHT_MIN, maxH));
      };
      const onUp = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "ns-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [height],
  );

  const startWidthDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = width;

      const onMove = (ev: PointerEvent) => {
        setWidth(clamp(startW + (startX - ev.clientX), SIDE_WIDTH_MIN, SIDE_WIDTH_MAX));
      };
      const onUp = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [width],
  );

  if (variant === "modal") {
    if (height == null) {
      return (
        <div
          className="flex h-[82vh] w-[min(96vw,1100px)] max-w-[96vw] flex-col overflow-hidden"
          style={{ maxWidth: MODAL_WIDTH_MAX }}
        >
          {children}
        </div>
      );
    }

    return (
      <div
        className="flex w-[min(96vw,1100px)] max-w-[96vw] flex-col overflow-hidden"
        style={{ height, maxWidth: MODAL_WIDTH_MAX }}
      >
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize panel height"
          onPointerDown={startHeightDrag}
          className="flex h-3 shrink-0 cursor-ns-resize touch-none items-center justify-center rounded-t-xl border-b border-border bg-muted/50"
        >
          <span className="h-1 w-12 rounded-full bg-muted-foreground/35" />
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    );
  }

  return (
    <div
      className="relative flex max-h-[calc(100vh-6rem)] flex-col overflow-hidden"
      style={{ width }}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel width"
        onPointerDown={startWidthDrag}
        className="absolute inset-y-0 left-0 z-10 w-2 cursor-ew-resize touch-none hover:bg-accent/15 active:bg-accent/25"
      />
      <div className="min-h-0 flex-1 overflow-hidden pl-1">{children}</div>
    </div>
  );
}
