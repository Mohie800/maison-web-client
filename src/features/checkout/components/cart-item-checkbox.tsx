import { Check } from "lucide-react";

/**
 * Include/exclude an item from checkout.
 *
 * A form submit rather than a controlled input, so it works without JavaScript.
 * The box is drawn with a `<span>`, not the shadcn `<Checkbox>`: that renders a
 * Radix `<button role="checkbox">`, and a button inside this submit button is
 * invalid HTML that React reports as a hydration error. `aria-pressed` on the
 * real button is what carries the state.
 */
export function CartItemCheckbox({
  id,
  selected,
  action,
  selectLabel,
  deselectLabel,
}: {
  id: string;
  selected: boolean;
  action: (formData: FormData) => Promise<void>;
  selectLabel: string;
  deselectLabel: string;
}) {
  return (
    <form action={action} className="flex items-center">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        aria-pressed={selected}
        aria-label={selected ? deselectLabel : selectLabel}
        className="focus-visible:ring-focus/50 cursor-pointer rounded-[4px] outline-none focus-visible:ring-3"
      >
        <span
          aria-hidden
          className={`flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
            selected ? "border-action bg-action text-on-accent" : "border-line"
          }`}
        >
          {selected && <Check className="size-3.5" />}
        </span>
      </button>
    </form>
  );
}
