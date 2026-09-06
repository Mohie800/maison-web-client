import { trailingWindow } from "@/lib/api/endpoints/vendor";
import type { SalesRange } from "./components/revenue-chart";

/** 7D / 30D / 90D, the only windows the analytics screens offer. */
export const RANGE_DAYS: Record<SalesRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export function resolveRange(raw: string | undefined): SalesRange {
  return raw === "7d" || raw === "90d" ? raw : "30d";
}

export function rangeWindow(range: SalesRange) {
  return trailingWindow(RANGE_DAYS[range]);
}
