"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ResizeAxis = "x" | "y";

export function usePersistedResize(
  storageKey: string,
  defaultSize: number,
  clamp: (value: number) => number,
  axis: ResizeAxis,
) {
  const [size, setSize] = useState(defaultSize);
  const sizeRef = useRef(size);
  sizeRef.current = size;

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      return;
    }
    const parsed = Number(stored);
    if (Number.isFinite(parsed)) {
      setSize(clamp(parsed));
    }
  }, [storageKey, clamp]);

  const handleResizePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const start =
        axis === "x" ? event.clientX : event.clientY;
      const startSize = sizeRef.current;
      const handle = event.currentTarget;

      handle.setPointerCapture(event.pointerId);

      const onMove = (moveEvent: PointerEvent) => {
        const delta =
          axis === "x"
            ? start - moveEvent.clientX
            : moveEvent.clientY - start;
        setSize(clamp(startSize + delta));
      };

      const onUp = (upEvent: PointerEvent) => {
        handle.releasePointerCapture(upEvent.pointerId);
        localStorage.setItem(storageKey, String(sizeRef.current));
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
        handle.removeEventListener("pointercancel", onUp);
      };

      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", onUp);
      handle.addEventListener("pointercancel", onUp);
    },
    [storageKey, clamp, axis],
  );

  return { size, handleResizePointerDown };
}
