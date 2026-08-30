/**
 * Support contact details.
 *
 * Taken from the API's own invoice issuer block (`GET /orders/{id}/invoice`),
 * which is the only place the platform states them. The email is complete
 * there; the phone is deliberately masked (`+966 11 *** 8800`), which is why
 * the Help Center's WhatsApp card isn't built — see plans/09 C19.
 *
 * Copied rather than fetched because a `mailto:` shouldn't cost an order lookup.
 * If a settings endpoint ever exposes these, read them instead.
 */
export const SUPPORT_EMAIL = "support@maisonsale.com";
