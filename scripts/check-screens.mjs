/**
 * Screen-map coverage check.
 *
 * Sweeps every node id in `plans/07-figma-screen-map.md` against `src/` and
 * `e2e/` and reports any screen the codebase never mentions. A screen with no
 * reference is not necessarily unbuilt — most are built and annotate an inner
 * child node instead of the frame's own id — so every such node must be
 * accounted for in ACCOUNTED below, with a reason.
 *
 * This exists because the per-flow tables in `plans/STATUS.md` drifted twice.
 * The second time it hid four screens that had genuinely never been written —
 * including a 404 page, so every bad URL fell through to Next's default. Prose
 * cannot be re-run; this can.
 *
 * Fails when a node is neither referenced nor accounted for. Add the node here
 * with a reason, or build the screen.
 *
 *   node scripts/check-screens.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const MAP = resolve(ROOT, "../plans/07-figma-screen-map.md");

/**
 * Why a screen-map node has no reference in the codebase.
 *
 * `built` — shipped, but the code annotates the inner nodes it implemented
 * rather than the frame id. This is the normal case and needs no action.
 * `uncited` — shipped, but nothing cites any of its nodes. Prefer annotating
 * the component over adding it here; the check then clears it on its own.
 * `merged` / `cut` — a recorded decision in plans/09.
 * `blocked` — no endpoint, or a design decision outstanding.
 * `not-a-screen` — a fragment, a handoff note, or a superseded duplicate.
 * `pending` — in the current work, not yet written. Delete the line when the
 * screen ships; this reason should trend to empty, unlike the others.
 */
const ACCOUNTED = {
  // --- built; the code cites child nodes instead of the frame
  "651:16591": ["built", "Web_ForgotPassword — cites 651:16609 / 651:16619"],
  "651:16622": ["built", "Web_ResetPassword — cites 651:16650"],
  "651:4710": ["built", "Web_PDP_Auction — cites 651:4738…4775"],
  "651:5103": ["built", "Web_Sell_1_Category — cites 651:5110…5175"],
  "651:5178": ["built", "Web_Sell_2_Type — cites 651:5223…5239"],
  "651:5243": ["built", "Web_Sell_3_Details — cites 651:5288…5399"],
  "651:5564": ["built", "Web_Sell_4_Condition — cites 651:5609…5626"],
  "651:5642": ["built", "Web_Sell_5_Photos — cites 651:5687…5705"],
  "651:6109": ["built", "Web_TradeOffer_Step1 — cites 651:6112…6196"],
  "651:6202": ["built", "Web_TradeOffer_Step2 — cites 651:6216…6263"],
  "651:6715": [
    "merged",
    "Web_Inbox_TradeChat — its trade parts merged into 651:6796 (plans/09 C46); cites 651:6745…6785",
  ],

  // --- recorded decisions
  "651:7138": ["cut", "01_PlaceBid_Confirm — folded into the PDP (plans/09 C33)"],
  "651:7172": ["cut", "02_PlaceBid_Outbid — folded into the PDP (plans/09 C33)"],

  // --- no endpoint, or a design decision outstanding
  "651:16684": ["blocked", "Web_Phone_OTP — no phone/OTP login pair exists"],
  "651:1646": [
    "blocked",
    "Web_LangCurrency_Dropdown — currency is display-only (plans/06 G5)",
  ],
  "651:2324": ["blocked", "AD_3_Popup — no sponsorship model (API-21)"],
  "651:9759": ["blocked", "MS_Web_Plans — subscriptions absent from the API"],
  "651:3244": ["blocked", "AISearch_LandingPage — design decision (plans/06 G6)"],
  "651:3365": ["blocked", "AISearch_Upload — design decision (plans/06 G6)"],
  "651:3397": ["blocked", "AISearch_Analyzing — design decision (plans/06 G6)"],
  "651:3463": ["blocked", "AISearch_Results_Match — GAP-59, results are invented"],
  "651:3586": ["blocked", "AISearch_Results_NoMatch — GAP-59"],


  // --- Flow 15, in progress (01_VP_Dashboard shipped 2026-09-05)
  "651:15422": ["merged", "14_VP_ReviewDetail — reply is inline on the list (plans/09 C79)"],

  // --- in a flow table, but not a screen
  "651:4610": ["not-a-screen", "a 762×73 PDP header sliver"],
  "651:5101": ["not-a-screen", "a 1026×73 PLP header sliver"],
};

