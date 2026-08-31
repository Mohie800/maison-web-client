import { NotFoundView } from "@/components/layout/not-found-view";

/**
 * Web_404_Error outside the locale shell — a URL that does not even resolve to
 * a language, so it cannot read translations. English, and no chrome.
 * `[locale]/not-found.tsx` is the one visitors normally reach.
 */
export default function RootNotFound() {
  return (
    <html lang="en">
      <body>
        <NotFoundView
          homeHref="/en"
          categoriesHref="/en/categories"
          labels={{
            code: "404",
            title: "Page not found",
            body: "The page you’re looking for doesn’t exist or has been moved.",
            body2: "Don’t worry — there’s plenty more to explore!",
            home: "Go to Homepage",
            categories: "Browse Categories",
          }}
        />
      </body>
    </html>
  );
}
