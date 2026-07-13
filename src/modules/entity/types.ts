// Client-safe shared types for the universal entity engine.

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export type EntityType = "business" | "property" | "event" | "product";

export const ENTITY_TYPES: EntityType[] = ["business", "property", "event", "product"];

/** Lightweight point used to render entities on the globe. */
export interface EntityPoint {
  id: string;
  type: EntityType;
  title: string;
  lat: number;
  lng: number;
}

/** A search result with enough context to show in a list. */
export interface EntitySearchResult extends EntityPoint {
  description: string;
}

/** A grid-hash cluster of entities returned by the server. */
export interface EntityCluster {
  clusterKey: string;
  lat: number;
  lng: number;
  count: number;
  /** Dominant type when the cluster is homogeneous; null otherwise. */
  type: EntityType | null;
  /** When count === 1, the underlying entity id (so clicks go straight to detail). */
  sampleId: string | null;
}

/** Full entity detail. */
export interface EntityDetail {
  id: string;
  type: EntityType;
  title: string;
  description: string;
  metadata: Record<string, JsonValue>;
  lat: number;
  lng: number;
  createdAt: string;
}

/** An entity owned by the current user (dashboard). */
export interface MyEntity extends EntityDetail {
  published: boolean;
  updatedAt: string;
}
