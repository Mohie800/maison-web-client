import { getTranslations } from "next-intl/server";
import { AlertCircle } from "lucide-react";

/**
 * Renders the `?error=` code a failed Server Action redirected with.
 *
 * The codes are translated rather than echoing the API's own message: the
 * server's strings are informative ("Insufficient balance. Available: 0 SAR")
 * but English-only, and these screens are bilingual. `requestFailed` is the
 * catch-all for anything unmapped, so a new server-side error still surfaces
 * as a visible failure rather than a silent no-op.
 */
export async function WalletError({ code }: { code: string | null }) {
  if (!code) return null;

  const t = await getTranslations("Wallet");
  const key = t.has(`errors.${code}`) ? `errors.${code}` : "errors.requestFailed";

  return (
    <p
      role="alert"
      className="text-label flex items-center gap-2 rounded-12 bg-error-tint px-4 py-3 text-error"
    >
      <AlertCircle className="size-4 shrink-0" aria-hidden />
      {t(key)}
    </p>
  );
}
