# End-to-end tests

```bash
npm run build && npm run e2e      # headless
npm run e2e:ui                    # watch / debug
```

## What these cover

**`smoke.spec.ts`** — every route renders, in both locales, signed out and
signed in, plus the two routing rules that are easy to break: a private route
redirects a signed-out visitor, and `/trade` does not.

A 200 is not proof a page works — a server component that throws still answers
200 with Next's error page — so every check also asserts the error boundary is
absent.

**`regressions.spec.ts`** — the three bugs found while building Flows 6 and 7.
Each one shipped at some point during that work and was caught by reading a
rendered page; nothing else would have noticed.

| Guard | Bug it pins |
|---|---|
| Trade cash total | `requesterTotal` folds the difference in and `responderTotal` does not (GAP-87); reading either double-counted it for the payer |
| Hostile attachment | `attachmentUrl` is stored unvalidated (GAP-88) — an external or `javascript:` URL must never reach the DOM |
| Bundle items | a thin embedded listing must not overwrite the rich one, which once cost the trade detail its photos and seller |

The attachment guard was mutation-checked: removing the `/uploads/` filter makes
it fail, so it is a real guard rather than a passing assertion.

## They run against shared dev data

There is no fixture database. These drive the real app against
`maison.dockbox.cloud` using accounts and rows seeded while building — listed
under "Test data created on the backend" in `plans/STATUS.md` and named in
`fixtures.ts`.

That means a fixture can legitimately disappear, or a trade can be answered by
someone else. Specs `test.skip` with a message naming what is missing rather
than failing as though the app broke. **A skip is a signal to reseed, not a
pass** — if the trade or attachment guards start skipping, the regressions they
protect are unguarded until the data is restored.

`workers: 1` and `fullyParallel: false`, because the API is shared and the
mutating paths must not race.
