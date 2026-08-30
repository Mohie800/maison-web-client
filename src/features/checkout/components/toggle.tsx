/**
 * The pill switch the design uses for "Save as default address", "Save card for
 * future orders" and "Donate to Ehsan" — Figma `651:7667`, `651:7841`, `651:7932`.
 *
 * A styled checkbox rather than a Radix switch: these all sit inside plain
 * server-action forms, so the control has to submit a value without JavaScript.
 */
export function Toggle({
  name,
  title,
  hint,
  defaultChecked,
}: {
  name: string;
  title: string;
  hint?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span className="flex flex-col">
        <span className="text-label">{title}</span>
        {hint && <span className="text-caption text-ink-tertiary">{hint}</span>}
      </span>

      <span className="relative inline-block h-6 w-11 shrink-0">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          className="peer sr-only"
        />
        <span className="bg-tint peer-checked:bg-action peer-focus-visible:ring-focus/50 block size-full rounded-full transition-colors peer-focus-visible:ring-3" />
        <span className="absolute top-0.5 start-0.5 size-5 rounded-full bg-white shadow-sm transition-transform peer-checked:ltr:translate-x-5 peer-checked:rtl:-translate-x-5" />
      </span>
    </label>
  );
}

/**
 * The same switch as a visual only, for state that lives in the URL rather than
 * in a form — the Ehsan donation on the payment step. The caller wraps it in the
 * link that flips the state.
 */
export function ToggleGlyph({ on }: { on: boolean }) {
  return (
    <span aria-hidden className="relative inline-block h-6 w-11 shrink-0">
      <span
        className={`block size-full rounded-full transition-colors ${
          on ? "bg-action" : "bg-tint"
        }`}
      />
      <span
        className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-all ${
          on ? "end-0.5" : "start-0.5"
        }`}
      />
    </span>
  );
}
