import { useEffect, useRef } from "react";
import { Link, useRouterState } from "@tanstack/react-router";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthMenu } from "@/components/auth-menu";
import { AIIcon, CommandIcon, EarthIcon, LanguageIcon, SearchIcon } from "@/os/icons";
import { useT, useLocaleStore } from "@/os/i18n";
import { useCommandStore } from "@/os/stores/command.store";
import { useSearchStore, registerSearchFocusHandler } from "@/os/stores/search.store";
import { UniversalCreateMenu } from "./UniversalCreateMenu";

export function TopNav() {
  const t = useT();
  const toggleLocale = useLocaleStore((s) => s.toggle);
  const openPalette = useCommandStore((s) => s.openPalette);
  const rawQuery = useSearchStore((s) => s.rawQuery);
  const setRawQuery = useSearchStore((s) => s.setRawQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    registerSearchFocusHandler(() => inputRef.current?.focus());
    return () => registerSearchFocusHandler(null);
  }, []);

  const isEarth = pathname === "/";

  return (
    <header
      className="rqm-glass-2 pointer-events-auto absolute inset-x-0 top-0 flex h-14 items-center gap-2 px-3 sm:px-4"
      style={{ zIndex: 30 }}
    >
      <Link to="/" className="flex items-center gap-2 ps-1 pe-2 shrink-0">
        <EarthIcon className="h-5 w-5 text-[var(--rqm-primary)]" />
        <span className="hidden text-sm font-bold tracking-tight sm:inline">
          R.Q.M.<span className="text-[var(--rqm-primary)]">1</span>
        </span>
      </Link>

      <div className="relative min-w-0 flex-1">
        <SearchIcon className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
        <Input
          ref={inputRef}
          value={rawQuery}
          onChange={(e) => setRawQuery(e.target.value)}
          placeholder={t("search.placeholder")}
          className="h-9 border-white/10 bg-white/5 ps-9 text-sm"
          aria-label={t("nav.search")}
        />
      </div>

      <button
        onClick={openPalette}
        className="rqm-glass-1 hidden h-9 items-center gap-1.5 rounded-full px-3 text-xs sm:flex"
        aria-label={t("action.openPalette")}
      >
        <CommandIcon className="h-3.5 w-3.5" />
        <kbd className="opacity-70">⌘K</kbd>
      </button>

      <UniversalCreateMenu />

      {!isEarth ? null : null /* place-holder to keep grouping stable */}

      <Button asChild variant="ghost" size="icon" className="h-9 w-9" aria-label={t("nav.ai")}>
        <Link to="/ai-core">
          <AIIcon className="h-4 w-4 text-[var(--rqm-primary)]" />
        </Link>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        onClick={toggleLocale}
        aria-label={t("action.toggleLocale")}
      >
        <LanguageIcon className="h-4 w-4" />
      </Button>

      <AuthMenu />
    </header>
  );
}
