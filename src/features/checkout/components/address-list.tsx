import { getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { setDefaultAddress } from "../actions";
import type { Address } from "@/lib/api/schemas/checkout";

/**
 * Saved delivery addresses — Figma `651:7551`.
 *
 * Selecting is a form submit (`PATCH /addresses/{id}/default`) rather than a
 * controlled radio, so the step works without JavaScript. The radio dot is a
 * `<span>`: a real `<input type="radio">` inside a submit button would need JS
 * to do anything, and nesting interactive elements is invalid markup.
 */
export async function AddressList({
  addresses,
  selectedId,
  editHref,
  addHref,
}: {
  addresses: Address[];
  selectedId?: string;
  editHref: (id: string) => string;
  addHref: string;
}) {
  const t = await getTranslations("Checkout");

  return (
    <>
      {addresses.length === 0 ? (
        <p className="text-body text-ink-secondary mb-3">{t("noAddresses")}</p>
      ) : (
        <ul className="mb-3 flex flex-col gap-3">
          {addresses.map((address) => {
            const active = address.id === selectedId;
            const lines = [address.street, address.area, address.city, address.postalCode]
              .filter(Boolean)
              .join(", ");

            return (
              <li
                key={address.id}
                className={`relative rounded-12 border p-4 ${
                  active ? "border-action bg-action-tint" : "border-line"
                }`}
              >
                <form action={setDefaultAddress}>
                  <input type="hidden" name="id" value={address.id} />
                  <button
                    type="submit"
                    aria-pressed={active}
                    className="flex w-full items-start gap-3 text-start"
                  >
                    <span
                      aria-hidden
                      className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full ${
                        active ? "bg-action" : "bg-tint"
                      }`}
                    >
                      {active && <span className="size-1.5 rounded-full bg-white" />}
                    </span>

                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex flex-wrap items-center gap-2">
                        {address.isDefault && (
                          <span className="bg-action text-[10px] font-bold tracking-[0.06em] text-white uppercase rounded-[4px] px-1.5 py-0.5">
                            {t("defaultAddress")}
                          </span>
                        )}
                        <span className="text-label">
                          {address.label || address.recipientName}
                        </span>
                      </span>
                      {address.label && (
                        <span className="text-caption text-ink-secondary">
                          {address.recipientName}
                        </span>
                      )}
                      <span className="text-caption text-ink-tertiary" dir="ltr">
                        {address.phone}
                      </span>
                      <span className="text-caption text-ink-secondary">{lines}</span>
                    </span>
                  </button>
                </form>

                {/* Outside the form: a button inside a button is invalid markup. */}
                <Link
                  href={editHref(address.id)}
                  className="border-line text-caption bg-base absolute end-4 top-4 flex h-8 items-center rounded-8 border px-3"
                >
                  {t("edit")}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href={addHref}
        className="border-line text-label text-action flex h-12 items-center justify-center gap-2 rounded-12 border"
      >
        <Plus className="size-4" aria-hidden />
        {t("addAddress")}
      </Link>
    </>
  );
}
