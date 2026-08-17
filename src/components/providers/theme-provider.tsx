"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Class-based theming to match the token setup: light values live on `:root`,
 * dark on `.dark` (src/styles/tokens.css), which is also the variant shadcn
 * generates against.
 *
 * `defaultTheme="light"` rather than "system": every customer-facing screen in
 * the Figma file is designed light, and the dark palette — though complete in
 * the handoff — has not been design-reviewed for these screens. Opting users in
 * by OS preference would ship an unreviewed look. See plans/06 G15.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
