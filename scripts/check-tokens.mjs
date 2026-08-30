/**
 * Fails when a Tailwind utility names a token that doesn't exist.
 *
 * Run: npm run check:tokens
 *
 * Why this exists: `rounded-14` and `bg-error-tint` are valid-looking class
 * names for values that were never in the scale, so Tailwind emits nothing and
 * the element renders with square corners or no background. Nothing errors, and
 * it only surfaces when somebody compares the screen to the Figma frame by eye.
 *
 * Anything genuinely off-scale belongs in brackets — `rounded-[14px]` — which
 * is explicit about being a one-off.
 *
 * Brackets are the escape hatch for a *measurement*, never for a *colour*. A
 * raw hex does not flip between light and dark, so `bg-[#FEF3C7]` stays a light
 * yellow on a dark page while everything around it inverts. Twenty-nine of them
 * had accumulated by 2026-08-30 — ten were token values typed by hand and four
 * were a token's dark value hardcoded, so they were wrong in light mode. This
 * check exists so that cannot come back.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const css =
  readFileSync(join(root, "src/styles/tokens.css"), "utf8") +
  readFileSync(join(root, "src/app/globals.css"), "utf8");

const colours = new Set([
  ...[...css.matchAll(/--color-([a-z0-9-]+):/g)].map((m) => m[1]),
  // shadcn primitives in src/components/ui declare their own palette.
  ...[...css.matchAll(/--([a-z][a-z0-9-]*)\s*:\s*(?:oklch|hsl|var|#)/g)].map((m) => m[1]),
]);
const radii = new Set([...css.matchAll(/--radius-(\d+):/g)].map((m) => m[1]));
const texts = new Set(
  [...css.matchAll(/--text-([a-z0-9-]+):/g)].map((m) => m[1]),
);

/** Tailwind ships these regardless of our theme. */
const BUILTIN_COLOURS = new Set([
  "white", "black", "transparent", "current", "inherit", "auto", "none",
]);
const BUILTIN_TEXT = new Set([
  "xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl",
  "8xl", "9xl", "left", "right", "center", "start", "end", "justify", "wrap",
  "nowrap", "balance", "pretty", "ellipsis", "clip", "middle", "top", "bottom",
]);
const BUILTIN_RADII = new Set(["none", "full", "sm", "md", "lg", "xl", "2xl", "3xl"]);

/**
 * Surfaces that are deliberately one fixed colour in both themes, and whose
 * values have no token. Both were verified against their frames.
 */
const HEX_ALLOWED = new Set([
  "src/features/home/components/ai-search-banner.tsx",
  "src/features/stories/components/story-viewer.tsx",
]);

/**
 * `bg-[#fff]`, `text-[#112233]`, `from-[#abc]` and friends.
 *
 * Built fresh per call. A shared /g regex carries lastIndex between uses and
 * silently starts matching mid-line — which is exactly how this rule first
 * shipped passing over a file that did contain a raw hex.
 */
const rawHex = () =>
  /(?:bg|text|border|from|via|to|fill|stroke|ring|shadow|outline|decoration|accent|caret)-[#[0-9a-fA-F]{3,8}]/g;

function* files(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* files(full);
    else if (/\.(tsx|ts)$/.test(entry)) yield full;
  }
}

const problems = [];

for (const file of files(join(root, "src"))) {
  // Vendored shadcn primitives; their utilities come from globals.css.
  if (file.includes(join("components", "ui"))) continue;

  const source = readFileSync(file, "utf8");
  const lines = source.split("\n");

  const relative = file.slice(root.length + 1).split(sep).join("/");

  lines.forEach((line, i) => {
    const report = (cls, kind) =>
      problems.push(`${relative}:${i + 1}  ${cls}  (${kind})`);

    // A raw hex never flips between light and dark.
    if (!HEX_ALLOWED.has(relative)) {
      const hits = [...line.matchAll(rawHex())];
      for (const m of hits) {
        report(m[0], "raw hex — use a token, or add the file to HEX_ALLOWED");
      }
    }

    // Colour utilities. Gradient stops (from-/via-/to-) are left out: this
    // codebase doesn't use them, and 'to-' matches too much English prose.
    for (const m of line.matchAll(
      /\b(?:bg|text|border|ring|decoration|outline|accent|caret|divide|placeholder)-([a-z][a-z0-9-]*)\b/g,
    )) {
      const name = m[1];
      if (name.startsWith("[") || /^\d/.test(name)) continue;
      const cls = m[0];
      if (cls.startsWith("text-")) {
        if (colours.has(name) || texts.has(name) || BUILTIN_TEXT.has(name) || BUILTIN_COLOURS.has(name)) continue;
        // text-ink-500/text-h1 style names live in either scale.
        report(cls, "colour or text style");
        continue;
      }
      if (colours.has(name) || BUILTIN_COLOURS.has(name)) continue;
      // Utilities that aren't colour at all: border-solid, bg-cover, ring-inset…
      // Non-colour utilities that share these prefixes: widths, sides, keywords.
      if (/^[tblrsexy](-\d+)?$/.test(name)) continue;
      if (/^(solid|dashed|dotted|double|hidden|none|cover|contain|center|top|bottom|left|right|repeat|no-repeat|clip|clip-padding|clip-border|clip-content|clip-text|fixed|local|scroll|inset|separate|collapse|opacity|gradient-to-r|gradient-to-l|gradient-to-t|gradient-to-b|gradient-to-br|gradient-to-bl|gradient-to-tr|gradient-to-tl|origin|auto|blend-normal|blend-multiply)$/.test(name)) continue;
      report(cls, "colour");
    }

    // Radius: rounded-16 must exist in --radius-*; rounded-[14px] is fine.
    for (const m of line.matchAll(/\brounded(?:-[tblrse]{1,2})?-([a-z0-9]+)\b/g)) {
      const name = m[1];
      if (radii.has(name) || BUILTIN_RADII.has(name)) continue;
      report(m[0], "radius");
    }
  });
}

if (problems.length) {
  console.error(`✗ ${problems.length} utility/token mismatch(es):\n`);
  for (const p of problems) console.error("  " + p);
  console.error(
    "\nEither add the token to design/figma-tokens.json (with a note on where " +
      "the value came from) or use an explicit arbitrary value like rounded-[14px].",
  );
  process.exit(1);
}

console.log("✓ every colour and radius utility resolves to a token");
