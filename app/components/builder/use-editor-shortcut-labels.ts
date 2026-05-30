"use client";

import { useMemo } from "react";
import {
  getEditorShortcutLabels,
  isAppleLikePlatform,
} from "@/lib/platform/editor-shortcut-labels";

export function useEditorShortcutLabels() {
  return useMemo(
    () => getEditorShortcutLabels(isAppleLikePlatform()),
    [],
  );
}
