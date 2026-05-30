/** Labels for code editor shortcuts (⌘ on Mac, Ctrl elsewhere). */
export function getEditorShortcutLabels(isApplePlatform: boolean) {
  const mod = isApplePlatform ? "⌘" : "Ctrl";
  return {
    mod,
    hints: `${mod}+/`,
    find: `${mod}+F`,
    apply: `${mod}+↵`,
    undo: `${mod}+Z`,
    redo: `${mod}+Shift+Z`,
    summary: `${mod}+Z — undo · ${mod}+/ — hints · ${mod}+F — search · ${mod}+↵ — apply`,
    findTitle: `${mod}+F`,
    applyTitle: `${mod}+↵`,
  };
}

export function isAppleLikePlatform(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}
