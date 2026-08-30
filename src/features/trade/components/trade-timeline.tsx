import { Check } from "lucide-react";
import type { TradeStep } from "../helpers";

/**
 * Trade timeline — `651:6461`. Six steps; each is reached because it carries a
 * timestamp, never because of where it sits in the list.
 *
 * Three dot states in the frame: passed (`t/action` with a white tick), current
 * (`accent/aqua` with a black tick and a bold green label, `651:6493`) and
 * future (a flat `t/border-200` disc).
 */
export function TradeTimeline({
  steps,
  labels,
  formatAt,
}: {
  steps: TradeStep[];
  labels: Record<string, { title: string; body: string }>;
  formatAt: (iso: string) => string;
}) {
  return (
    <ol className="flex w-full flex-col items-start">
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        const copy = labels[step.key];

        return (
          /* Row — 651:6464 */
          <li key={step.key} className="flex w-full items-start gap-4 pt-3.5">
            {/* Col — 651:6465 */}
            <div className="flex w-5 shrink-0 flex-col items-center">
              <span
                className={`flex size-5 items-center justify-center rounded-10 ${
                  step.current
                    ? "bg-aqua text-black"
                    : step.reached
                      ? "bg-action text-base"
                      : "bg-line-200"
                }`}
                aria-hidden
              >
                {step.reached && (
                  <Check className="size-2.5" strokeWidth={3.5} />
                )}
              </span>
              {!last && (
                <span
                  className={`h-7 w-0.5 ${
                    step.reached ? "bg-line-300" : "bg-line-200"
                  }`}
                  aria-hidden
                />
              )}
            </div>

            {/* Col — 651:6469 */}
            <div className="flex min-w-0 flex-1 flex-col items-start gap-[3px] pb-3.5">
              <span
                className={`text-[14px] ${
                  step.current
                    ? "text-action font-bold"
                    : step.reached
                      ? "text-ink-900 font-semibold"
                      : "text-ink-400 font-semibold"
                }`}
              >
                {copy.title}
              </span>
              <span
                className={`text-[12px] ${
                  step.reached ? "text-ink-500" : "text-ink-400"
                }`}
              >
                {copy.body}
              </span>
              {step.at && (
                <span className="text-ink-400 text-[11px]" dir="auto">
                  {formatAt(step.at)}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
