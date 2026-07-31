import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  AIIcon,
  AnalyticsIcon,
  EarthIcon,
  JobsIcon,
  LayersIcon,
  LiveIcon,
  MarketplaceIcon,
  WalletIcon,
  type IconComponent,
} from "@/os/icons";
import { useT } from "@/os/i18n";

interface DockItem {
  id: string;
  label: keyof ReturnType<typeof buildLabelKeys>;
  icon: IconComponent;
  to?: string;
  disabled?: boolean;
}

function buildLabelKeys() {
  return {
    "nav.earth": "" as const,
    "nav.marketplace": "" as const,
    "nav.ai": "" as const,
    "nav.wallet": "" as const,
    "nav.live": "" as const,
    "nav.analytics": "" as const,
    "nav.manage": "" as const,
    "nav.jobs": "" as const,
  };
}

const ITEMS: DockItem[] = [
  { id: "earth", label: "nav.earth", icon: EarthIcon, to: "/" },
  { id: "marketplace", label: "nav.marketplace", icon: MarketplaceIcon, disabled: true },
  { id: "ai", label: "nav.ai", icon: AIIcon, to: "/ai-core" },
  { id: "wallet", label: "nav.wallet", icon: WalletIcon, disabled: true },
  { id: "live", label: "nav.live", icon: LiveIcon, disabled: true },
  { id: "analytics", label: "nav.analytics", icon: AnalyticsIcon, disabled: true },
  { id: "jobs", label: "nav.jobs" as never, icon: JobsIcon, disabled: true },
  { id: "manage", label: "nav.manage", icon: LayersIcon, to: "/manage" },
];

export function LeftDock() {
  const t = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      aria-label="Primary"
      className="rqm-glass-2 pointer-events-auto absolute start-3 top-1/2 flex -translate-y-1/2 flex-col items-center gap-1 rounded-2xl p-2"
      style={{ zIndex: 20 }}
    >
      {ITEMS.map((it) => {
        const Icon = it.icon;
        const active = it.to && pathname === it.to;
        const label = t(it.label as never) ?? it.id;
        const cls = cn(
          "group relative flex h-10 w-10 items-center justify-center rounded-xl transition",
          active
            ? "bg-[var(--rqm-primary)]/20 text-[var(--rqm-primary)]"
            : "text-white/70 hover:bg-white/10 hover:text-white",
          it.disabled && "opacity-40 cursor-not-allowed",
        );
        const inner = (
          <>
            <Icon className="h-4 w-4" />
            <span className="rqm-glass-3 pointer-events-none absolute start-full ms-2 whitespace-nowrap rounded-md px-2 py-1 text-xs opacity-0 transition group-hover:opacity-100">
              {label}
              {it.disabled ? (
                <span className="ms-1.5 rounded bg-white/10 px-1 py-0.5 text-[9px] uppercase text-white/60">
                  {t("soon.badge")}
                </span>
              ) : null}
            </span>
          </>
        );
        if (it.disabled || !it.to) {
          return (
            <button key={it.id} className={cls} disabled={it.disabled} aria-label={label}>
              {inner}
            </button>
          );
        }
        return (
          <Link key={it.id} to={it.to} className={cls} aria-label={label}>
            {inner}
          </Link>
        );
      })}
    </nav>
  );
}
