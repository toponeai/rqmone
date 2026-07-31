import { useEffect, useRef, useState } from "react";
import { CloseIcon, MaximizeIcon, MinimizeIcon, PinIcon } from "@/os/icons";
import { useWindowStore, type FloatingWindowDef } from "@/os/stores/window.store";
import { useT } from "@/os/i18n";
import { anim } from "@/os/engines/motion";
import { play } from "@/os/engines/sound";

const POS_KEY = "rqm.window.positions";

interface PersistedPos {
  x: number;
  y: number;
  w: number;
  h: number;
}

function loadPositions(): Record<string, PersistedPos> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(POS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function savePosition(id: string, pos: PersistedPos): void {
  if (typeof window === "undefined") return;
  try {
    const all = loadPositions();
    all[id] = pos;
    window.localStorage.setItem(POS_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function FloatingWindow({ win }: { win: FloatingWindowDef }) {
  const t = useT();
  const close = useWindowStore((s) => s.close);
  const focus = useWindowStore((s) => s.focus);
  const move = useWindowStore((s) => s.move);
  const resize = useWindowStore((s) => s.resize);
  const setState = useWindowStore((s) => s.setState);
  const togglePin = useWindowStore((s) => s.togglePin);
  const Body = win.render;
  const [dragging, setDragging] = useState<{ dx: number; dy: number } | null>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);

  // Restore persisted position/size on first mount.
  useEffect(() => {
    const saved = loadPositions()[win.id];
    if (saved) {
      move(win.id, saved.x, saved.y);
      resize(win.id, saved.w, saved.h);
    }
    play("window-open");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist on move/resize.
  useEffect(() => {
    savePosition(win.id, { x: win.x, y: win.y, w: win.w, h: win.h });
  }, [win.id, win.x, win.y, win.w, win.h]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const nx = e.clientX - dragging.dx;
      const ny = Math.max(56, e.clientY - dragging.dy);
      // Magnetic snap to viewport edges (within 12px).
      const snap = 12;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const sx = nx < snap ? 0 : nx + win.w > vw - snap ? vw - win.w : nx;
      const sy = ny + win.h > vh - snap ? vh - win.h : ny;
      move(win.id, sx, sy);
    };
    const onUp = () => setDragging(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, move, win.id, win.w, win.h]);

  const handleClose = () => {
    play("window-close");
    setClosing(true);
    setTimeout(() => close(win.id), 180);
  };

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
      style={{
        ...style,
        animation: closing ? "rqm-fade-in 180ms ease-in reverse" : anim("scale"),
        transformOrigin: "50% 60%",
      }}
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
            onClick={handleClose}
            aria-label={t("window.close")}
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Body {...((win.props ?? {}) as unknown as any)} />
      </div>
    </div>
  );
}
