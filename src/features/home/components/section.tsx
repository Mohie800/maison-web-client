import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

/**
 * Shared section shell for the homepage rails: title, optional subtitle, and a
 * trailing "View all" link. The chevron is direction-aware — it must point
 * left in Arabic, which `rtl:rotate-180` handles.
 */
export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  actionHref,
  invert = false,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
  invert?: boolean;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h2 className={`text-h1 ${invert ? "text-white" : ""}`}>{title}</h2>
        {subtitle && (
          <p
            className={`text-body ${invert ? "text-white/60" : "text-ink-secondary"}`}
          >
            {subtitle}
          </p>
        )}
      </div>

      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="text-label text-action flex shrink-0 items-center gap-1"
        >
          {actionLabel}
          <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
        </Link>
      )}
    </div>
  );
}

export function Section({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="mx-auto max-w-[1440px] px-4 py-14 lg:px-20">
        {children}
      </div>
    </section>
  );
}

/**
 * Rendered where a section's data can't be fetched because the API doesn't
 * support the query yet. Deliberately visible rather than an empty div: a
 * silently missing rail looks like a bug, and a fabricated one is worse.
 */
export function SectionUnavailable({
  message,
  invert = false,
}: {
  message: string;
  invert?: boolean;
}) {
  return (
    <div
      className={`rounded-12 border border-dashed p-8 text-center ${
        invert
          ? "border-white/20 text-white/50"
          : "border-line text-ink-tertiary"
      }`}
    >
      <p className="text-body">{message}</p>
    </div>
  );
}
