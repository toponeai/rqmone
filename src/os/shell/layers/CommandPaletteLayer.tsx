import { useEffect, useMemo, useState } from "react";
import { CommandIcon } from "@/os/icons";
import { useCommandStore } from "@/os/stores/command.store";
import { useCommands } from "@/os/commands/useCommand";
import { executeCommand } from "@/os/commands/bus";
import { useT } from "@/os/i18n";

export function CommandPaletteLayer() {
  const open = useCommandStore((s) => s.paletteOpen);
  const close = useCommandStore((s) => s.closePalette);
  const toggle = useCommandStore((s) => s.togglePalette);
  const commands = useCommands();
  const t = useT();

  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      } else if (e.key === "Escape" && open) {
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, toggle, close]);

  useEffect(() => {
    if (!open) setQuery("");
    setCursor(0);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) => c.title.toLowerCase().includes(q) || c.id.includes(q),
    );
  }, [commands, query]);

  if (!open) return null;

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filtered[cursor];
      if (cmd) {
        close();
        void executeCommand(cmd.id);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-start justify-center bg-black/40 p-4 pt-24 backdrop-blur-sm"
      style={{ zIndex: 80 }}
      onClick={close}
    >
      <div
        className="rqm-glass-3 w-full max-w-xl overflow-hidden rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-[var(--rqm-border)] px-4">
          <CommandIcon className="h-4 w-4 text-[var(--rqm-primary)]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder={t("palette.placeholder")}
            className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-white/40"
          />
          <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px]">Esc</kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto p-1" role="listbox">
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-white/50">{t("palette.empty")}</li>
          ) : (
            filtered.map((c, i) => {
              const Icon = c.icon;
              return (
                <li key={c.id}>
                  <button
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => {
                      close();
                      void executeCommand(c.id);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start text-sm ${
                      i === cursor ? "bg-white/10" : "hover:bg-white/5"
                    }`}
                  >
                    {Icon ? <Icon className="h-4 w-4 opacity-80" /> : null}
                    <span className="flex-1 truncate">{c.title}</span>
                    <span className="text-[10px] uppercase tracking-wider text-white/40">
                      {c.group}
                    </span>
                    {c.keybinding ? (
                      <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px]">
                        {c.keybinding}
                      </kbd>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}