import { Store, House, CalendarDays, Package, type LucideIcon } from "@/os/icons";
import type { EntityType } from "@/modules/entity/types";

export interface MetaField {
  key: string;
  label: string;
  placeholder?: string;
}

export interface EntityTypeConfig {
  type: EntityType;
  label: string;
  plural: string;
  icon: LucideIcon;
  /** Literal color used for WebGL globe points (theme tokens don't apply on canvas). */
  color: string;
  /** Category-specific metadata fields shown in the create form. */
  fields: MetaField[];
  /** How to render a short subtitle from metadata on cards. */
  summary: (metadata: Record<string, unknown>) => string;
}

const str = (v: unknown): string => (v == null ? "" : String(v));

export const ENTITY_TYPE_CONFIG: Record<EntityType, EntityTypeConfig> = {
  business: {
    type: "business",
    label: "Business",
    plural: "Businesses",
    icon: Store,
    color: "#34d399",
    fields: [
      { key: "category", label: "Category", placeholder: "Cafe, Retail, Services…" },
      { key: "hours", label: "Hours", placeholder: "9am - 6pm" },
    ],
    summary: (m) => [str(m.category), str(m.hours)].filter(Boolean).join(" · "),
  },
  property: {
    type: "property",
    label: "Property",
    plural: "Properties",
    icon: House,
    color: "#60a5fa",
    fields: [
      { key: "price", label: "Price", placeholder: "$1,200,000" },
      { key: "beds", label: "Bedrooms", placeholder: "3" },
      { key: "baths", label: "Bathrooms", placeholder: "2" },
      { key: "sqft", label: "Area (sqft)", placeholder: "1800" },
    ],
    summary: (m) => {
      const parts = [str(m.price)];
      if (m.beds) parts.push(`${str(m.beds)} bd`);
      if (m.baths) parts.push(`${str(m.baths)} ba`);
      return parts.filter(Boolean).join(" · ");
    },
  },
  event: {
    type: "event",
    label: "Event",
    plural: "Events",
    icon: CalendarDays,
    color: "#fbbf24",
    fields: [
      { key: "date", label: "Date", placeholder: "2026-08-14" },
      { key: "time", label: "Time", placeholder: "6:00 PM" },
      { key: "price", label: "Price", placeholder: "Free / $49" },
    ],
    summary: (m) => [str(m.date), str(m.time), str(m.price)].filter(Boolean).join(" · "),
  },
  product: {
    type: "product",
    label: "Product",
    plural: "Products",
    icon: Package,
    color: "#c084fc",
    fields: [
      { key: "price", label: "Price", placeholder: "$120" },
      { key: "condition", label: "Condition", placeholder: "New / Used" },
      { key: "shipping", label: "Shipping", placeholder: "Worldwide" },
    ],
    summary: (m) => [str(m.price), str(m.condition)].filter(Boolean).join(" · "),
  },
};

export const ENTITY_TYPE_LIST = Object.values(ENTITY_TYPE_CONFIG);

export function colorForType(type: EntityType): string {
  return ENTITY_TYPE_CONFIG[type].color;
}
