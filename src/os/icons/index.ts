/**
 * R.Q.M.1 OS — Global Icon Registry.
 *
 * Every icon used anywhere in the OS or a module MUST be re-exported here
 * under a semantic name. Modules import from `@/os/icons` only — never from
 * `lucide-react` directly. This lets us swap the icon set in one place.
 */
export {
  // System / shell
  Globe2 as EarthIcon,
  Home as HomeIcon,
  Search as SearchIcon,
  Plus as PlusIcon,
  Bell as BellIcon,
  MessageSquare as MessagesIcon,
  Settings as SettingsIcon,
  User as UserIcon,
  Users as PeopleIcon,
  LogIn as LoginIcon,
  LogOut as LogoutIcon,
  Menu as MenuIcon,
  X as CloseIcon,
  Minus as MinimizeIcon,
  Square as MaximizeIcon,
  Pin as PinIcon,
  Command as CommandIcon,
  Sparkles as AIIcon,
  Mic as VoiceIcon,
  ScanLine as ScanIcon,
  Languages as LanguageIcon,
  Sun as ThemeLightIcon,
  Moon as ThemeDarkIcon,
  MapPin as PinLocationIcon,
  Loader2 as LoaderIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ChevronDown as ChevronDownIcon,
  ChevronUp as ChevronUpIcon,
  ArrowLeft as ArrowLeftIcon,
  ArrowRight as ArrowRightIcon,
  MoreHorizontal as MoreIcon,
  Layers as LayersIcon,
  Share2 as ShareIcon,
  Bookmark as SaveIcon,
  Edit3 as EditIcon,
  Trash2 as DeleteIcon,
  // Module entry points (disabled until each module ships)
  ShoppingBag as MarketplaceIcon,
  Wallet as WalletIcon,
  BarChart3 as AnalyticsIcon,
  Radio as LiveIcon,
  Shield as AdminIcon,
  Briefcase as JobsIcon,
  // Entity types
  Store as BusinessIcon,
  Home as PropertyIcon,
  CalendarDays as EventIcon,
  Package as ProductIcon,
} from "lucide-react";

export type { LucideIcon as IconComponent } from "lucide-react";
