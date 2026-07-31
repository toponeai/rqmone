import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Link } from "@tanstack/react-router";

import { CloseIcon, LoaderIcon } from "@/os/icons";
import { useNotificationStore } from "@/os/stores/notification.store";
import { useT } from "@/os/i18n";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  archiveNotification,
  type AppNotificationRow,
} from "@/modules/notifications/notifications.functions";
import { useSession } from "@/hooks/use-session";

export function NotificationLayer() {
  const open = useNotificationStore((s) => s.panelOpen);
  const close = useNotificationStore((s) => s.setPanelOpen);
  const t = useT();
  const { user } = useSession();

  const list = useServerFn(listNotifications);
  const markAll = useServerFn(markAllNotificationsRead);
  const markOne = useServerFn(markNotificationRead);
  const archive = useServerFn(archiveNotification);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["notifications"],
    queryFn: () => list({ data: { limit: 30, includeArchived: false } }),
    enabled: !!user && open,
    staleTime: 15_000,
  });

  const markAllMut = useMutation({
    mutationFn: () => markAll({}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
  });
  const markOneMut = useMutation({
    mutationFn: (id: string) => markOne({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
  });
  const archiveMut = useMutation({
    mutationFn: (id: string) => archive({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  if (!open) return null;

  const items = (q.data ?? []) as AppNotificationRow[];
  const anyUnread = items.some((n) => !n.read_at);

  return (
    <aside
      role="dialog"
      aria-label={t("nav.notifications")}
      className="rqm-glass-3 pointer-events-auto absolute end-3 top-16 flex w-[22rem] max-h-[70vh] flex-col overflow-hidden rounded-2xl"
      style={{ zIndex: 60 }}
    >
      <header className="flex items-center justify-between border-b border-[var(--rqm-border)] px-3 py-2">
        <h3 className="text-sm font-semibold">{t("nav.notifications")}</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => markAllMut.mutate()}
            disabled={!anyUnread || markAllMut.isPending}
            className="rounded px-2 py-1 text-xs text-white/70 hover:bg-white/10 disabled:opacity-40"
          >
            {t("notifications.markAll")}
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
        {!user ? (
          <li className="p-6 text-center text-sm text-white/50">
            {t("notifications.signInPrompt")}
          </li>
        ) : q.isLoading ? (
          <li className="flex items-center justify-center p-6 text-white/50">
            <LoaderIcon className="h-4 w-4 animate-spin" />
          </li>
        ) : items.length === 0 ? (
          <li className="p-6 text-center text-sm text-white/50">{t("notifications.empty")}</li>
        ) : (
          items.map((n) => {
            const unread = !n.read_at;
            const body = (
              <div className="flex items-start gap-2">
                <span
                  aria-hidden
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    unread
                      ? "bg-[var(--rqm-primary)] shadow-[0_0_8px_var(--rqm-primary)]"
                      : "bg-white/20"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{n.title}</div>
                  {n.body ? (
                    <div className="line-clamp-2 text-xs text-white/60">{n.body}</div>
                  ) : null}
                  <div className="mt-0.5 text-[10px] uppercase tracking-wide text-white/40">
                    {formatDistanceToNow(new Date(n.created_at), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              </div>
            );
            return (
              <li key={n.id} className="group relative">
                {n.link ? (
                  <Link
                    to={n.link}
                    onClick={() => {
                      if (unread) markOneMut.mutate(n.id);
                      close(false);
                    }}
                    className="block p-3 hover:bg-white/5"
                  >
                    {body}
                  </Link>
                ) : (
                  <button
                    onClick={() => unread && markOneMut.mutate(n.id)}
                    className="block w-full p-3 text-start hover:bg-white/5"
                  >
                    {body}
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    archiveMut.mutate(n.id);
                  }}
                  aria-label={t("notifications.dismiss")}
                  className="absolute end-2 top-2 rounded p-1 opacity-0 transition group-hover:opacity-100 hover:bg-white/10"
                >
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })
        )}
      </ul>
    </aside>
  );
}
