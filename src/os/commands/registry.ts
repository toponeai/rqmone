import type { ComponentType } from "react";
import type { IconComponent } from "@/os/icons";

export type CommandGroup =
  | "search"
  | "create"
  | "navigate"
  | "action"
  | "ai"
  | "system";

export interface CommandContext {
  navigate: (path: string) => void;
  isAuthenticated: boolean;
  goToAuth: () => void;
}

export interface Command {
  id: string;
  title: string;      // i18n key or literal fallback
  hint?: string;
  group: CommandGroup;
  icon?: IconComponent | ComponentType<{ className?: string }>;
  keybinding?: string;      // e.g. "mod+k", "mod+shift+n"
  when?: (ctx: CommandContext) => boolean;
  run: (ctx: CommandContext) => void | Promise<void>;
}

const REGISTRY = new Map<string, Command>();
const SUBSCRIBERS = new Set<() => void>();
let cachedSnapshot: Command[] = [];

function invalidateSnapshot() {
  cachedSnapshot = Array.from(REGISTRY.values());
  SUBSCRIBERS.forEach((fn) => fn());
}

export function registerCommand(cmd: Command): () => void {
  REGISTRY.set(cmd.id, cmd);
  invalidateSnapshot();
  return () => {
    REGISTRY.delete(cmd.id);
    invalidateSnapshot();
  };
}

export function registerCommands(cmds: Command[]): () => void {
  const disposers = cmds.map(registerCommand);
  return () => disposers.forEach((d) => d());
}

export function listCommands(): Command[] {
  return cachedSnapshot;
}

export function getCommand(id: string): Command | undefined {
  return REGISTRY.get(id);
}

export function subscribeRegistry(fn: () => void): () => void {
  SUBSCRIBERS.add(fn);
  return () => SUBSCRIBERS.delete(fn);
}