/** Detect phone / tablet (touch-first) vs desktop pointer UI. */
export function detectTouchBuilderUi(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const touchPoints = navigator.maxTouchPoints ?? 0;
  const hasTouch = touchPoints > 0 || "ontouchstart" in window;

  if (!hasTouch) {
    return false;
  }

  const ua = navigator.userAgent;
  const isMobileTabletUa =
    /Android|iPhone|iPod|iPad|Mobile|Tablet|Silk|Kindle|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
      ua,
    );

  // iPadOS 13+ may report as Mac with a desktop UA.
  const isIpadDesktopUa =
    navigator.platform === "MacIntel" && touchPoints > 1;

  const nav = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
  if (nav.userAgentData?.mobile === true) {
    return true;
  }

  if (isMobileTabletUa || isIpadDesktopUa) {
    return true;
  }

  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const noHover = window.matchMedia("(hover: none)").matches;

  return coarsePointer && noHover;
}
