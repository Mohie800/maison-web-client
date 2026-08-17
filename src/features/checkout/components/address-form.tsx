import { getTranslations } from "next-intl/server";
import { createAddress } from "../actions";

/**
 * New address form — Figma node 651:7667.
 *
 * A plain server-action form. Required fields mirror `CreateAddressDto`:
 * recipientName, phone, country, city, street. Validation is left to the API so
 * there is one rule rather than two that can disagree.
 */
export async function AddressForm() {
  const t = await getTranslations("Checkout");

  return (
    <form action={createAddress} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="label" label={t("fields.label")} />
        <TextField name="recipientName" label={t("fields.recipientName")} required />
        <TextField
          name="phone"
          label={t("fields.phone")}
          required
          type="tel"
          dir="ltr"
          placeholder="+9665…"
        />
        <TextField name="city" label={t("fields.city")} required />
        <TextField name="area" label={t("fields.area")} />
        <TextField
          name="country"
          label={t("fields.country")}
          required
          defaultValue="SA"
          dir="ltr"
        />
      </div>

      <TextField name="street" label={t("fields.street")} required />

      <div className="grid gap-4 sm:grid-cols-3">
        <TextField name="building" label={t("fields.building")} />
        <TextField name="apartment" label={t("fields.apartment")} />
        <TextField name="postalCode" label={t("fields.postalCode")} dir="ltr" />
      </div>

      <label className="flex items-center gap-2">
        <input type="checkbox" name="isDefault" defaultChecked className="size-4" />
        <span className="text-caption">{t("fields.setDefault")}</span>
      </label>

      <button
        type="submit"
        className="bg-aqua text-on-accent text-label flex h-12 items-center justify-center rounded-[24px] font-semibold"
      >
        {t("saveAddress")}
      </button>
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
    <label className="flex flex-col gap-2">
      <span className="text-label">
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
        className="border-line bg-base text-body placeholder:text-ink-tertiary h-12 rounded-12 border px-4 outline-none focus:border-focus"
      />
    </label>
  );
}
