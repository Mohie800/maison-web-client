"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, Check, TriangleAlert } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { resolveMediaUrl } from "@/lib/api/media";

/**
 * Visual search — Figma `651:3680` (upload), `651:3716` (analysing),
 * `651:3767` (results found) and `651:3862` (nothing found).
 *
 * Client-side, unlike the rest of this codebase, because the flow is a file the
 * browser holds: it has to be read and base64-encoded before `POST
 * /search/visual` can see it, and the design's Analyzing screen only exists
 * because that request takes time. Everything the results link to is a normal
 * server-rendered page.
 *
 * Three controls in the frames are omitted, all for want of an endpoint:
 * **Take Photo with Webcam** (no capture flow designed past this screen),
 * **Notify Me When Listed** (nothing records interest in an unlisted item) and
 * **Try AI Search** (that flow isn't built — plans/09 C21). The four sort chips
 * on the results screen are omitted too: the API returns one ranked list and
 * re-sorting it here would relabel the server's ranking rather than change it.
 */
interface DetectedAttributes {
  brand?: string | null;
  color?: string | null;
  size?: string | null;
  type?: string | null;
  condition?: string | null;
  confidence?: number | null;
}

interface MatchListing {
  id: string;
  title?: string | null;
  price?: number | string | null;
  currency?: string | null;
  condition?: string | null;
  coverPhotoUrl?: string | null;
  seller?: { handle?: string | null } | null;
  city?: string | null;
}

interface Match {
  listing: MatchListing;
  matchScore?: number | null;
  matchType?: string | null;
}

interface VisualSearchResult {
  detectedAttributes?: DetectedAttributes | null;
  totalItemsScanned?: number | null;
  hasMatches?: boolean | null;
  exactMatch?: Match | null;
  similarItems?: Match[] | null;
}

type Phase = "idle" | "analysing" | "done" | "error";

const MAX_BYTES = 10 * 1024 * 1024;

