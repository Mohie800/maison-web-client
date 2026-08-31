import { getTranslations } from "next-intl/server";
import { NotFoundView } from "@/components/layout/not-found-view";

/**
 * Web_404_Error — `651:16393`, inside the locale shell so it keeps the header,
 * the footer and the reader's language. Every `notFound()` in the app lands
 * here; before this existed they fell through to Next's own default page.
 */
export default async function NotFound() {
  const t = await getTranslations("NotFound");
  return (
    <NotFoundView
      labels={{
        code: t("code"),
        title: t("title"),
        body: t("body"),
        body2: t("body2"),
        home: t("home"),
        categories: t("categories"),
      }}
    />
  );
}
