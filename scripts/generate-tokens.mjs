/**
 * Generates src/styles/tokens.css from design/figma-tokens.json.
 *
 * Run: npm run tokens
 *
 * Why a generator rather than hand-written CSS: the Figma file holds two colour
 * collections (Colors-Light / Colors-Dark) with identical variable names, and
 * they change. Transcribing ~29 token pairs by hand twice is how a design system
 * quietly drifts out of sync. Re-read the Figma variables, update the JSON, rerun.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = resolve(root, "design/figma-tokens.json");
const OUT = resolve(root, "src/styles/tokens.css");

const tokens = JSON.parse(readFileSync(SRC, "utf8"));
const colors = Object.entries(tokens.color);

const declare = (mode) =>
  colors.map(([name, v]) => `  --${name}: ${v[mode]};`).join("\n");

/** Tailwind v4 colour utilities: bg-surface, text-ink, border-line, … */
const themeColors = colors
  .map(([name, v]) => `  --color-${v.tw}: var(--${name});`)
  .join("\n");

const themeText = Object.entries(tokens.typography)
  .filter(([k]) => !k.startsWith("$"))
  .map(
    ([name, t]) =>
      `  --text-${name}: ${t.size / 16}rem;\n  --text-${name}--line-height: ${t.lineHeight / 16}rem;\n  --text-${name}--font-weight: ${t.weight};`,
  )
  .join("\n");

/**
 * Spacing is deliberately NOT emitted as `--spacing-*` tokens.
 *
 * Naming steps after their pixel value (`--spacing-16: 1rem`) looks tidy but is
 * a trap. Tailwind v4 still resolves any *undefined* numeric step dynamically
 * against the 0.25rem base, so `p-16` would be 16px while `h-38` silently
 * became 152px — same syntax, two different meanings, no error.
 *
 * It also collides with shadcn/ui, whose components are authored against the
 * standard scale (`h-9` = 36px). Two mental models in one codebase produces
 * exactly the kind of bug nobody catches in review.
 *
 * So: the standard Tailwind scale applies (`p-4` = 16px), and off-scale values
 * from the design are written explicitly as `h-[38px]`. The designed scale
 * below is documentation for reviewers, not a compiler constraint.
 */
const themeSpacing = `  /* Designed spacing scale (px): ${tokens.spacing.join(", ")}
     Use the standard Tailwind scale: 4→p-1, 8→p-2, 12→p-3, 16→p-4,
     20→p-5, 24→p-6, 32→p-8, 40→p-10, 56→p-14. Anything else: [Npx]. */`;

const themeRadius = tokens.radius
  .map((n) => `  --radius-${n}: ${n / 16}rem;`)
  .join("\n");

const css = `/**
 * GENERATED FILE — DO NOT EDIT.
 * Source: design/figma-tokens.json  ·  Regenerate: npm run tokens
 * Figma: ${tokens.$meta.fileKey} (design system node ${tokens.$meta.nodes.designSystem})
 */

:root {
${declare("light")}
}

.dark {
${declare("dark")}
}

@theme inline {
${themeColors}

${themeText}

${themeSpacing}

${themeRadius}
}
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, css, "utf8");
console.log(
  `tokens: wrote ${colors.length} colour pairs, ${Object.keys(tokens.typography).length - 1} text styles → src/styles/tokens.css`,
);
