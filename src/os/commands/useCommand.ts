import { useSyncExternalStore } from "react";
import { listCommands, subscribeRegistry, type Command } from "./registry";

export function useCommands(): Command[] {
  return useSyncExternalStore(subscribeRegistry, listCommands, listCommands);
}
