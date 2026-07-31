import { getCommand, type CommandContext } from "./registry";
import { useCommandStore } from "@/os/stores/command.store";

let contextProvider: (() => CommandContext) | null = null;

export function setCommandContextProvider(fn: (() => CommandContext) | null) {
  contextProvider = fn;
}

export async function executeCommand(id: string) {
  const cmd = getCommand(id);
  if (!cmd) {
    if (typeof console !== "undefined") console.warn(`[commands] unknown command: ${id}`);
    return;
  }
  const ctx = contextProvider?.();
  if (!ctx) {
    console.warn("[commands] no context provider registered");
    return;
  }
  if (cmd.when && !cmd.when(ctx)) return;
  useCommandStore.getState().pushRecent(id);
  await cmd.run(ctx);
}
