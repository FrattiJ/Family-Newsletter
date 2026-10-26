"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { blastArticle } from "@/lib/email";
import { isOwner } from "@/lib/config";
import { requireFamilyMember } from "@/lib/session";
import { store } from "@/lib/store";
import { PHOTO_EXTENSIONS } from "@/lib/store/types";

export type PublishState = { error: string } | null;

const MAX_TITLE = 140;
const MAX_BODY = 20000;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export async function publishArticle(
  _previous: PublishState,
  formData: FormData,
): Promise<PublishState> {
  let destination: string;

  try {
    const session = await requireFamilyMember();

    const title = String(formData.get("title") ?? "").trim();
    // Browsers submit textarea newlines as CRLF; store plain newlines.
    const body = String(formData.get("body") ?? "")
      .replace(/\r\n/g, "\n")
      .trim();
    const eventDate = String(formData.get("eventDate") ?? "").trim();
    const shouldEmail = formData.get("sendEmail") === "on";
    const photo = formData.get("photo");

    if (!title) return { error: "Please give your story a headline." };
    if (title.length > MAX_TITLE) {
      return { error: `Please keep the headline under ${MAX_TITLE} letters.` };
    }
    if (!body) return { error: "Please write a little about what happened." };
    if (body.length > MAX_BODY) {
      return { error: "That story is very long. Please shorten it a little." };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
      return { error: "Please pick a date for the story." };
    }

    let photoId: string | null = null;

    if (photo instanceof File && photo.size > 0) {
      if (!PHOTO_EXTENSIONS[photo.type]) {
        return { error: "That file is not a photo. Please choose a JPG or PNG." };
      }
      if (photo.size > MAX_PHOTO_BYTES) {
        return { error: "That photo is too large. Please pick a smaller one." };
      }

      photoId = randomUUID();
      const bytes = Buffer.from(await photo.arrayBuffer());
      await store().putPhoto(photoId, bytes, photo.type);
    }

    const article = await store().createArticle({
      title,
      body,
      authorName: session.name,
      eventDate,
      photoId,
    });

    revalidatePath("/newsletter");

    const result = shouldEmail
      ? await blastArticle(article)
      : { sent: 0, savedToOutbox: false, errors: [] };

    const params = new URLSearchParams({
      sent: String(result.sent),
      emailed: shouldEmail ? "1" : "0",
    });
    if (result.savedToOutbox) params.set("outbox", "1");
    if (result.errors.length > 0) params.set("emailFailed", "1");

    destination = `/write/sent?${params.toString()}`;
  } catch (cause) {
    return {
      error:
        cause instanceof Error
          ? cause.message
          : "Something went wrong saving your story. Please try again.",
    };
  }

  // redirect() works by throwing, so it has to sit outside the try block.
  redirect(destination);
}

export type RemoveState = { error: string } | null;

/**
 * Takes a story down. Only the person whose name is on it can do this, or
 * somebody marked as an owner in family.json. The row is kept, so a story
 * removed by accident can be restored.
 */
export async function removeArticle(
  _previous: RemoveState,
  formData: FormData,
): Promise<RemoveState> {
  try {
    const session = await requireFamilyMember();
    const id = String(formData.get("id") ?? "");

    const article = await store().getArticle(id);
    if (!article) {
      return { error: "That story has already been removed." };
    }

    if (article.authorName !== session.name && !isOwner(session.name)) {
      return {
        error: `Only ${article.authorName} can remove this story. Ask them, or ask whoever looks after the website.`,
      };
    }

    await store().deleteArticle(id);
    revalidatePath("/newsletter");
    return null;
  } catch (cause) {
    return {
      error:
        cause instanceof Error
          ? cause.message
          : "Something went wrong removing the story. Please try again.",
    };
  }
}
