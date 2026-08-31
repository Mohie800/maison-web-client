"use server";

import { revalidatePath } from "next/cache";
import { serverApiFetch } from "@/lib/api/server";
import { uploadMedia } from "@/lib/api/endpoints/media";
import { ApiError } from "@/lib/api/errors";
import {
  STORY_DURATIONS,
  STORY_VISIBILITIES,
  type StoryDuration,
  type StoryVisibility,
} from "@/lib/api/schemas/cards";

/**
 * The add-story composer's server calls — `POST /media` then `POST /stories`.
 *
 * `durationHours` and `visibility` landed with GAP-90; video and the promotion
 * story kind did not, and the composer does not offer them.
 */

export type StoryResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : T))
  | { ok: false; error: string };

function fail(error: unknown): { ok: false; error: string } {
  if (error instanceof ApiError) {
    if (error.isUnauthorized) return { ok: false, error: "unauthenticated" };
    if (/image|file|media/i.test(error.messages.join(" "))) {
      return { ok: false, error: "badImage" };
    }
    return { ok: false, error: "requestFailed" };
  }
  return { ok: false, error: "requestFailed" };
}

/** One image to `POST /media`; the composer then holds the path it returns. */
export async function uploadStoryMediaAction(
  formData: FormData,
): Promise<StoryResult<{ url: string }>> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "badImage" };
  }
  try {
    const url = await uploadMedia(file);
    if (!url) return { ok: false, error: "requestFailed" };
    return { ok: true, url };
  } catch (error) {
    return fail(error);
  }
}

export async function createStoryAction(input: {
  mediaUrl: string;
  caption?: string;
  listingId?: string | null;
  durationHours: StoryDuration;
  visibility: StoryVisibility;
}): Promise<StoryResult<{ id: string }>> {
  if (!input.mediaUrl) return { ok: false, error: "badImage" };
  if (!STORY_DURATIONS.includes(input.durationHours)) {
    return { ok: false, error: "requestFailed" };
  }
  if (!STORY_VISIBILITIES.includes(input.visibility)) {
    return { ok: false, error: "requestFailed" };
  }

  try {
    const story = await serverApiFetch<{ id?: string }>("/stories", {
      method: "POST",
      body: {
        mediaUrl: input.mediaUrl,
        durationHours: input.durationHours,
        visibility: input.visibility,
        ...(input.caption?.trim() ? { caption: input.caption.trim() } : {}),
        ...(input.listingId ? { listingId: input.listingId } : {}),
      },
    });
    revalidatePath("/[locale]/stories", "page");
    return { ok: true, id: story?.id ?? "" };
  } catch (error) {
    return fail(error);
  }
}
