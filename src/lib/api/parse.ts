import type { z } from "zod";

/**
 * Validates an API response against a hand-written schema.
 *
 * Development and preview: throws, so a shape change fails loudly and
 * immediately while someone is looking at it.
 *
 * Production: logs and passes the data through unvalidated. A backend adding an
 * unexpected field, or nulling one we assumed present, should not white-screen a
 * product page — the component's own optional handling is a better last line of
 * defence than a hard crash.
 */
export function parseResponse<S extends z.ZodTypeAny>(
  schema: S,
  data: unknown,
  context: string,
): z.output<S> {
  const result = schema.safeParse(data);

  if (result.success) return result.data;

  if (process.env.NODE_ENV === "production") {
    console.error(
      `[api] response shape mismatch at ${context}:`,
      result.error.issues.slice(0, 5),
    );
    return data as z.output<S>;
  }

  throw new Error(
    `[api] response shape mismatch at ${context}\n` +
      result.error.issues
        .slice(0, 10)
        .map((i) => `  · ${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("\n"),
  );
}
