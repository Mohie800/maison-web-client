import { z } from "zod";

/**
 * `GET /lookups/track-schema/{type}` — the API generates the sell wizard's
 * field list per category type, which is why one Details step covers the four
 * `Web_Sell_3_Details_*` frames.
 */
const trackFieldSchema: z.ZodType<{
  kind: string;
  required?: boolean;
  options?: string[];
  min?: number;
  fields?: Record<string, unknown>;
}> = z.lazy(() =>
  z.object({
    kind: z.string(),
    required: z.boolean().optional(),
    options: z.array(z.string()).optional(),
    min: z.number().optional(),
    fields: z.record(z.string(), trackFieldSchema).optional(),
  }),
);

export const trackSchemaSchema = z.object({
  allowedConditions: z.array(z.string()).default([]),
  attributes: z.record(z.string(), trackFieldSchema).default({}),
  checklist: z
    .record(
      z.string(),
      z.object({
        multi: z.boolean().optional(),
        options: z.array(z.string()).default([]),
      }),
    )
    .default({}),
});
