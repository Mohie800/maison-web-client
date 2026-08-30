/**
 * The six avatar tints on the conversation list — `651:6807`, `651:6818`,
 * `651:6829`, `651:6838`, `651:6847`, `651:6856`.
 *
 * The design cycles through them down the list. Keying off the participant's id
 * instead means the same person keeps the same colour wherever they appear,
 * which is what the colours are for.
 */
const AVATAR_TINTS = [
  "bg-action-tint text-action",
  "bg-warn-tint text-amber-deep",
  "bg-info-tint text-info",
  "bg-purple-tint text-purple-text",
  "bg-pink-tint text-purple-600",
  "bg-fill-100 text-ink-700",
] as const;

export function avatarTint(id: string | null | undefined): string {
  if (!id) return AVATAR_TINTS[5];
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_TINTS[hash % AVATAR_TINTS.length];
}

/** Two-letter monogram, matching the "LF" / "SK" initials in the frames. */
export function initials(name: string | null | undefined): string {
  const clean = (name ?? "").trim();
  if (!clean) return "?";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

/**
 * The list's right-hand timestamp — "2 min", "1 hr", "Yesterday", "2 days".
 *
 * Written out rather than handed to `Intl.RelativeTimeFormat`, because the
 * frame's shortened forms ("2 min", not "2 minutes ago") have no equivalent
 * numeric style, and next-intl's `relativeTime` returns the long form.
 */
export function shortAge(
  iso: string | null | undefined,
  labels: {
    now: string;
    min: string;
    hr: string;
    yesterday: string;
    days: string;
  },
): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const minutes = Math.floor((Date.now() - then) / 60000);
  if (minutes < 1) return labels.now;
  if (minutes < 60) return labels.min.replace("{n}", String(minutes));

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return labels.hr.replace("{n}", String(hours));

  const days = Math.floor(hours / 24);
  if (days === 1) return labels.yesterday;
  return labels.days.replace("{n}", String(days));
}

/**
 * An attachment we are willing to render.
 *
 * `attachmentUrl` on a message is stored exactly as the sender supplied it —
 * the API accepts `https://example.com/tracker.png`, `javascript:alert(1)` and
 * `../../etc/passwd` alike (GAP-88). Rendering one straight into an `<img>`
 * would fetch an attacker-chosen host from the recipient's browser, handing
 * over their IP and user agent.
 *
 * So only an upload path we serve ourselves is rendered; anything else is
 * treated as no attachment at all.
 */
export function safeAttachmentUrl(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const path = value.trim();
  if (!path.startsWith("/uploads/")) return null;
  if (path.includes("..") || path.includes("\\")) return null;
  return path;
}
