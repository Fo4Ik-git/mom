"use client";

import {
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

/** Sensors tuned for touch (long-press) and mouse (small movement). */
export function useFormulaDndSensors() {
  return useSensors(
    useSensor(TouchSensor, {
      activationConstraint: { delay: 220, tolerance: 10 },
    }),
    useSensor(MouseSensor, {
      activationConstraint: { distance: 6 },
    }),
  );
}
