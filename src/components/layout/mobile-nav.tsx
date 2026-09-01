"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useTheme } from "next-themes";
import {
  ChevronDown,
  CircleDollarSign,
  Globe,
  Menu,
  Moon,
  Search,
  Sun,
  X,
} from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

export interface MobileNavCategory {
  id: string;
  name: string;
}

/**
 * The phone/tablet navigation drawer.
 *
 * Everything the desktop chrome puts in the util bar, the header nav and the
 * sub-nav is `hidden lg:*`, so below 1024px there was no route to categories,
 * auctions, trade, the trend hub, the language switch or the theme toggle at
 * all. This is that missing door; the desktop chrome is unchanged.
 */
export function MobileNav({
  categories,
  signedIn,
}: {
  categories: MobileNavCategory[];
  signedIn: boolean;
}) {
  const t = useTranslations("Chrome");
  const tNav = useTranslations("Nav");
  const tAccount = useTranslations("Account");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onEscape);
    // The panel scrolls itself; the page behind it must not.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const other =
    routing.locales.find((l) => l !== locale) ?? routing.defaultLocale;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("menu")}
        aria-expanded={open}
        className="text-ink -ms-2 flex size-11 shrink-0 items-center justify-center rounded-full lg:hidden"
      >
        <Menu className="size-6" aria-hidden />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={t("closeMenu")}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("menu")}
            className="bg-base absolute inset-y-0 start-0 flex w-[86vw] max-w-[340px] flex-col overflow-y-auto overscroll-contain shadow-xl"
            // Any row that navigates also dismisses the panel; the routes here
            // are all client-side, so nothing else unmounts it.
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a")) setOpen(false);
            }}
          >
            <div className="border-line-200 flex h-14 shrink-0 items-center justify-between border-b px-4">
              <span className="text-ink-900 text-[15px] font-bold">
                {t("menu")}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("closeMenu")}
                className="text-ink-500 -me-2 flex size-11 items-center justify-center rounded-full"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            {/* Plain GET form, so search works here with no JavaScript too. */}
            <form action={`/${locale}/search`} className="shrink-0 p-4">
              <div className="bg-surface border-line-200 flex h-11 items-center gap-2 rounded-[22px] border px-4">
                <Search className="text-ink-500 size-4 shrink-0" aria-hidden />
                <input
                  type="search"
                  name="q"
                  placeholder={t("searchPlaceholder")}
                  aria-label={t("searchPlaceholder")}
                  className="text-ink placeholder:text-ink-550 h-full min-w-0 flex-1 bg-transparent text-[14px] outline-none"
                />
              </div>
            </form>

            <nav className="flex flex-col pb-4">
              <Row href="/">{tNav("home")}</Row>

              {categories.length > 0 && (
                <details className="group">
                  <summary className="text-ink-900 flex min-h-12 items-center justify-between px-4 py-3 text-[15px] font-medium marker:content-none [&::-webkit-details-marker]:hidden">
                    {t("categories")}
                    <ChevronDown
                      className="text-ink-500 size-4 transition-transform group-open:rotate-180"
                      aria-hidden
                    />
                  </summary>
                  <div className="flex flex-col">
                    {categories.map((category) => (
                      <Row
                        key={category.id}
                        href={`/products?categoryId=${category.id}`}
                        indented
                      >
                        {category.name}
                      </Row>
                    ))}
                    <Row href="/categories" indented>
                      {t("viewAll")}
                    </Row>
                  </div>
                </details>
              )}

              <Row href="/products">{t("all")}</Row>
              <Row href="/brands">{t("brands")}</Row>
              <Row href="/auctions" tone="text-error">
                {tNav("auctions")}
              </Row>
              <Row href="/trade" tone="text-purple">
                {tNav("trade")}
              </Row>
              <Row href="/trends" tone="text-gold">
                {t("trendHub")}
              </Row>
              <Row href="/bundles">{tNav("bundles")}</Row>

              <Divider />

              {signedIn ? (
                <>
                  <Row href="/account">{tNav("account")}</Row>
                  <Row href="/inbox">{tNav("inbox")}</Row>
                  <Row href="/account/wishlist">{tNav("wishlist")}</Row>
                  <Row href="/account/notifications">{t("notifications")}</Row>
                  <Row href="/account/orders">{tAccount("nav.orders")}</Row>
                </>
              ) : (
                <Row href="/sign-in">{tNav("signIn")}</Row>
              )}

              <Divider />

              <button
                type="button"
                onClick={() => router.replace(pathname, { locale: other })}
                className="text-ink-700 flex min-h-12 items-center gap-2.5 px-4 py-3 text-start text-[15px]"
              >
                <Globe className="text-ink-500 size-4 shrink-0" aria-hidden />
                {t("switchLanguage")}
                <span className="text-ink-500 ms-auto text-[13px] font-semibold">
                  {locale === "ar" ? "EN" : "AR"}
                </span>
              </button>

              {/* Currency is fixed to SAR — display-only, as in the util bar. */}
              <span className="text-ink-700 flex min-h-12 items-center gap-2.5 px-4 py-3 text-[15px]">
                <CircleDollarSign
                  className="text-ink-500 size-4 shrink-0"
                  aria-hidden
                />
                SAR
                <span className="text-ink-500 ms-auto text-[13px]">
                  {t("location")}
                </span>
              </span>

              <div className="flex items-center gap-2.5 px-4 py-3">
                <ThemeButton
                  active={resolvedTheme === "light"}
                  onClick={() => setTheme("light")}
                  icon={<Sun className="size-4" aria-hidden />}
                  label={t("light")}
                />
                <ThemeButton
                  active={resolvedTheme === "dark"}
                  onClick={() => setTheme("dark")}
                  icon={<Moon className="size-4" aria-hidden />}
                  label={t("dark")}
                />
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

function Row({
  href,
  children,
  indented = false,
  tone = "text-ink-700",
}: {
  href: string;
  children: React.ReactNode;
  indented?: boolean;
  tone?: string;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-12 items-center py-3 text-[15px] ${tone} ${
        indented ? "text-ink-500 ps-8 pe-4 text-[14px]" : "px-4 font-medium"
      }`}
    >
      {children}
    </Link>
  );
}

function Divider() {
  return <span className="bg-line-200 my-2 block h-px w-full" aria-hidden />;
}

function ThemeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-10 border text-[13px] ${
        active
          ? "bg-action-tint border-action text-action font-semibold"
          : "border-line-200 text-ink-500"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
