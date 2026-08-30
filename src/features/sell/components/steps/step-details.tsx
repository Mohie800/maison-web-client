"use client";

import { DESCRIPTION_MAX, TITLE_MAX, type SellDraft } from "../../draft";
import type { SellBrand, TrackField, TrackSchema } from "../../types";

/**
 * Step 3 — Figma `651:5288` (Web_Sell_3_Details) and its Electronics,
 * Furniture and Toys variants (`651:5315`, `651:5399`, `651:5483`).
 *
 * Title, Brand and Description are fixed; everything between them is generated
 * from `GET /lookups/track-schema/{type}`, which is what makes one step cover
 * all four frames. The frame's Fashion example shows "Size 40"; `size` for
 * fashion is the enum XS–3XL, and the enum is what renders.
 */
export function StepDetails({
  draft,
  schema,
  brands,
  onChange,
  labels,
  attributeLabel,
  optionLabel,
}: {
  draft: SellDraft;
  schema: TrackSchema | null;
  brands: SellBrand[];
  onChange: (patch: Partial<SellDraft>) => void;
  labels: {
    title: string;
    titlePlaceholder: string;
    brand: string;
    brandNone: string;
    description: string;
    descriptionPlaceholder: string;
    charLimit: (max: number) => string;
    required: string;
    yes: string;
    no: string;
  };
  attributeLabel: (key: string) => string;
  optionLabel: (key: string, option: string) => string;
}) {
  const setAttribute = (key: string, value: string | string[]) =>
    onChange({ attributes: { ...draft.attributes, [key]: value } });

  const entries = Object.entries(schema?.attributes ?? {});

  return (
    <>
      {/* Title — 651:5289 */}
      <Field label={labels.title} hint={labels.charLimit(TITLE_MAX)}>
        <input
          value={draft.title}
          onChange={(event) => onChange({ title: event.target.value })}
          maxLength={TITLE_MAX}
          placeholder={labels.titlePlaceholder}
          dir="auto"
          className="bg-base border-line h-12 w-full rounded-12 border px-4 text-[14px] outline-none"
        />
      </Field>

      {/* Brand — 651:5292 */}
      <Field label={labels.brand}>
        <select
          value={draft.brandId ?? ""}
          onChange={(event) =>
            onChange({ brandId: event.target.value || null })
          }
          className="bg-base border-line h-12 w-full rounded-12 border px-4 text-[14px] outline-none"
        >
          <option value="">{labels.brandNone}</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
      </Field>

      {/* Generated — the frame's Size / Color / Material row and its variants */}
      <div className="grid gap-6 sm:grid-cols-2">
        {entries.map(([key, field]) => (
          <div
            key={key}
            className={field.kind === "object" ? "sm:col-span-2" : undefined}
          >
            <AttributeField
              name={key}
              field={field}
              value={draft.attributes[key]}
              onChange={(value) => setAttribute(key, value)}
              label={attributeLabel(key)}
              optionLabel={(option) => optionLabel(key, option)}
              labels={labels}
              onObjectChange={(subKey, value) =>
                setAttribute(key, {
                  ...(typeof draft.attributes[key] === "object" &&
                  !Array.isArray(draft.attributes[key])
                    ? (draft.attributes[key] as unknown as Record<
                        string,
                        string
                      >)
                    : {}),
                  [subKey]: value,
                } as unknown as string[])
              }
            />
          </div>
        ))}
      </div>

      {/* Description — 651:5307 */}
      <Field
        label={labels.description}
        hint={labels.charLimit(DESCRIPTION_MAX)}
      >
        <textarea
          value={draft.description}
          onChange={(event) => onChange({ description: event.target.value })}
          maxLength={DESCRIPTION_MAX}
          rows={3}
          placeholder={labels.descriptionPlaceholder}
          dir="auto"
          className="bg-base border-line min-h-[92px] w-full rounded-12 border p-4 text-[14px] outline-none"
        />
      </Field>
    </>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold">{label}</span>
      {children}
      {hint && <span className="text-ink-tertiary text-[11px]">{hint}</span>}
    </label>
  );
}

/** One generated field, by `kind`. */
function AttributeField({
  name,
  field,
  value,
  onChange,
  onObjectChange,
  label,
  optionLabel,
  labels,
}: {
  name: string;
  field: TrackField;
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
  onObjectChange: (key: string, value: string) => void;
  label: string;
  optionLabel: (option: string) => string;
  labels: { required: string; yes: string; no: string };
}) {
  const heading = field.required ? `${label} *` : label;
  const input =
    "bg-base border-line h-12 w-full rounded-12 border px-4 text-[14px] outline-none";

  if (field.kind === "enum" && field.options) {
    return (
      <Field label={heading}>
        <select
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          className={input}
        >
          <option value="">—</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {optionLabel(option)}
            </option>
          ))}
        </select>
      </Field>
    );
  }

  if (field.kind === "stringArray") {
    const list = Array.isArray(value) ? value : [];
    // With options it's a checkbox set; without, a comma-separated field —
    // `color` on fashion has no option list but is still an array.
    if (field.options) {
      return (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[13px] font-semibold">{heading}</legend>
          <div className="flex flex-wrap gap-2">
            {field.options.map((option) => {
              const on = list.includes(option);
              return (
                <label
                  key={option}
                  className={`flex cursor-pointer items-center gap-2 rounded-10 border px-3 py-2 text-[13px] ${
                    on
                      ? "border-action bg-action-tint text-action"
                      : "border-line text-ink-secondary"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() =>
                      onChange(
                        on
                          ? list.filter((each) => each !== option)
                          : [...list, option],
                      )
                    }
                    className="sr-only"
                  />
                  {optionLabel(option)}
                </label>
              );
            })}
          </div>
        </fieldset>
      );
    }
    return (
      <Field label={heading}>
        <input
          value={list.join(", ")}
          onChange={(event) =>
            onChange(
              event.target.value
                .split(",")
                .map((each) => each.trim())
                .filter(Boolean),
            )
          }
          dir="auto"
          className={input}
        />
      </Field>
    );
  }

  if (field.kind === "boolean") {
    return (
      <Field label={heading}>
        <select
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          className={input}
        >
          <option value="">—</option>
          <option value="true">{labels.yes}</option>
          <option value="false">{labels.no}</option>
        </select>
      </Field>
    );
  }

  if (field.kind === "object" && field.fields) {
    const held =
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as unknown as Record<string, string>)
        : {};
    return (
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[13px] font-semibold">{heading}</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {Object.entries(field.fields).map(([subKey, sub]) => (
            <label key={subKey} className="flex flex-col gap-1.5">
              <span className="text-ink-secondary text-[12px]">
                {optionLabel(subKey)}
              </span>
              <input
                type={sub.kind === "number" ? "number" : "text"}
                min={sub.min}
                value={held[subKey] ?? ""}
                onChange={(event) => onObjectChange(subKey, event.target.value)}
                dir="ltr"
                className={input}
              />
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  return (
    <Field label={heading}>
      <input
        type={field.kind === "number" ? "number" : "text"}
        min={field.min}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
        dir={field.kind === "number" ? "ltr" : "auto"}
        className={input}
        name={name}
      />
    </Field>
  );
}
