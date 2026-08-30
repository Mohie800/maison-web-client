/**
 * Onboarding card — Figma `651:16704` and `651:16726`.
 *
 * Both steps are the same shell: the wordmark and a step line above a rounded
 * card whose first element is the progress bar. Unlike sign-in and sign-up,
 * these two frames have no brand panel — they sit centred on the surface tint,
 * which is why `/onboarding` lives outside the `(auth)` split-screen layout.
 */
export function OnboardingShell({
  step,
  stepLabel,
  wordmark,
  width = "narrow",
  children,
}: {
  step: 1 | 2;
  stepLabel: string;
  wordmark: string;
  /** `651:16708` is 460px; the interests card at `651:16730` is 520px. */
  width?: "narrow" | "wide";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`w-full ${width === "wide" ? "max-w-[520px]" : "max-w-[460px]"}`}
    >
      <p className="text-ink-900 text-[22px] font-extrabold">{wordmark}</p>
      <p className="text-ink-secondary mt-1 text-[13px] font-medium">
        {stepLabel}
      </p>

      {/* card — 651:16708 */}
      <div className="bg-base border-line-subtle mt-5 rounded-20 border p-8 shadow-[0_16px_20px_rgba(0,0,0,0.06)]">
        <div
          className="bg-tint h-1.5 w-full overflow-hidden rounded-[3px]"
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={2}
          aria-label={stepLabel}
        >
          <span
            className="bg-aqua block h-1.5 rounded-[3px]"
            style={{ width: step === 1 ? "50%" : "100%" }}
          />
        </div>

        <div className="mt-7">{children}</div>
      </div>
    </div>
  );
}
