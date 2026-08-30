import { getTranslations } from "next-intl/server";

/**
 * Listing attributes as chips — Figma node 651:4420 (the Size and Color rows).
 *
 * `attributes` is a free-form JSON blob on the listing (`{ size: "XS",
 * color: ["other"] }`), so the keys aren't a fixed set. Each key becomes a row
 * and each value a chip.
 *
 * These are **read-only**. The design draws them as a selector, but a listing is
 * a single second-hand item — one size, one colour. There is no variant model in
 * the API, and nothing to switch to. Rendering them as pickable would imply a
 * choice that doesn't exist.
 */
const SWATCHES: Record<string, string> = {
  black: "#111827",
  white: "#FFFFFF",
  grey: "#9CA3AF",
  gray: "#9CA3AF",
  red: "#DC2626",
  blue: "#2563EB",
  green: "#059669",
  yellow: "#F6C90E",
  beige: "#E5D3B3",
  brown: "#78350F",
  pink: "#EC4899",
  purple: "#8B5CF6",
};

/** Foreign keys the blob carries alongside real attributes — a raw UUID chip. */
const INTERNAL_KEYS = new Set(["materialId", "brandId", "categoryId"]);

export async function ProductAttributes({
  attributes,
}: {
  attributes: Record<string, unknown> | null | undefined;
}) {
  const t = await getTranslations("Pdp");

  const rows = Object.entries(attributes ?? {}).filter(
    ([key, value]) =>
      !INTERNAL_KEYS.has(key) &&
      value !== null && value !== undefined && value !== "" &&
      !(Array.isArray(value) && value.length === 0),
  );

  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {rows.map(([key, value]) => {
        const values = Array.isArray(value) ? value.map(String) : [String(value)];
        const isColour = key.toLowerCase() === "color" || key.toLowerCase() === "colour";

        return (
          <div key={key} className="flex flex-col gap-2">
            <span className="text-label capitalize">
              {t.has(`attributes.${key}`) ? t(`attributes.${key}`) : key}
            </span>

            <div className="flex flex-wrap items-center gap-2">
              {values.map((entry) => {
                const swatch = isColour
                  ? SWATCHES[entry.toLowerCase()]
                  : undefined;

                return (
                  <span
                    key={entry}
                    className="border-line text-caption flex items-center gap-2 rounded-10 border px-3 py-2"
                  >
                    {swatch && (
                      <span
                        className="border-line size-4 rounded-full border"
                        style={{ backgroundColor: swatch }}
                        aria-hidden
                      />
                    )}
                    <span className="capitalize" dir="auto">
                      {entry}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
