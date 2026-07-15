import { FloatingWindow } from "./FloatingWindow";
import { useWindowStore } from "@/os/stores/window.store";

export function WindowManager() {
  const windows = useWindowStore((s) => s.windows);
  if (windows.length === 0) return null;
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ zIndex: "var(--z-windows)" as unknown as number }}
    >
      {windows.map((w) => (
        <FloatingWindow key={w.id} win={w} />
      ))}
    </div>
  );
}

/** Minimized-window rail rendered inside BottomNav / dock. */
export function MinimizedRail() {
  const windows = useWindowStore((s) => s.windows.filter((w) => w.state === "minimized"));
  const setState = useWindowStore((s) => s.setState);
  const focus = useWindowStore((s) => s.focus);
  if (windows.length === 0) return null;
  return (
    <div className="flex items-center gap-1">
      {windows.map((w) => (
        <button
          key={w.id}
          onClick={() => {
            setState(w.id, "normal");
            focus(w.id);
          }}
          className="rqm-glass-1 rounded-full px-3 py-1 text-xs"
          title={w.title}
        >
          {w.title}
        </button>
      ))}
    </div>
  );
}