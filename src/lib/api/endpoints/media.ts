import { serverApiFetch } from "@/lib/api/server";

/**
 * `POST /media` — the platform's one upload primitive, answered by GAP-72.
 *
 * It takes the binary in `file`, `media` or `image` (or base64 in
 * `imageBase64`) and replies `{ url, path }` with a relative
 * `/uploads/media/…` path. Everything that needs a URL for something a user
 * picked goes through here: return evidence, review photos, image messages.
 */
export async function uploadMedia(file: File): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;

  const body = new FormData();
  body.set("file", file);

  const data = await serverApiFetch<{ url?: string; path?: string }>("/media", {
    method: "POST",
    body,
  });

  return data?.url ?? data?.path ?? null;
}

/** Uploads in parallel and drops anything the API didn't give a URL back for. */
export async function uploadAllMedia(files: File[]): Promise<string[]> {
  const urls = await Promise.all(files.map((file) => uploadMedia(file)));
  return urls.filter((url): url is string => Boolean(url));
}
