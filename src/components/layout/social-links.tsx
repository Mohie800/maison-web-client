import { getTranslations } from "next-intl/server";
import {
  InstagramIcon,
  LinkedInIcon,
  SnapchatIcon,
  TikTokIcon,
  WhatsAppIcon,
  XIcon,
} from "@/components/icons/social-icons";

/**
 * Footer social row — Figma node 678:658.
 *
 * "FOLLOW US" at 11px/0.66px tracking, then six 38px circles with a
 * `border/default` hairline and a 17px mark, 10px apart.
 *
 * All six channels always render, as the design shows them. Hrefs come from the
 * `Footer.social.*` translation strings so the business can set the real handles
 * without a code change; a channel left blank renders as a plain (non-clickable)
 * badge rather than a link to a page that doesn't exist.
 */
const CHANNELS = [
  { key: "x", label: "X", Icon: XIcon },
  { key: "instagram", label: "Instagram", Icon: InstagramIcon },
  { key: "tiktok", label: "TikTok", Icon: TikTokIcon },
  { key: "snapchat", label: "Snapchat", Icon: SnapchatIcon },
  { key: "whatsapp", label: "WhatsApp", Icon: WhatsAppIcon },
  { key: "linkedin", label: "LinkedIn", Icon: LinkedInIcon },
] as const;

export async function SocialLinks({ label }: { label: string }) {
  const t = await getTranslations("Footer");

  return (
    <div className="flex flex-wrap items-center gap-4">
      <p className="text-[11px] font-bold tracking-[0.66px] text-white/60 uppercase">
        {label}
      </p>
      <ul className="flex items-center gap-[10px]">
        {CHANNELS.map(({ key, label: name, Icon }) => {
          const href = t(`social.${key}`);
          const circle =
            "flex size-[38px] items-center justify-center rounded-full border border-line/85 text-white/85";

          return (
            <li key={key}>
              {href.startsWith("http") ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={name}
                  className={`${circle} transition-colors hover:border-white hover:text-white`}
                >
                  <Icon className="size-[17px]" />
                </a>
              ) : (
                <span className={circle} role="img" aria-label={name}>
                  <Icon className="size-[17px]" />
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
