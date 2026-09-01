"use client";

import { useRef, useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { toggleLikeAction } from "../actions";

/**
 * The heart on a listing card — Figma `651:692`.
 *
 * A client island inside the otherwise server-rendered card. The fill is local
 * state set before the request goes out, so the heart flips on the click rather
 * than on the response; nothing here is ever disabled or spinner-gated, because
 * a like that waits on a round trip reads as a broken button.
 *
 * Rapid toggling is allowed to race. Both verbs are idempotent and `seq` makes
 * the newest click the only one that may write state, so a slow early response
 * cannot revert a later click.
 *
 * Signed-out visitors go to sign-in and come back, which is what Add to Cart
 * and Buy Now on the same card already do.
 */
export function LikeButton({
  listingId,
  initialLiked,
  labels,
}: {
  listingId: string;
  initialLiked: boolean;
  labels: { add: string; remove: string };
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [, startTransition] = useTransition();
  const seq = useRef(0);
  const router = useRouter();
  const pathname = usePathname();

  const toggle = () => {
    const next = !liked;
    const mine = ++seq.current;
    setLiked(next);

    startTransition(async () => {
      const result = await toggleLikeAction(listingId, next);
      // A newer click owns the state now — leave it alone.
      if (result === "ok" || mine !== seq.current) return;

      setLiked(!next);
      if (result === "unauthenticated") {
        router.push(`/sign-in?next=${encodeURIComponent(pathname)}`);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={liked}
      aria-label={liked ? labels.remove : labels.add}
      className={`bg-fill-100 flex size-[30px] shrink-0 cursor-pointer items-center justify-center rounded-[15px] ${
        liked ? "text-error" : "text-ink-500 hover:text-error"
      }`}
    >
      <Heart
        className="size-4 transition-transform duration-150 active:scale-90"
        fill={liked ? "currentColor" : "none"}
        aria-hidden
      />
    </button>
  );
}
