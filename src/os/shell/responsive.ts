import { useEffect, useState } from "react";

export type Breakpoint = "mobile" | "tablet" | "desktop";

function computeBreakpoint(width: number): Breakpoint {
  if (width >= 1024) return "desktop";
  if (width >= 640) return "tablet";
  return "mobile";
}

/**
 * SSR-safe breakpoint hook. Returns `"desktop"` on the server and during the
 * first client render, then reconciles to the real breakpoint in an effect.
 */
export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>("desktop");

  useEffect(() => {
    const update = () => setBp(computeBreakpoint(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return bp;
}
