"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/format/money";
import {
  EMPTY_DRAFT,
  SELL_STEPS,
  categoryTypeForSlug,
  stepComplete,
  toCreateBody,
  type CategoryType,
  type SellDraft,
  type SellStep,
} from "../draft";
import { publishListingAction } from "../actions";
import type { SellBrand, SellCategory, TrackSchema } from "../types";
import { WizardShell } from "./wizard-shell";
import { StepCategory } from "./steps/step-category";
import { StepType } from "./steps/step-type";
import { StepDetails } from "./steps/step-details";
import { StepCondition } from "./steps/step-condition";
import { StepPhotos } from "./steps/step-photos";
import { StepAuthenticity } from "./steps/step-authenticity";
import { StepPricing } from "./steps/step-pricing";
import { StepShipping } from "./steps/step-shipping";
import { StepReview } from "./steps/step-review";

/**
 * The nine-step sell flow — Figma `651:5102`.
 *
 * One route rather than nine: the API cannot hold a partial listing, so there
 * is no draft id to put in a URL. See ../draft.ts. Work is kept in
 * `sessionStorage` so a refresh doesn't lose it, and the listing is created
 * and submitted in one go from the review step.
 */
const STORAGE_KEY = "maison.sell.draft.v1";

export function SellWizard({
  tree,
  brands,
  schemas,
  feePercent,
}: {
  tree: SellCategory[];
  brands: SellBrand[];
  schemas: Record<CategoryType, TrackSchema | null>;
  /** From `GET /settings/fees` — the earnings cards are worked from it. */
  feePercent: number;
}) {
  const t = useTranslations("Sell");
  const [draft, setDraft] = useState<SellDraft>(EMPTY_DRAFT);
  const [step, setStep] = useState<SellStep>("category");
  const [submitted, setSubmitted] = useState<{ id: string; status: string } | null>(
    null,
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [restored, setRestored] = useState(false);

  // Restoring has to happen after mount: the server has no sessionStorage, so
  // reading it during render would hydrate a different tree than it sent.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
      if (saved) setDraft({ ...EMPTY_DRAFT, ...JSON.parse(saved) });
    } catch {
      // A corrupt or blocked store just means starting fresh.
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Private mode, or the photos pushed it over quota — the wizard still
      // works, it just won't survive a refresh.
    }
  }, [draft, restored]);

  const patch = (next: Partial<SellDraft>) =>
    setDraft((current) => ({ ...current, ...next }));

  const branch = useMemo(() => findNames(tree, draft.categoryId), [tree, draft.categoryId]);
  const schema = branch ? schemas[categoryTypeForSlug(branch.rootSlug)] : null;

  const index = SELL_STEPS.indexOf(step);
  const canContinue = stepComplete(step, draft);
  const reachable = (target: SellStep) => {
    const position = SELL_STEPS.indexOf(target);
    if (position <= index) return true;
    // Only as far as the first step that isn't finished.
    return SELL_STEPS.slice(0, position).every((each) =>
      stepComplete(each, draft),
    );
  };

  const publish = () => {
    setErrors([]);
    startTransition(async () => {
      const result = await publishListingAction(
        toCreateBody(draft),
        draft.verifiedItems,
        draft.defects,
      );
      if (result.ok) {
        setSubmitted({ id: result.id, status: result.status });
        try {
          sessionStorage.removeItem(STORAGE_KEY);
        } catch {
          // Nothing to clean up.
        }
        return;
      }
      setErrors(
        result.messages.length
          ? result.messages
          : [t(`errors.${result.error}` as "errors.requestFailed")],
      );
    });
  };

  if (submitted) {
    return (
      <Submitted
        draft={draft}
        status={submitted.status}
        onAnother={() => {
          setDraft(EMPTY_DRAFT);
          setStep("category");
          setSubmitted(null);
        }}
      />
    );
  }

  const stepLabels = Object.fromEntries(
    SELL_STEPS.map((each) => [each, t(`steps.${each}`)]),
  ) as Record<SellStep, string>;

  return (
    <WizardShell
      step={step}
      title={t(`titles.${step}`)}
      subtitle={t(`subtitles.${step}`)}
      stepLabels={stepLabels}
      labels={{
        heading: t("heading"),
        stepOf: t("stepOf", { step: index + 1, total: SELL_STEPS.length }),
        back: t("back"),
        continue: t("continue"),
      }}
      reachable={reachable}
      onStep={setStep}
      onBack={index > 0 ? () => setStep(SELL_STEPS[index - 1]) : null}
      onContinue={
        step === "review" ? publish : () => setStep(SELL_STEPS[index + 1])
      }
      canContinue={canContinue}
      continueLabel={step === "review" ? t("submitForReview") : undefined}
      busy={pending}
    >
      {step === "category" && (
        <StepCategory
          tree={tree}
          categoryId={draft.categoryId}
          onPick={(leafId, topId) =>
            patch({ categoryId: leafId, topCategoryId: topId, attributes: {} })
          }
          labels={{
            types: {
              fashion: {
                name: t("types.fashion.name"),
                blurb: t("types.fashion.blurb"),
              },
              electronics: {
                name: t("types.electronics.name"),
                blurb: t("types.electronics.blurb"),
              },
              furniture: {
                name: t("types.furniture.name"),
                blurb: t("types.furniture.blurb"),
              },
              toys_art: {
                name: t("types.toys_art.name"),
                blurb: t("types.toys_art.blurb"),
              },
            },
            subCategory: t("subCategory"),
            pickOne: t("pickOne"),
          }}
        />
      )}

      {step === "type" && (
        <StepType
          draft={draft}
          onChange={patch}
          labels={{
            options: {
              sell: { title: t("listing.sell.title"), body: t("listing.sell.body") },
              trade: { title: t("listing.trade.title"), body: t("listing.trade.body") },
              auction: {
                title: t("listing.auction.title"),
                body: t("listing.auction.body"),
              },
            },
            footnote: t("listing.footnote"),
          }}
        />
      )}

      {step === "details" && (
        <StepDetails
          draft={draft}
          schema={schema}
          brands={brands}
          onChange={patch}
          labels={{
            title: t("fields.title"),
            titlePlaceholder: t("fields.titlePlaceholder"),
            brand: t("fields.brand"),
            brandNone: t("fields.brandNone"),
            description: t("fields.description"),
            descriptionPlaceholder: t("fields.descriptionPlaceholder"),
            charLimit: (max) => t("fields.charLimit", { max }),
            required: t("fields.required"),
            yes: t("fields.yes"),
            no: t("fields.no"),
          }}
          attributeLabel={(key) => label(t, `attributes.${key}`, key)}
          optionLabel={(key, option) =>
            label(t, `options.${option}`, humanise(option))
          }
        />
      )}

      {step === "condition" && (
        <StepCondition
          draft={draft}
          schema={schema}
          onChange={patch}
          labels={{ flaws: t("flaws") }}
          conditionLabel={(value) => ({
            title: label(t, `conditions.${value}.title`, humanise(value)),
            body: label(t, `conditions.${value}.body`, ""),
          })}
          defectLabel={(code) => label(t, `defects.${code}`, humanise(code))}
        />
      )}

      {step === "photos" && (
        <StepPhotos
          draft={draft}
          onChange={patch}
          labels={{
            addCover: t("photos.addCover"),
            tip: t("photos.tip"),
            remove: t("photos.remove"),
            needMore: (min) => t("photos.needMore", { min }),
            tooLarge: t("photos.tooLarge"),
          }}
        />
      )}

      {step === "authenticity" && (
        <StepAuthenticity
          draft={draft}
          onChange={patch}
          labels={{
            legend: t("authenticity.legend"),
            scoreLater: t("authenticity.scoreLater"),
          }}
          itemLabel={(item) =>
            label(t, `verification.${item}`, humanise(item))
          }
        />
      )}

      {step === "pricing" && (
        <StepPricing
          draft={draft}
          onChange={patch}
          feePercent={feePercent}
          labels={{
            price: t("pricing.price"),
            discount: t("pricing.discount"),
            earnings: t("pricing.earnings"),
            buyerPays: t("pricing.buyerPays"),
            buyerPaysAfter: (amount) => t("pricing.buyerPaysAfter", { amount }),
            vat: t("pricing.vat"),
            platformFee: (percent) => t("pricing.platformFee", { percent }),
            youReceive: t("pricing.youReceive"),
            vatNote: (amount) => t("pricing.vatNote", { amount }),
            startingBid: t("pricing.startingBid"),
            reservePrice: t("pricing.reservePrice"),
            duration: t("pricing.duration"),
            hours: (hours) => t("pricing.hours", { hours }),
          }}
        />
      )}

      {step === "shipping" && (
        <StepShipping
          draft={draft}
          onChange={patch}
          labels={{
            city: t("shipping.city"),
            fulfillment: t("shipping.fulfillment"),
            payer: t("shipping.payer"),
            note: t("shipping.note"),
          }}
          cityLabel={(city) => label(t, `cities.${city}`, city)}
          methodLabel={(method) => label(t, `fulfillment.${method}`, humanise(method))}
          payerLabel={(payer) => label(t, `payers.${payer}`, humanise(payer))}
        />
      )}

      {step === "review" && (
        <StepReview
          draft={draft}
          feePercent={feePercent}
          categoryName={branch?.leafName ?? null}
          brandName={
            brands.find((brand) => brand.id === draft.brandId)?.name ?? null
          }
          onChange={patch}
          labels={{
            listPrice: t("review.listPrice"),
            youReceive: (percent) => t("review.youReceive", { percent }),
            shipsFrom: t("review.shipsFrom"),
            note: t("review.note"),
            sale: t("review.sale"),
            auction: t("review.auction"),
            trade: t("review.trade"),
          }}
          conditionLabel={(value) =>
            label(t, `conditions.${value}.title`, humanise(value))
          }
          cityLabel={(city) => label(t, `cities.${city}`, city)}
          errors={errors}
        />
      )}
    </WizardShell>
  );
}