export function VisualSearch() {
  const t = useTranslations("VisualSearch");
  const input = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<VisualSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function search(file: File) {
    if (file.size > MAX_BYTES) {
      setError(t("tooLarge"));
      setPhase("error");
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

    setPreview(dataUrl);
    setPhase("analysing");
    setError(null);

    try {
      const response = await fetch("/api/proxy/search/visual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: dataUrl }),
      });
      if (!response.ok) throw new Error(String(response.status));
      setResult((await response.json()) as VisualSearchResult);
      setPhase("done");
    } catch {
      setError(t("failed"));
      setPhase("error");
    }
  }

  function reset() {
    setPhase("idle");
    setPreview(null);
    setResult(null);
    setError(null);
    if (input.current) input.current.value = "";
  }

  /* ------------------------------------------------------ upload — 651:3689 */
  if (phase === "idle" || phase === "error") {
    return (
      <div className="mx-auto flex w-full max-w-[640px] flex-col items-center gap-7 px-4 pt-12 pb-16">
        {error && (
          <p
            role="alert"
            className="text-error flex w-full items-center gap-2 rounded-12 bg-error-tint px-4 py-3 text-[13px]"
          >
            <TriangleAlert className="size-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        {/* UploadZone — 651:3690 */}
        <label className="bg-success-tint border-action flex h-[260px] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-20 border-2 px-6 text-center">
          <span className="bg-action-tint text-action flex size-[60px] items-center justify-center rounded-full">
            <Camera className="size-6" aria-hidden />
          </span>
          <span className="text-[16px] font-semibold">{t("dropHere")}</span>
          <span className="text-ink-500 text-[13px]">{t("or")}</span>
          <span className="bg-action text-base flex h-11 w-[200px] items-center justify-center rounded-[22px] text-[13px] font-bold">
            {t("browse")}
          </span>
          <span className="text-ink-400 text-[11px]">{t("formats")}</span>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void search(file);
            }}
          />
        </label>

        {/* TipCard — 651:3705 */}
        <div className="bg-success-tint border-action flex w-full flex-col gap-2 rounded-12 border px-4 py-3.5">
          <p className="text-action text-[12px] font-semibold">{t("tipsTitle")}</p>
          {(["lighting", "framing", "background"] as const).map((tip) => (
            <p key={tip} className="flex items-center gap-2">
              <span className="bg-action size-1.5 shrink-0 rounded-full" aria-hidden />
              <span className="text-ink-500 text-[12px]">{t(`tips.${tip}`)}</span>
            </p>
          ))}
        </div>
      </div>
    );
  }

  /* --------------------------------------------------- analysing — 651:3725 */
  if (phase === "analysing") {
    return (
      <div className="mx-auto flex w-full max-w-[860px] flex-col gap-[60px] px-4 pt-12 pb-16 lg:flex-row">
        {/* ImgP — 651:3727 */}
        <div className="bg-fill-100 relative size-[380px] shrink-0 overflow-hidden rounded-16">
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element -- a local data: URL
            <img src={preview} alt="" className="size-full object-cover" />
          )}
          <span className="bg-action absolute inset-x-0 top-1/2 h-[2px] opacity-50" aria-hidden />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <span className="bg-action-tint border-action text-action flex h-[26px] w-fit items-center rounded-[13px] border px-2.5 text-[10px] font-bold">
            {t("searchingBadge")}
          </span>

          {/* StCard — 651:3749 */}
          <div className="bg-base border-line flex flex-col gap-3 rounded-12 border p-3.5">
            {(["captured", "detected", "searching"] as const).map((step) => (
              <p key={step} className="flex items-center gap-2.5">
                <span className="bg-action text-base flex size-[18px] items-center justify-center rounded-full">
                  <Check className="size-2" aria-hidden />
                </span>
                <span className="text-[12px]">{t(`steps.${step}`)}</span>
              </p>
            ))}
            <p className="flex items-center gap-2.5">
              <span className="bg-line-200 size-[18px] rounded-full" aria-hidden />
              <span className="text-ink-400 text-[12px]">{t("steps.matching")}</span>
            </p>
            <span className="bg-line-200 h-1.5 w-full overflow-hidden rounded-[3px]">
              <span className="bg-action block h-1.5 w-[70%] rounded-[3px]" />
            </span>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------ results — 651:3784 */
  const detected = result?.detectedAttributes;
  const exact = result?.exactMatch;
  const similar = result?.similarItems ?? [];
  const found = Boolean(result?.hasMatches && (exact || similar.length > 0));

  const chips = [
    detected?.brand && { label: t("detected.brand"), value: detected.brand },
    detected?.color && { label: t("detected.color"), value: detected.color },
    detected?.type && { label: t("detected.type"), value: detected.type },
    detected?.size && { label: t("detected.size"), value: detected.size },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="flex flex-col">
      {/* Banner — 651:3776 found, 651:3871 not found */}
      <div
        className={`flex items-center gap-3.5 px-4 py-3.5 lg:px-20 ${
          found ? "bg-action-tint" : "bg-warn-tint"
        }`}
      >
        <span
          className={`flex size-11 shrink-0 items-center justify-center rounded-full ${
            found ? "bg-action text-base" : "bg-warn-tint3 text-amber-deep"
          }`}
        >
          {found ? (
            <Check className="size-4" aria-hidden />
          ) : (
            <TriangleAlert className="size-4" aria-hidden />
          )}
        </span>
        <div
          className={`flex min-w-0 flex-1 flex-col gap-0.5 ${
            found ? "text-action" : "text-amber-text"
          }`}
        >
          <p className="text-[16px] font-bold">
            {found
              ? t("foundTitle", { count: (exact ? 1 : 0) + similar.length })
              : t("notFoundTitle")}
          </p>
          <p className="text-[12px]">
            {found ? t("foundBody") : t("notFoundBody")}
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className={`flex h-9 shrink-0 items-center justify-center rounded-[18px] border px-4 text-[12px] font-medium ${
            found ? "bg-base border-action text-action" : "bg-base border-line"
          }`}
        >
          {t("newSearch")}
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pt-7 pb-16 lg:px-20">
        {/* Detected attributes — the analysing card's content, kept on results. */}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <span
                key={chip.label}
                className="bg-action-tint border-action flex h-6 items-center gap-1 rounded-12 border px-2 text-[9px]"
              >
                <span className="text-ink-500">{chip.label}</span>
                <span className="text-action font-bold">{chip.value}</span>
              </span>
            ))}
          </div>
        )}

        {exact && (
          <>
            <p className="text-action text-[14px] font-bold">{t("exactMatch")}</p>
            {/* ExactCard — 651:3796 */}
            <div className="bg-base border-action flex flex-col gap-5 rounded-16 border-2 p-4 sm:flex-row sm:items-center">
              <span className="bg-fill-100 h-[100px] w-[100px] shrink-0 overflow-hidden rounded-12">
                {resolveMediaUrl(exact.listing.coverPhotoUrl) && (
                  // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                  <img
                    src={resolveMediaUrl(exact.listing.coverPhotoUrl)!}
                    alt=""
                    className="size-full object-cover"
                  />
                )}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="text-[18px] font-bold" dir="auto">
                  {exact.listing.title}
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-action text-[24px] font-bold" dir="ltr">
                    {exact.listing.currency ?? "SAR"} {exact.listing.price}
                  </span>
                  {exact.listing.seller?.handle && (
                    <span className="text-ink-500 text-[12px]" dir="ltr">
                      @{exact.listing.seller.handle}
                    </span>
                  )}
                </div>
                <Link
                  href={`/products/${exact.listing.id}`}
                  className="bg-action text-base flex h-11 w-[160px] items-center justify-center rounded-[22px] text-[14px] font-bold"
                >
                  {t("viewItem")}
                </Link>
              </div>
            </div>
          </>
        )}

        {similar.length > 0 && (
          <>
            <p className="text-[14px] font-bold">
              {found ? t("similarItems") : t("youMightLike")}
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {similar.map((match) => {
                const photo = resolveMediaUrl(match.listing.coverPhotoUrl);
                return (
                  <Link
                    key={match.listing.id}
                    href={`/products/${match.listing.id}`}
                    className="bg-base border-line flex flex-col overflow-hidden rounded-[14px] border"
                  >
                    <span className="bg-fill-100 relative block h-[160px]">
                      {photo && (
                        // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                        <img src={photo} alt="" className="size-full object-cover" />
                      )}
                      {match.matchScore != null && (
                        <span className="bg-action text-base absolute start-2 top-2 flex h-[22px] items-center rounded-[11px] px-2 text-[9px] font-bold">
                          {t("matchScore", { score: Math.round(match.matchScore) })}
                        </span>
                      )}
                    </span>
                    <span className="flex flex-col gap-1.5 px-3 pt-2.5 pb-3">
                      <span className="truncate text-[13px] font-semibold" dir="auto">
                        {match.listing.title}
                      </span>
                      {match.listing.condition && (
                        <span className="text-ink-500 text-[11px]">
                          {t(`conditions.${match.listing.condition}`)}
                        </span>
                      )}
                      <span className="text-[14px] font-bold" dir="ltr">
                        {match.listing.currency ?? "SAR"} {match.listing.price}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {!found && similar.length === 0 && (
          <p className="border-line text-ink-tertiary rounded-16 border border-dashed p-10 text-center text-[13px]">
            {t("nothingAtAll")}
          </p>
        )}
      </div>
    </div>
  );
}
