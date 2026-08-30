"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

/**
 * The Appearance row — Figma `651:9539`, "Light Mode" with a switch.
 *
 * Drives the same `next-themes` state as the util bar, so the two never
 * disagree. Rendered unchecked until mounted: next-themes has nothing to
 * report on the server, and guessing would flip the switch after hydration.
 */
export function ThemeToggleRow({ label }: { label: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  // `false` on the server, `true` once hydrated — without the effect-then-
  // setState dance the lint rule rightly objects to.
  const mounted = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

  const light = mounted ? resolvedTheme !== "dark" : true;

  return (
    <label className="flex cursor-pointer items-center gap-3 px-4 py-3.5 text-[13px]">
      <span className="flex-1">{label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={light}
        onChange={(event) => setTheme(event.target.checked ? "light" : "dark")}
        className="sr-only"
      />
      <span
        aria-hidden
        className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
          light ? "bg-action-deep" : "bg-fill-100"
        }`}
      >
        <span
          className={`bg-base size-5 rounded-full transition-transform ${
            light ? "translate-x-5 rtl:-translate-x-5" : ""
          }`}
        />
      </span>
    </label>
  );
}

/** Nothing to subscribe to — the value only differs between server and client. */
const subscribeNever = () => () => {};
