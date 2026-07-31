import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Bell, Check, CheckCheck, Globe2, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  archiveNotification,
  type AppNotificationRow,
} from "@/modules/notifications/notifications.functions";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — R.Q.M.1" },
      { name: "description", content: "Your notifications from the R.Q.M.1 Galaxy OS." },
    ],
  }),
  component: NotificationsPage,
});

type Filter = "all" | "unread" | "archived";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "archived", label: "Archived" },
];

function NotificationsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const { user } = useSession();
  const qc = useQueryClient();

  const listFn = useServerFn(listNotifications);
  const markOneFn = useServerFn(markNotificationRead);
  const markAllFn = useServerFn(markAllNotificationsRead);
  const archiveFn = useServerFn(archiveNotification);

  // Fetch all + archived in one shot; client-side filter avoids double requests.
  const query = useQuery({
    queryKey: ["notifications", "page", filter],
    queryFn: () => listFn({ data: { limit: 100, includeArchived: filter === "archived" } }),
    enabled: !!user,
    staleTime: 10_000,
  });

  const markAll = useMutation({
    mutationFn: () => markAllFn({}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markOne = useMutation({
    mutationFn: (id: string) => markOneFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const archiveOne = useMutation({
    mutationFn: (id: string) => archiveFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const all = (query.data ?? []) as AppNotificationRow[];

  const items =
    filter === "unread"
      ? all.filter((n) => !n.read_at && !n.archived_at)
      : filter === "archived"
        ? all.filter((n) => !!n.archived_at)
        : all.filter((n) => !n.archived_at);

  const anyUnread = all.some((n) => !n.read_at && !n.archived_at);

  return (
    <main className="relative min-h-screen bg-background">
      {/* Ambient gradient */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at 30% -10%, hsl(var(--primary) / 0.12), transparent 55%), radial-gradient(ellipse at 80% 110%, hsl(25 95% 53% / 0.10), transparent 55%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Top nav */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Earth
          </Link>
          <div className="flex items-center gap-2 text-sm font-bold">
            <Globe2 className="h-5 w-5 text-primary" />
            R.Q.M.<span className="text-primary">1</span>
          </div>
        </div>

        {/* Page title */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
              <Bell className="h-7 w-7 text-orange-400" />
              Notifications
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Activity from your entities and conversations.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAll.mutate()}
            disabled={!anyUnread || markAll.isPending}
            className="gap-2"
          >
            {markAll.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" />
            )}
            Mark all read
          </Button>
        </div>

        {/* Filter tabs */}
        <div className="mb-4 flex gap-1 rounded-xl border border-border/60 bg-card/40 p-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                filter === f.id
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {query.isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card/40 backdrop-blur">
            {items.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                onMarkRead={() => markOne.mutate(n.id)}
                onArchive={() => archiveOne.mutate(n.id)}
                isPendingRead={markOne.isPending}
                isPendingArchive={archiveOne.isPending}
              />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function EmptyState({ filter }: { filter: Filter }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-12 text-center">
      <Bell className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">
        {filter === "archived" ? "No archived notifications." : "You're all caught up."}
      </p>
    </div>
  );
}

interface NotificationRowProps {
  notification: AppNotificationRow;
  onMarkRead: () => void;
  onArchive: () => void;
  isPendingRead: boolean;
  isPendingArchive: boolean;
}

function NotificationRow({
  notification: n,
  onMarkRead,
  onArchive,
  isPendingRead,
  isPendingArchive,
}: NotificationRowProps) {
  const unread = !n.read_at && !n.archived_at;

  const body = (
    <div className="flex min-w-0 flex-1 items-start gap-3">
      <span
        aria-hidden
        className={`mt-2 h-2 w-2 shrink-0 rounded-full transition ${
          unread
            ? "bg-orange-400 shadow-[0_0_8px_theme(colors.orange.400/0.7)]"
            : "bg-muted-foreground/20"
        }`}
      />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm ${unread ? "font-semibold" : "font-medium"}`}>{n.title}</p>
        {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>}
        <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground/50">
          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );

  return (
    <li className="group flex items-center gap-2 px-4 py-3 transition hover:bg-white/[0.03]">
      <div className="min-w-0 flex-1">
        {n.link ? (
          <Link
            to={n.link}
            onClick={() => {
              if (unread) onMarkRead();
            }}
            className="block rounded-lg"
          >
            {body}
          </Link>
        ) : (
          <button
            onClick={() => {
              if (unread) onMarkRead();
            }}
            className="block w-full rounded-lg text-start"
            disabled={!unread}
          >
            {body}
          </button>
        )}
      </div>

      {/* Hover actions */}
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
        {unread && (
          <Button
            variant="ghost"
            size="icon"
            title="Mark as read"
            onClick={onMarkRead}
            disabled={isPendingRead}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        )}
        {!n.archived_at && (
          <Button
            variant="ghost"
            size="icon"
            title="Archive"
            onClick={onArchive}
            disabled={isPendingArchive}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </li>
  );
}
