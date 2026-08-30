import { getTranslations } from "next-intl/server";

/**
 * Checkout progress bar — Figma `651:7551`, `651:7740`, `651:8043`.
 *
 * Three steps, not four: the design treats the bag as where checkout starts
 * from, not a step within it. Full-bleed white bar above the grey page.
 */
const STEPS = ["shipping", "payment", "confirmed"] as const;
export type CheckoutStep = (typeof STEPS)[number];

export async function CheckoutSteps({ current }: { current: CheckoutStep }) {
  const t = await getTranslations("Checkout");
  const currentIndex = STEPS.indexOf(current);

  return (
    <div className="bg-base border-line border-b">
      <ol className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-4 lg:px-20">
        {STEPS.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;

          return (
            <li key={step} className="flex items-center gap-3">
              <span className="flex items-center gap-2">
                <span
                  className={`flex size-[22px] items-center justify-center rounded-full text-[11px] font-bold ${
                    done
                      ? "bg-invert text-white"
                      : active
                        ? "bg-aqua text-on-accent"
                        : "bg-tint text-ink-tertiary"
                  }`}
                >
                  {index + 1}
                </span>
                <span
                  className={`text-body ${
                    active ? "font-semibold" : "text-ink-tertiary"
                  }`}
                  aria-current={active ? "step" : undefined}
                >
                  {t(`steps.${step}`)}
                </span>
              </span>
              {index < STEPS.length - 1 && (
                <span
                  className={`h-0.5 w-12 ${done ? "bg-invert" : "bg-line"}`}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