/**
 * Flow 15's dark section is skipped: it is the same 18 screens as the light
 * section in the other theme, and one token-driven implementation serves both,
 * so tracking it would double-count every screen. The light section is the
 * inventory and is checked like any other flow.
 */
const SKIP_FLOW = /Vendor Portal \(Dark\)/;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(tsx?|mjs)$/.test(name)) out.push(full);
  }
  return out;
}

const map = readFileSync(MAP, "utf8");
const screens = [];
let flow = null;
// CRLF would leave a trailing \r, which `$` refuses to match.
for (const line of map.split(/\r?\n/)) {
  const heading = line.match(/^## (.+)$/);
  if (heading) flow = heading[1];
  const row = line.match(/^\|\s*`(\d+:\d+)`[^|]*\|[^|]*\|\s*(.+?)\s*\|\s*$/);
  // Only the per-flow tables are the inventory. The Coverage section's own
  // tables have the same shape and must not be read as screens.
  if (row && /^Flow /.test(flow ?? "") && !SKIP_FLOW.test(flow)) {
    screens.push({ node: row[1], name: row[2], flow });
  }
}

const referenced = new Set();
for (const file of [...walk(join(ROOT, "src")), ...walk(join(ROOT, "e2e"))]) {
  for (const id of readFileSync(file, "utf8").match(/\d+:\d+/g) ?? []) {
    referenced.add(id);
  }
}

const missing = screens.filter((s) => !referenced.has(s.node));
const unknown = missing.filter((s) => !ACCOUNTED[s.node]);
const inScope = new Set(screens.map((s) => s.node));
const stale = Object.keys(ACCOUNTED).filter((node) => referenced.has(node));
/* An entry for a node no longer in any flow table is dead weight. */
const unused = Object.keys(ACCOUNTED).filter((node) => !inScope.has(node));

const byReason = {};
for (const s of missing) {
  const [reason] = ACCOUNTED[s.node] ?? ["unaccounted"];
  (byReason[reason] ??= []).push(s);
}

console.log(
  `${screens.length} screens in scope · ${screens.length - missing.length} referenced · ${missing.length} not`,
);
for (const [reason, rows] of Object.entries(byReason).sort()) {
  console.log(`\n  ${reason} (${rows.length})`);
  for (const s of rows) {
    const [, why] = ACCOUNTED[s.node] ?? [];
    console.log(`    ${s.node.padEnd(11)} ${why ?? s.name}`);
  }
}

if (stale.length) {
  console.log(
    `\n⚠ ${stale.length} allowlisted node(s) are now referenced — delete them from ACCOUNTED:`,
  );
  for (const node of stale) console.log(`    ${node}`);
}

if (unused.length) {
  console.log(
    `\n⚠ ${unused.length} allowlisted node(s) are no longer in a flow table — delete them from ACCOUNTED:`,
  );
  for (const node of unused) console.log(`    ${node}`);
}

if (unknown.length) {
  console.log(
    `\n✗ ${unknown.length} screen(s) neither referenced nor accounted for:`,
  );
  for (const s of unknown) console.log(`    ${s.node}  ${s.name}  (${s.flow})`);
  console.log(
    "\nEither build the screen, or add its node to ACCOUNTED with a reason.",
  );
  process.exit(1);
}

console.log("\n✓ every screen is referenced or accounted for");
