import {
  AIIcon,
  BusinessIcon,
  CommandIcon,
  EarthIcon,
  EventIcon,
  LanguageIcon,
  LayersIcon,
  ProductIcon,
  PropertyIcon,
  SearchIcon,
} from "@/os/icons";

import { useCreateStore } from "@/os/stores/create.store";
import { useSearchStore } from "@/os/stores/search.store";
import { useLocaleStore } from "@/os/i18n";
import { registerCommands, type Command } from "./registry";

/**
 * Built-in commands available immediately at boot. Any module can register
 * additional commands via `registerCommand(...)` — nothing else in this file
 * needs to change.
 */
const commands: Command[] = [
  // ---- Navigate ----
  {
    id: "navigate.home",
    title: "Go to Earth",
    group: "navigate",
    icon: EarthIcon,
    keybinding: "mod+1",
    run: (ctx) => ctx.navigate("/"),
  },
  {
    id: "navigate.ai",
    title: "Open AI Core",
    group: "navigate",
    icon: AIIcon,
    keybinding: "mod+shift+a",
    when: (ctx) => ctx.isAuthenticated,
    run: (ctx) => ctx.navigate("/ai-core"),
  },
  {
    id: "navigate.manage",
    title: "Your entities",
    group: "navigate",
    icon: LayersIcon,
    when: (ctx) => ctx.isAuthenticated,
    run: (ctx) => ctx.navigate("/manage"),
  },

  // ---- Search ----
  {
    id: "search.focus",
    title: "Focus global search",
    group: "search",
    icon: SearchIcon,
    keybinding: "/",
    run: () => useSearchStore.getState().focus(),
  },

  // ---- Create ----
  {
    id: "entity.create.business",
    title: "Create business",
    group: "create",
    icon: BusinessIcon,
    run: (ctx) => {
      if (!ctx.isAuthenticated) return ctx.goToAuth();
      useCreateStore.getState().openDialog("business");
    },
  },
  {
    id: "entity.create.property",
    title: "Create property",
    group: "create",
    icon: PropertyIcon,
    run: (ctx) => {
      if (!ctx.isAuthenticated) return ctx.goToAuth();
      useCreateStore.getState().openDialog("property");
    },
  },
  {
    id: "entity.create.event",
    title: "Create event",
    group: "create",
    icon: EventIcon,
    run: (ctx) => {
      if (!ctx.isAuthenticated) return ctx.goToAuth();
      useCreateStore.getState().openDialog("event");
    },
  },
  {
    id: "entity.create.product",
    title: "Create product",
    group: "create",
    icon: ProductIcon,
    run: (ctx) => {
      if (!ctx.isAuthenticated) return ctx.goToAuth();
      useCreateStore.getState().openDialog("product");
    },
  },

  // ---- System ----
  {
    id: "ui.toggle-locale",
    title: "Toggle language",
    group: "system",
    icon: LanguageIcon,
    keybinding: "mod+shift+l",
    run: () => useLocaleStore.getState().toggle(),
  },
  {
    id: "ui.open-palette",
    title: "Open command palette",
    group: "system",
    icon: CommandIcon,
    keybinding: "mod+k",
    run: () => {
      /* handled by palette layer keybinding; command is here for discoverability */
    },
  },
];

export function registerBuiltinCommands(): () => void {
  return registerCommands(commands);
}