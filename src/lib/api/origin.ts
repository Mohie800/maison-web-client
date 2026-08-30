import "server-only";
import { headers } from "next/headers";

/**
 * The origin this request arrived on, for URLs a visitor will copy and send.
 *
 * Read from the request rather than an env var so preview deployments and
 * localhost produce links that actually work, and rendered on the server so the
 * client doesn't have to fill it in after mount.
 */
export async function requestOrigin(): Promise<string> {
  const head = await headers();
  const host = head.get("x-forwarded-host") ?? head.get("host") ?? "";
  const proto =
    head.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return host ? `${proto}://${host}` : "";
}
