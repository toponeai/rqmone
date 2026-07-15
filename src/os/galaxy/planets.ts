/**
 * R.Q.M.1 Galaxy — Module Planet Registry.
 *
 * Each planet corresponds to a top-level module of the OS. Ready planets
 * navigate to their route; upcoming planets open a "coming soon" window
 * without breaking flow. Adding a new module = one entry here.
 */
import {
  EarthIcon,
  AIIcon,
  MessagesIcon,
  WalletIcon,
  MarketplaceIcon,
  PeopleIcon,
  AnalyticsIcon,
  LiveIcon,
  type IconComponent,
} from "@/os/icons";

export type PlanetStatus = "ready" | "soon";

export interface Planet {
  id: string;
  /** i18n key for the label (defaults to module.<id>). */
  labelKey: string;
  icon: IconComponent;
  /** Hex/OKLCH surface color for the planet body. */
  color: string;
  /** Radius in px (relative to ring). */
  size: number;
  /** Status decides whether clicking navigates or opens the "soon" window. */
  status: PlanetStatus;
  /** Route to navigate to when status = ready. */
  route?: string;
  /** Short i18n key for the "coming soon" body when status = soon. */
  soonKey?: string;
}

export const PLANETS: Planet[] = [
  {
    id: "earth",
    labelKey: "module.earth",
    icon: EarthIcon,
    color: "#4fb3ff",
    size: 44,
    status: "ready",
    route: "/",
  },
  {
    id: "ai",
    labelKey: "module.ai",
    icon: AIIcon,
    color: "#c084fc",
    size: 40,
    status: "ready",
    route: "/ai-core",
  },
  {
    id: "manage",
    labelKey: "module.manage",
    icon: AnalyticsIcon,
    color: "#22d3ee",
    size: 38,
    status: "ready",
    route: "/manage",
  },
  {
    id: "messages",
    labelKey: "module.messages",
    icon: MessagesIcon,
    color: "#34d399",
    size: 38,
    status: "ready",
    route: "/messages",
  },
  {
    id: "wallet",
    labelKey: "module.wallet",
    icon: WalletIcon,
    color: "#fbbf24",
    size: 40,
    status: "soon",
    soonKey: "module.wallet.soon",
  },
  {
    id: "marketplace",
    labelKey: "module.marketplace",
    icon: MarketplaceIcon,
    color: "#f472b6",
    size: 42,
    status: "soon",
    soonKey: "module.marketplace.soon",
  },
  {
    id: "community",
    labelKey: "module.community",
    icon: PeopleIcon,
    color: "#a3e635",
    size: 36,
    status: "soon",
    soonKey: "module.community.soon",
  },
  {
    id: "live",
    labelKey: "module.live",
    icon: LiveIcon,
    color: "#fb7185",
    size: 36,
    status: "soon",
    soonKey: "module.live.soon",
  },
];
