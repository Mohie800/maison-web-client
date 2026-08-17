import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Physical direction utilities banned in favour of logical ones.
 *
 * Arabic RTL is a launch requirement, and this is the one thing that is
 * genuinely painful to retrofit: 110 screens of `ml-4` is a week of work to
 * undo. Catching it at lint time costs nothing.
 */
const PHYSICAL_TO_LOGICAL = {
  "ml-": "ms-",
  "mr-": "me-",
  "pl-": "ps-",
  "pr-": "pe-",
  "border-l": "border-s",
  "border-r": "border-e",
  "rounded-l": "rounded-s",
  "rounded-r": "rounded-e",
  "text-left": "text-start",
  "text-right": "text-end",
  "float-left": "float-start",
  "float-right": "float-end",
};

/**
 * The negative lookaheads matter: without them `border-l` matches the token
 * class `border-line`, and `rounded-l` matches `rounded-lg`. Both are
 * direction-neutral and must not be flagged.
 */
const physicalPattern =
  "(^|\\s)-?(ml-|mr-|pl-|pr-|border-l(?![a-z])|border-r(?![a-z])|rounded-l(?![a-z])|rounded-r(?![a-z])|text-left|text-right|float-left|float-right)";

const logicalHint = Object.entries(PHYSICAL_TO_LOGICAL)
  .map(([from, to]) => `${from} → ${to}`)
  .join(", ");

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `JSXAttribute[name.name="className"] Literal[value=/${physicalPattern}/]`,
          message: `Use logical CSS properties so the layout mirrors in Arabic (RTL). ${logicalHint}`,
        },
        {
          selector: `JSXAttribute[name.name="className"] TemplateElement[value.raw=/${physicalPattern}/]`,
          message: `Use logical CSS properties so the layout mirrors in Arabic (RTL). ${logicalHint}`,
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // CSS is not linted by the TS parser; tokens.css is generated anyway.
    "**/*.css",
    // Generated from the OpenAPI spec via `npm run api:types`.
    "src/types/api-generated.ts",
  ]),
]);

export default eslintConfig;
