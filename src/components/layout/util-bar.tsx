"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { useTranslations, useLocale } from "next-intl";
import { CircleDollarSign, Globe, MapPin, Moon, Sun } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

/**
 * Thin utility strip above the header: market tagline, location, language,
 * currency, and the light/dark toggle. Figma node 651:1432.
 */
export function UtilBar() {
  const t = useTranslations("Chrome");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  /*
    next-themes has no theme to report until it has run in the browser: on the
    server, and on the first client render, `resolvedTheme` is undefined. Its
    blocking script has already put `.dark` on <html> by then, so anything that
    reads the hook during render paints the wrong pill and React does not
    reliably repair that className on hydration. The pressed styling is
    therefore driven by the `dark:` variant (below) and only `aria-pressed` —
    which has no visual mismatch to get stuck on — waits for mount.
  */
  const mounted = useSyncExternalStore(subscribeNever, onClient, onServer);
  const isDark = mounted ? resolvedTheme === "dark" : undefined;

  const other = routing.locales.find((l) => l !== locale) ?? routing.defaultLocale;

  return (
    <div className="bg-tint border-line-200 hidden h-[38px] items-center border-b px-20 lg:flex">
      <p className="text-[11px] text-ink-500">{t("tagline")}</p>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5">
        {/* Location is display-only: no geolocation endpoint backs it yet. */}
        <span className="flex h-7 items-center gap-1 rounded-[14px] px-2.5">
          <MapPin className="size-4 text-ink-500" aria-hidden />
          <span className="text-[10px] font-semibold text-ink-900">
            {t("location")}
          </span>
        </span>

        <Divider />

        <button
          type="button"
          onClick={() => router.replace(pathname, { locale: other })}
          className="flex h-7 cursor-pointer items-center gap-1 rounded-[14px] px-2.5"
          aria-label={t("switchLanguage")}
        >
          <Globe className="size-4 text-ink-500" aria-hidden />
          <span className="text-[10px] font-semibold text-ink-900">
            {locale === "ar" ? "AR | EN" : "EN | AR"}
          </span>
        </button>

        <Divider />

        {/*
          Currency is fixed. Every listing returns "SAR" and the API exposes no
          FX endpoint, so a switcher here would either lie or charge in a
          different currency than it displays. See plans/06 G5 / API-05.
        */}
        <span className="flex h-7 items-center gap-1 rounded-[14px] px-2.5">
          <CircleDollarSign className="size-4 text-ink-500" aria-hidden />
          <span className="text-[10px] font-semibold text-ink-900">SAR</span>
        </span>

        <Divider />

        <div className="bg-fill-100 flex h-7 items-center gap-2 rounded-[14px] px-1">
          <ThemeOption
            pressed={isDark === false}
            onClick={() => setTheme("light")}
            icon={<Sun className="size-3.5" aria-hidden />}
            label={t("light")}
            stateClass="bg-action-tint border-action text-action font-semibold dark:border-transparent dark:bg-transparent dark:font-normal dark:text-ink-400"
          />
          <ThemeOption
            pressed={isDark === true}
            onClick={() => setTheme("dark")}
            icon={<Moon className="size-3.5" aria-hidden />}
            label={t("dark")}
            stateClass="border-transparent text-ink-400 dark:bg-action-tint dark:border-action dark:font-semibold dark:text-action"
          />
        </div>
      </div>
    </div>
  );
}

/*
  A store that never changes, read as `false` while rendering on the server and
  `true` in the browser. React swaps the two on the pass right after hydration,
  which is exactly the "have we reached the client yet" signal, without the
  setState-in-an-effect the React Compiler lint rejects.
*/
const subscribeNever = () => () => {};
const onClient = () => true;
const onServer = () => false;

function Divider() {
  return <span className="bg-line-200 h-4 w-px" aria-hidden />;
}

/**
 * `stateClass` carries both the pressed and unpressed look, selected by the
 * `dark:` variant rather than by React state, so the pill matches the document
 * on the very first paint. The border width is always applied and only its
 * colour changes, which keeps the two pills from shifting as the theme flips.
 */
function ThemeOption({
  pressed,
  onClick,
  icon,
  label,
  stateClass,
}: {
  pressed: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  stateClass: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={`flex h-[22px] cursor-pointer items-center justify-center gap-1 rounded-[11px] border px-2 text-[10px] ${stateClass}`}
    >
      {icon}
      {label}
    </button>
  );
}
