import { useEffect, useRef, useState } from "react";
import { CloseIcon, MaximizeIcon, MinimizeIcon, PinIcon } from "@/os/icons";
import { useWindowStore, type FloatingWindowDef } from "@/os/stores/window.store";
import { useT } from "@/os/i18n";

export function FloatingWindow({ win }: { win: FloatingWindowDef }) {
  const t = useT();
  const { close, focus, move, setState, togglePin } = useWindowStore();
  const Body = win.render;
  const [dragging, setDragging] = useState<{ dx: number; dy: number } | null>(null);
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      move(win.id, e.clientX - dragging.dx, Math.max(56, e.clientY - dragging.dy));
    };
    const onUp = () => setDragging(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, move, win.id]);

  if (win.state === "minimized") return null;

  const isMax = win.state === "maximized";
  const style = isMax
    ? { inset: 12, width: "auto", height: "auto", zIndex: win.z }
    : {
        left: win.x,
        top: win.y,
        width: win.w,
        height: win.h,
        zIndex: win.z,
      };

  return (
    <div
      ref={nodeRef}
      role="dialog"
      aria-modal="false"
      aria-label={win.title}
      className="rqm-glass-3 pointer-events-auto absolute flex flex-col overflow-hidden rounded-2xl"
      style={style}
      onMouseDown={() => focus(win.id)}
    >
      <div
        className="flex h-10 shrink-0 cursor-move items-center justify-between border-b border-[var(--rqm-border)] px-3"
        onMouseDown={(e) => {
          if (isMax) return;
          const rect = nodeRef.current?.getBoundingClientRect();
          if (!rect) return;
          setDragging({ dx: e.clientX - rect.left, dy: e.clientY - rect.top });
        }}
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          {win.icon}
          <span className="truncate">{win.title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="rounded-md p-1 hover:bg-white/10"
            onClick={() => togglePin(win.id)}
            aria-label={t("window.pin")}
          >
            <PinIcon className={`h-3.5 w-3.5 ${win.pinned ? "text-[var(--rqm-primary)]" : ""}`} />
          </button>
          <button
            className="rounded-md p-1 hover:bg-white/10"
            onClick={() => setState(win.id, "minimized")}
            aria-label={t("window.minimize")}
          >
            <MinimizeIcon className="h-3.5 w-3.5" />
          </button>
          <button
            className="rounded-md p-1 hover:bg-white/10"
            onClick={() => setState(win.id, isMax ? "normal" : "maximized")}
            aria-label={isMax ? t("window.restore") : t("window.maximize")}
          >
            <MaximizeIcon className="h-3.5 w-3.5" />
          </button>
          <button
            className="rounded-md p-1 hover:bg-red-500/20"
            onClick={() => close(win.id)}
            aria-label={t("window.close")}
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Body {...(((win.props ?? {}) as unknown) as any)} />
      </div>
    </div>
  );
}