/** Web_Sell_Submitted — 651:5986. */
function Submitted({
  draft,
  status,
  onAnother,
}: {
  draft: SellDraft;
  status: string;
  onAnother: () => void;
}) {
  const t = useTranslations("Sell");
  // The frame promises a review. Whether one happens is the API's answer, not
  // the design's — see GAP-76.
  const live = status === "live";

  return (
    <div className="bg-surface flex justify-center px-4 pt-16 pb-14">
      <div className="bg-base border-line-subtle flex w-full max-w-[560px] flex-col items-center gap-4 rounded-20 border p-10 text-center">
        <span className="bg-success-tint text-success flex size-14 items-center justify-center rounded-full">
          <Check className="size-7" aria-hidden />
        </span>
        <h1 className="text-[24px] font-bold">
          {live ? t("submitted.liveTitle") : t("submitted.title")}
        </h1>
        <p className="text-ink-secondary text-[14px]">
          {live ? t("submitted.liveBody") : t("submitted.body")}
        </p>

        <div className="bg-surface mt-2 flex w-full items-center gap-3 rounded-12 p-3.5 text-start">
          <span className="bg-tint size-12 shrink-0 overflow-hidden rounded-8">
            {draft.photos[0] && (
              // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
              <img
                src={draft.photos[0]}
                alt=""
                className="size-full object-cover"
              />
            )}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[13px] font-semibold" dir="auto">
              {draft.title}
            </span>
            <span className="text-ink-secondary text-[12px]">
              {[
                draft.saleMode === "auction"
                  ? t("review.auction")
                  : t("review.sale"),
                formatPrice(Number(draft.originalPrice) || Number(draft.price) || 0, "SAR"),
                live ? t("submitted.live") : t("submitted.pending"),
              ].join(" · ")}
            </span>
          </span>
        </div>

        <Link
          href="/account/listings"
          className="bg-aqua text-on-accent mt-2 flex h-12 w-full items-center justify-center rounded-12 text-[15px] font-semibold"
        >
          {t("submitted.viewListings")}
        </Link>
        <button
          type="button"
          onClick={onAnother}
          className="bg-base border-line flex h-12 w-full items-center justify-center rounded-12 border text-[15px] font-semibold"
        >
          {t("submitted.listAnother")}
        </button>
      </div>
    </div>
  );
}

/** Falls back to a readable key when a label hasn't been translated yet. */
function label(
  t: ReturnType<typeof useTranslations<"Sell">>,
  key: string,
  fallback: string,
): string {
  return t.has(key as never) ? t(key as never) : fallback;
}

function humanise(value: string): string {
  return value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

function findNames(
  tree: SellCategory[],
  leafId: string | null,
): { rootSlug: string; leafName: string } | null {
  if (!leafId) return null;
  for (const root of tree) {
    if (root.id === leafId) return { rootSlug: root.slug, leafName: root.name };
    for (const child of root.children ?? []) {
      if (child.id === leafId)
        return { rootSlug: root.slug, leafName: child.name };
      for (const grandchild of child.children ?? []) {
        if (grandchild.id === leafId)
          return { rootSlug: root.slug, leafName: grandchild.name };
      }
    }
  }
  return null;
}
