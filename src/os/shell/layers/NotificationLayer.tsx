import { CloseIcon } from "@/os/icons";
import { useNotificationStore } from "@/os/stores/notification.store";
import { useT } from "@/os/i18n";

export function NotificationLayer() {
  const open = useNotificationStore((s) => s.panelOpen);
  const items = useNotificationStore((s) => s.items);
  const close = useNotificationStore((s) => s.setPanelOpen);
  const markAll = useNotificationStore((s) => s.markAllRead);
  const t = useT();

  if (!open) return null;
  return (
    <aside
      role="dialog"
      aria-label={t("nav.notifications")}
      className="rqm-glass-3 pointer-events-auto absolute end-16 top-16 flex w-80 max-h-[70vh] flex-col overflow-hidden rounded-2xl"
      style={{ zIndex: 60 }}
    >
      <header className="flex items-center justify-between border-b border-[var(--rqm-border)] px-3 py-2">
        <h3 className="text-sm font-semibold">{t("nav.notifications")}</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={markAll}
            className="rounded px-2 py-1 text-xs text-white/70 hover:bg-white/10"
          >
            ✓
          </button>
          <button
            onClick={() => close(false)}
            className="rounded p-1 hover:bg-white/10"
            aria-label={t("window.close")}
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      </header>
      <ul className="flex-1 divide-y divide-white/5 overflow-y-auto">
        {items.length === 0 ? (
          <li className="p-6 text-center text-sm text-white/50">—</li>
        ) : (
          items.map((n) => (
            <li key={n.id} className="p-3 text-sm">
              <div className="font-medium">{n.title}</div>
              {n.body ? <div className="text-xs text-white/60">{n.body}</div> : null}
            </li>
          ))
        )}
      </ul>
    </aside>
  );
}