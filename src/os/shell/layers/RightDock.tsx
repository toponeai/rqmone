import { cn } from "@/lib/utils";
import {
  AdminIcon,
  BellIcon,
  MessagesIcon,
  SettingsIcon,
  ThemeDarkIcon,
  UserIcon,
  type IconComponent,
} from "@/os/icons";
import { useT } from "@/os/i18n";
import { useNotificationStore } from "@/os/stores/notification.store";

interface DockItem {
  id: string;
  labelKey: string;
  icon: IconComponent;
  onClick?: () => void;
  disabled?: boolean;
  badge?: number;
}

export function RightDock() {
  const t = useT();
  const toggleNotifications = useNotificationStore((s) => s.togglePanel);
  const unread = useNotificationStore((s) => s.items.filter((i) => !i.read).length);

  const items: DockItem[] = [
    { id: "profile", labelKey: "nav.profile", icon: UserIcon, disabled: true },
    {
      id: "notifications",
      labelKey: "nav.notifications",
      icon: BellIcon,
      onClick: toggleNotifications,
      badge: unread,
    },
    { id: "messages", labelKey: "nav.messages", icon: MessagesIcon, disabled: true },
    { id: "settings", labelKey: "nav.settings", icon: SettingsIcon, disabled: true },
    { id: "admin", labelKey: "nav.admin", icon: AdminIcon, disabled: true },
    { id: "theme", labelKey: "action.toggleTheme", icon: ThemeDarkIcon, disabled: true },
  ];

  return (
    <nav
      aria-label="Secondary"
      className="rqm-glass-2 pointer-events-auto absolute end-3 top-1/2 flex -translate-y-1/2 flex-col items-center gap-1 rounded-2xl p-2"
      style={{ zIndex: 20 }}
    >
      {items.map((it) => {
        const Icon = it.icon;
        const label = t(it.labelKey as never) ?? it.id;
        return (
          <button
            key={it.id}
            className={cn(
              "group relative flex h-10 w-10 items-center justify-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white",
              it.disabled && "opacity-40 cursor-not-allowed",
            )}
            onClick={it.onClick}
            disabled={it.disabled}
            aria-label={label}
          >
            <Icon className="h-4 w-4" />
            {it.badge ? (
              <span className="absolute -top-1 end-0 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--rqm-danger)] px-1 text-[10px] font-semibold text-white">
                {it.badge}
              </span>
            ) : null}
            <span className="rqm-glass-3 pointer-events-none absolute end-full me-2 whitespace-nowrap rounded-md px-2 py-1 text-xs opacity-0 transition group-hover:opacity-100">
              {label}
              {it.disabled ? (
                <span className="ms-1.5 rounded bg-white/10 px-1 py-0.5 text-[9px] uppercase text-white/60">
                  {t("soon.badge")}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </nav>
  );
}