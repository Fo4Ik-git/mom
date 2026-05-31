"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ResizeEdge = "left" | "right" | "top" | "bottom";

function resizeDelta(
  edge: ResizeEdge,
  startX: number,
  startY: number,
  moveX: number,
  moveY: number,
): number {
  switch (edge) {
    case "left":
      return startX - moveX;
    case "right":
      return moveX - startX;
    case "top":
      return startY - moveY;
    case "bottom":
      return moveY - startY;
  }
}

export function usePersistedResize(
  storageKey: string,
  defaultSize: number,
  clamp: (value: number) => number,
  edge: ResizeEdge,
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
      const startX = event.clientX;
      const startY = event.clientY;
      const startSize = sizeRef.current;
      const handle = event.currentTarget;

      handle.setPointerCapture(event.pointerId);

      const onMove = (moveEvent: PointerEvent) => {
        const delta = resizeDelta(
          edge,
          startX,
          startY,
          moveEvent.clientX,
          moveEvent.clientY,
        );
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
    [storageKey, clamp, edge],
  );

  return { size, handleResizePointerDown };
}
