"use client";

import { useEffect, useState } from "react";
import { detectTouchBuilderUi } from "@/lib/hooks/detect-touch-device";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}

/** Phone / tablet touch UI — not based on viewport width. */
export function useTouchBuilderUi(): boolean {
  const [touchUi, setTouchUi] = useState(() =>
    typeof window !== "undefined" ? detectTouchBuilderUi() : false,
  );

  useEffect(() => {
    const update = () => setTouchUi(detectTouchBuilderUi());
    update();

    const coarse = window.matchMedia("(pointer: coarse)");
    const hover = window.matchMedia("(hover: none)");
    coarse.addEventListener("change", update);
    hover.addEventListener("change", update);
    return () => {
      coarse.removeEventListener("change", update);
      hover.removeEventListener("change", update);
    };
  }, []);

  return touchUi;
}
