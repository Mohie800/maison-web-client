/** What the sell wizard needs from the server, flattened for a client tree. */

export interface SellCategory {
  id: string;
  slug: string;
  name: string;
  iconUrl: string | null;
  children?: SellCategory[];
}

export interface SellBrand {
  id: string;
  name: string;
}

/**
 * `GET /lookups/track-schema/{type}` — the generated field list for a category
 * type. One Details step renders whatever this describes, which is why the
 * four `Web_Sell_3_Details_*` frames need only one implementation.
 */
export interface TrackField {
  kind: "enum" | "string" | "stringArray" | "number" | "boolean" | "object";
  required?: boolean;
  options?: string[];
  min?: number;
  fields?: Record<string, TrackField>;
}

export interface TrackSchema {
  allowedConditions: string[];
  attributes: Record<string, TrackField>;
  checklist: Record<string, { multi?: boolean; options: string[] }>;
}
