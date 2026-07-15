import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { AIIcon, EarthIcon, LayersIcon, PlusIcon, SearchIcon } from "@/os/icons";
import { useT } from "@/os/i18n";
import { useCreateStore } from "@/os/stores/create.store";
import { useSearchStore } from "@/os/stores/search.store";

export function BottomNav() {
  const t = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const openDialog = useCreateStore((s) => s.openDialog);
  const focusSearch = useSearchStore((s) => s.focus);

  const item = (opts: {
    key: string;
    to?: string;
    onClick?: () => void;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    accent?: boolean;
  }) => {
    const active = opts.to && pathname === opts.to;
    const cls = cn(
      "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]",
      opts.accent && "text-[var(--rqm-primary)]",
      active && !opts.accent && "text-[var(--rqm-primary)]",
      !active && !opts.accent && "text-white/60",
    );
    const inner = (
      <>
        <opts.icon className="h-5 w-5" />
        <span>{opts.label}</span>
      </>
    );
    if (opts.to) {
      return (
        <Link key={opts.key} to={opts.to} className={cls}>
          {inner}
        </Link>
      );
    }
    return (
      <button key={opts.key} onClick={opts.onClick} className={cls}>
        {inner}
      </button>
    );
  };

  return (
    <nav
      aria-label="Mobile primary"
      className="rqm-glass-2 pointer-events-auto absolute inset-x-0 bottom-0 flex items-stretch"
      style={{ zIndex: 20 }}
    >
      {item({ key: "home", to: "/", icon: EarthIcon, label: t("nav.home") })}
      {item({ key: "search", onClick: focusSearch, icon: SearchIcon, label: t("nav.search") })}
      {item({ key: "add", onClick: () => openDialog(null), icon: PlusIcon, label: t("action.add"), accent: true })}
      {item({ key: "ai", to: "/ai-core", icon: AIIcon, label: t("nav.ai") })}
      {item({ key: "manage", to: "/manage", icon: LayersIcon, label: t("nav.manage") })}
    </nav>
  );
}