import { useEffect, useState } from "react";

/** True only after the first client paint — avoids dnd-kit SSR id mismatches. */
export function useClientMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
