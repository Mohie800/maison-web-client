import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createAddress, updateAddress } from "../actions";
import { primaryCta } from "./checkout-shell";
import { Toggle } from "./toggle";
import type { Address } from "@/lib/api/schemas/checkout";

/**
 * Add / edit a delivery address — Figma `651:7667`.
 *
 * Validation is left to the API so there is one rule rather than two that can
 * disagree. `country` is not a field: the design has none and every address is
 * Saudi today, so it is sent as `SA` by the action.
 */
export async function AddressForm({
  address,
  cancelHref,
}: {
  /** Present when editing; absent when creating. */
  address?: Address;
  cancelHref: string;
}) {
  const t = await getTranslations("Checkout");
  const editing = Boolean(address);

  /**
   * On a new address the design pre-fills the buyer's own name and phone and
   * says so — the profile already has both, and most first orders ship to the
   * buyer.
   */
  const user = editing ? null : await getCurrentUser();
  const prefilled = Boolean(user?.fullName || user?.phoneNumber);

  return (
    <form
      action={editing ? updateAddress : createAddress}
      className="flex flex-col gap-4"
    >
      {editing && <input type="hidden" name="id" value={address!.id} />}
      <input type="hidden" name="next" value={cancelHref} />

      {!editing && prefilled && (
        <p className="bg-warn-tint text-amber-deep text-caption rounded-8 px-3 py-2">
          {t("prefilledFromProfile")}
        </p>
      )}

      <TextField
        name="label"
        label={t("fields.label")}
        defaultValue={address?.label ?? ""}
        placeholder={t("fields.labelPlaceholder")}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="recipientName"
          label={t("fields.fullName")}
          required
          defaultValue={address?.recipientName ?? user?.fullName ?? ""}
        />
        <TextField
          name="phone"
          label={t("fields.phone")}
          required
          type="tel"
          dir="ltr"
          placeholder="+9665…"
          defaultValue={address?.phone ?? user?.phoneNumber ?? ""}
        />
        <TextField
          name="city"
          label={t("fields.city")}
          required
          defaultValue={address?.city ?? ""}
        />
        <TextField
          name="area"
          label={t("fields.district")}
          defaultValue={address?.area ?? ""}
        />
      </div>

      <TextField
        name="street"
        label={t("fields.street")}
        required
        defaultValue={address?.street ?? ""}
      />
      <TextField
        name="postalCode"
        label={t("fields.postalCode")}
        dir="ltr"
        defaultValue={address?.postalCode ?? ""}
      />

      <Toggle
        name="isDefault"
        title={t("fields.setDefault")}
        hint={t("fields.setDefaultHint")}
        defaultChecked={address?.isDefault ?? true}
      />

      <button type="submit" className={primaryCta("mt-2")}>
        {t("saveAndContinue")}
      </button>
      <Link
        href={cancelHref}
        className="border-line text-label flex h-12 items-center justify-center rounded-[24px] border"
      >
        {t("cancel")}
      </Link>
    </form>
  );
}

function TextField({
  name,
  label,
  required,
  type = "text",
  dir,
  placeholder,
  defaultValue,
}: {
  name: string;
  label: string;
  required?: boolean;
  type?: string;
  dir?: "ltr" | "rtl";
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-caption text-ink-secondary">
        {label}
        {required && <span className="text-error ms-1">*</span>}
      </span>
      <input
        name={name}
        type={type}
        dir={dir}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="border-line bg-surface text-body placeholder:text-ink-tertiary focus:border-focus h-11 rounded-8 border px-3 outline-none"
      />
    </label>
  );
}
