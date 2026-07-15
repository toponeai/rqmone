import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";

import { useSession } from "@/hooks/use-session";
import {
  useHydrateLocaleFromStorage,
  useSyncLocaleToDocument,
} from "@/os/i18n";
import { registerBuiltinCommands } from "@/os/commands/builtins";
import { setCommandContextProvider } from "@/os/commands/bus";
import { useBreakpoint } from "./responsive";

import { TopNav } from "./layers/TopNav";
import { LeftDock } from "./layers/LeftDock";
import { RightDock } from "./layers/RightDock";
import { BottomNav } from "./layers/BottomNav";
import { CommandPaletteLayer } from "./layers/CommandPaletteLayer";
import { NotificationLayer } from "./layers/NotificationLayer";
import { ShellCreateDialog } from "./layers/ShellCreateDialog";
import { WindowManager } from "@/os/windows/WindowManager";

/**
 * AppShell — the permanent operating system of R.Q.M.1.
 *
 * Composes every layer (TopNav, docks, workspace, floating windows, palette,
 * notifications) around the current route's `<Outlet />`. Every future module
 * plugs into this shell via stores + the command bus and never reaches back
 * up to modify shell layout.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const bp = useBreakpoint();
  const navigate = useNavigate();
  const { user, loading } = useSession();

  // Locale <-> DOM sync (client-only effects; SSR-safe).
  useHydrateLocaleFromStorage();
  useSyncLocaleToDocument();

  // Register built-in commands once and provide execution context.
  useEffect(() => {
    const dispose = registerBuiltinCommands();
    return dispose;
  }, []);

  useEffect(() => {
    setCommandContextProvider(() => ({
      isAuthenticated: !loading && !!user,
      navigate: (path) => navigate({ to: path as never }),
      goToAuth: () => navigate({ to: "/auth" as never }),
    }));
    return () => setCommandContextProvider(null);
  }, [user, loading, navigate]);

  const showLeftDock = bp === "desktop";
  const showRightDock = bp === "desktop";
  const showBottomNav = bp === "mobile";

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-[var(--rqm-bg)] text-foreground">
      {/* Center workspace hosts route content. h-full/w-full so the Earth
          fills the viewport; other routes render normally inside. */}
      <main className="absolute inset-0" style={{ zIndex: 10 }}>
        {children}
      </main>

      <TopNav />

      {showLeftDock ? <LeftDock /> : null}
      {showRightDock ? <RightDock /> : null}
      {showBottomNav ? <BottomNav /> : null}

      <WindowManager />
      <NotificationLayer />
      <CommandPaletteLayer />
      <ShellCreateDialog />
    </div>
  );
}