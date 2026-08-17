import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware navigation. Import `Link`, `useRouter`, `redirect` and
 * `usePathname` from here — never from `next/link` or `next/navigation`, or the
 * locale prefix is dropped and the user is bounced to the default locale.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
