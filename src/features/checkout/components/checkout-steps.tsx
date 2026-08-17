import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";

const STEPS = ["cart", "shipping", "payment", "confirmed"] as const;
export type CheckoutStep = (typeof STEPS)[number];

/** Progress indicator across the checkout flow. */
export async function CheckoutSteps({ current }: { current: CheckoutStep }) {
  const t = await getTranslations("Checkout");
  const currentIndex = STEPS.indexOf(current);

  return (
    <ol className="flex flex-wrap items-center gap-3">
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;

        return (
          <li key={step} className="flex items-center gap-3">
            <span className="flex items-center gap-2">
              <span
                className={`flex size-7 items-center justify-center rounded-full text-[11px] font-bold ${
                  done
                    ? "bg-action text-white"
                    : active
                      ? "bg-invert text-white"
                      : "bg-tint text-ink-tertiary"
                }`}
              >
                {done ? <Check className="size-3.5" aria-hidden /> : index + 1}
              </span>
              <span
                className={`text-caption ${
                  active ? "font-semibold" : "text-ink-tertiary"
                }`}
                aria-current={active ? "step" : undefined}
              >
                {t(`steps.${step}`)}
              </span>
            </span>
            {index < STEPS.length - 1 && (
              <span className="bg-line h-px w-6" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}
