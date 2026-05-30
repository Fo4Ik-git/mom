import { completionKeymap, startCompletion } from "@codemirror/autocomplete";
import { redo, undo } from "@codemirror/commands";
import { Prec } from "@codemirror/state";
import { keymap } from "@codemirror/view";

/** Drop Ctrl+Space (conflicts with macOS input switching). */
const completionKeysWithoutCtrlSpace = completionKeymap.filter(
  (binding) => !/ctrl-?space/i.test(String(binding.key ?? "")),
);

/** Mod = ⌘ on Mac, Ctrl on Windows/Linux — highest priority so the browser does not steal undo. */
export const codeEditorHistoryKeymap = Prec.highest(
  keymap.of([
    { key: "Mod-z", run: undo },
    { key: "Mod-Shift-z", run: redo },
    { key: "Mod-y", run: redo },
  ]),
);

/** Cross-platform: Mod = ⌘ on Mac, Ctrl on Windows/Linux. */
export const codeEditorCompletionKeymap = keymap.of([
  { key: "Mod-/", run: startCompletion },
  { key: "Mod-i", run: startCompletion },
  ...completionKeysWithoutCtrlSpace,
]);
