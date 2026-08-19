/**
 * R.Q.M.1 Galaxy — Module Planet Registry.
 *
 * Each planet corresponds to a top-level module of the OS. Ready planets
 * navigate to their route; upcoming planets open a "coming soon" window
 * without breaking flow. Adding a new module = one entry here.
 *
 * Planets are grouped into "galaxies" so the Planet Navigator can render
 * them in concentric orbital rings without hardcoding.
 */
import {
  EarthIcon,
  AIIcon,
  MessagesIcon,
  BellIcon,
  WalletIcon,
  MarketplaceIcon,
  PeopleIcon,
  AnalyticsIcon,
  LiveIcon,
  AdminIcon,
  SettingsIcon,
  UserIcon,
  LayersIcon,
  BusinessIcon,
  JobsIcon,
  type IconComponent,
} from "@/os/icons";

export type PlanetStatus = "ready" | "soon";

export type GalaxyId = "core" | "comms" | "market" | "economy" | "analytics" | "admin";

export interface Planet {
  id: string;
  labelKey: string;
  icon: IconComponent;
  color: string;
  size: number;
  status: PlanetStatus;
  route?: string;
  soonKey?: string;
  galaxy: GalaxyId;
}

export const GALAXIES: { id: GalaxyId; labelKey: string }[] = [
  { id: "core", labelKey: "galaxy.core" },
  { id: "comms", labelKey: "galaxy.comms" },
  { id: "market", labelKey: "galaxy.market" },
  { id: "economy", labelKey: "galaxy.economy" },
  { id: "analytics", labelKey: "galaxy.analytics" },
  { id: "admin", labelKey: "galaxy.admin" },
];

export const PLANETS: Planet[] = [
  // Core
  {
    id: "earth",
    labelKey: "module.earth",
    icon: EarthIcon,
    color: "#4fb3ff",
    size: 44,
    status: "ready",
    route: "/",
    galaxy: "core",
  },
  {
    id: "ai",
    labelKey: "module.ai",
    icon: AIIcon,
    color: "#c084fc",
    size: 40,
    status: "ready",
    route: "/ai-core",
    galaxy: "core",
  },
  {
    id: "manage",
    labelKey: "module.manage",
    icon: LayersIcon,
    color: "#22d3ee",
    size: 38,
    status: "ready",
    route: "/manage",
    galaxy: "core",
  },
  // Comms
  {
    id: "messages",
    labelKey: "module.messages",
    icon: MessagesIcon,
    color: "#34d399",
    size: 38,
    status: "ready",
    route: "/messages",
    galaxy: "comms",
  },
  {
    id: "notifications",
    labelKey: "nav.notifications",
    icon: BellIcon,
    color: "#fb923c",
    size: 34,
    status: "ready",
    route: "/notifications",
    galaxy: "comms",
  },
  // Marketplace
  {
    id: "marketplace",
    labelKey: "module.marketplace",
    icon: MarketplaceIcon,
    color: "#f472b6",
    size: 42,
    status: "soon",
    soonKey: "module.marketplace.soon",
    galaxy: "market",
  },
  {
    id: "business",
    labelKey: "module.community",
    icon: BusinessIcon,
    color: "#a3e635",
    size: 36,
    status: "soon",
    soonKey: "module.community.soon",
    galaxy: "market",
  },
  {
    id: "jobs",
    labelKey: "nav.jobs",
    icon: JobsIcon,
    color: "#60a5fa",
    size: 36,
    status: "soon",
    soonKey: "module.soon.body",
    galaxy: "market",
  },
  // Economy
  {
    id: "wallet",
    labelKey: "module.wallet",
    icon: WalletIcon,
    color: "#fbbf24",
    size: 40,
    status: "soon",
    soonKey: "module.wallet.soon",
    galaxy: "economy",
  },
  // Analytics
  {
    id: "analytics",
    labelKey: "nav.analytics",
    icon: AnalyticsIcon,
    color: "#38bdf8",
    size: 36,
    status: "soon",
    soonKey: "module.soon.body",
    galaxy: "analytics",
  },
  {
    id: "live",
    labelKey: "module.live",
    icon: LiveIcon,
    color: "#fb7185",
    size: 36,
    status: "soon",
    soonKey: "module.live.soon",
    galaxy: "analytics",
  },
  {
    id: "community",
    labelKey: "module.community",
    icon: PeopleIcon,
    color: "#a3e635",
    size: 34,
    status: "soon",
    soonKey: "module.community.soon",
    galaxy: "analytics",
  },
  // Admin
  {
    id: "profile",
    labelKey: "nav.profile",
    icon: UserIcon,
    color: "#e2e8f0",
    size: 34,
    status: "soon",
    soonKey: "module.soon.body",
    galaxy: "admin",
  },
  {
    id: "settings",
    labelKey: "nav.settings",
    icon: SettingsIcon,
    color: "#94a3b8",
    size: 34,
    status: "soon",
    soonKey: "module.soon.body",
    galaxy: "admin",
  },
  {
    id: "admin",
    labelKey: "nav.admin",
    icon: AdminIcon,
    color: "#f43f5e",
    size: 34,
    status: "soon",
    soonKey: "module.soon.body",
    galaxy: "admin",
  },
];
