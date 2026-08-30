"use client";

import { SELL_STEPS, type SellStep } from "../draft";

/**
 * The wizard chrome — Figma `651:5110` on Web_Sell_1_Category, identical on
 * all nine step frames: a numbered rail on the left, the step's own body on
 * the right, a rule, and Continue.
 *
 * The rail's steps are buttons, not decoration: a completed step can be
 * reopened, which the frame implies by numbering them and is what anyone
 * filling in nine screens expects.
 */
export function WizardShell({
  step,
  title,
  subtitle,
  stepLabels,
  labels,
  reachable,
  onStep,
  onBack,
  onContinue,
  canContinue,
  continueLabel,
  busy,
  children,
  errors,
}: {
  step: SellStep;
  title: string;
  subtitle: string;
  stepLabels: Record<SellStep, string>;
  labels: { heading: string; stepOf: string; back: string; continue: string };
  reachable: (step: SellStep) => boolean;
  onStep: (step: SellStep) => void;
  onBack: (() => void) | null;
  onContinue: () => void;
  canContinue: boolean;
  continueLabel?: string;
  busy?: boolean;
  children: React.ReactNode;
  /** Whatever the last save or submit reported. */
  errors: string[];
}) {
  const index = SELL_STEPS.indexOf(step);

  return (
    <div className="bg-surface pb-14">
      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-8 px-4 pt-12 lg:flex-row lg:gap-10 lg:px-0">
        {/* rail — 651:5113 onwards */}
        <div className="shrink-0 lg:w-[200px]">
          <h2 className="text-[22px] font-bold">{labels.heading}</h2>
          <p className="text-ink-secondary mt-1 text-[13px] font-medium">
            {labels.stepOf}
          </p>

          <ol className="mt-6 flex gap-x-4 gap-y-0 overflow-x-auto lg:flex-col">
            {SELL_STEPS.map((each, position) => {
              const done = position < index;
              const current = each === step;
              const open = reachable(each);
              return (
                <li key={each} className="flex shrink-0 flex-col lg:w-full">
                  <button
                    type="button"
                    onClick={() => open && onStep(each)}
                    disabled={!open}
                    aria-current={current ? "step" : undefined}
                    className="flex items-center gap-2 py-1 text-start disabled:cursor-default"
                  >
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                        current
                          ? "bg-aqua text-on-accent"
                          : done
                            ? "bg-action-tint text-action"
                            : "bg-fill-100 text-ink-tertiary"
                      }`}
                    >
                      {done ? "✓" : position + 1}
                    </span>
                    <span
                      className={`text-[14px] whitespace-nowrap ${
                        current
                          ? "font-semibold"
                          : done
                            ? "font-medium"
                            : "text-ink-tertiary font-medium"
                      }`}
                    >
                      {stepLabels[each]}
                    </span>
                  </button>
                  {position < SELL_STEPS.length - 1 && (
                    <span
                      className={`ms-3 hidden h-[26px] w-0.5 lg:block ${
                        done ? "bg-action" : "bg-line"
                      }`}
                      aria-hidden
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        {/* body — 651:5148 onwards */}
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="text-[28px] leading-[39.2px] font-bold">{title}</h1>
          <p className="text-ink-secondary mt-1 text-[14px]">{subtitle}</p>

          <div className="mt-8 flex flex-col gap-6">{children}</div>

          {/*
            Saving happens on every advance now, so an error can come from any
            step — not just the submit. It is shown here so the seller sees it
            wherever they are, rather than only on the last screen.
          */}
          {errors.length > 0 && (
            <ul
              className="text-error mt-6 flex flex-col gap-1 text-[13px]"
              role="alert"
            >
              {errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}

          {/* 651:5175 — the rule, then the primary on the trailing edge. */}
          <div className="bg-line-subtle mt-10 h-px w-full" />
          <div className="mt-5 flex items-center justify-between gap-4">
            {/* 651:5239 — a bordered secondary, not a bare link. */}
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="bg-base border-line flex h-12 w-[120px] items-center justify-center rounded-12 border text-[15px] font-semibold"
              >
                {labels.back}
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={onContinue}
              disabled={!canContinue || busy}
              className="bg-aqua text-on-accent flex h-12 w-full max-w-[220px] items-center justify-center rounded-12 text-[15px] font-semibold disabled:opacity-50"
            >
              {continueLabel ?? labels.continue}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
