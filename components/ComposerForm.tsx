"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { publishArticle, type PublishState } from "@/app/actions/articles";
import { MAX_PHOTOS } from "@/lib/store/types";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_EDGE = 1600;

/**
 * Phone photos are often 5-10MB, which is slow to upload on a weak
 * connection and far bigger than a newsletter needs. Shrink in the browser
 * before anything is sent.
 */
async function shrinkPhoto(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.82),
  );
  if (!blob) return file;

  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}

export function ComposerForm({
  authorName,
  today,
}: {
  authorName: string;
  today: string;
}) {
  const [state, formAction, pending] = useActionState<PublishState, FormData>(
    publishArticle,
    null,
  );

  // Each photo travels with its own preview URL, so a URL can be released
  // the moment that photo is removed.
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const previewUrls = useRef<string[]>([]);

  useEffect(() => {
    // Release any previews still open when leaving the page.
    return () => {
      for (const url of previewUrls.current) URL.revokeObjectURL(url);
    };
  }, []);

  async function onPickPhotos(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = [...(event.target.files ?? [])];
    // Let the same photo be picked again after being removed.
    if (fileInput.current) fileInput.current.value = "";
    setPhotoError(null);
    if (picked.length === 0) return;

    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      setPhotoError(`You can add up to ${MAX_PHOTOS} photos to a story.`);
      return;
    }

    const tooMany = picked.length > room;
    setWorking(true);
    try {
      const added: { file: File; url: string }[] = [];
      let unreadable = 0;

      for (const file of picked.slice(0, room)) {
        let usable: File | null = null;
        try {
          usable = await shrinkPhoto(file);
        } catch {
          // Some phones save in formats the browser cannot open (HEIC).
          usable = ALLOWED.includes(file.type) ? file : null;
        }
        if (!usable) {
          unreadable += 1;
          continue;
        }
        const url = URL.createObjectURL(usable);
        previewUrls.current.push(url);
        added.push({ file: usable, url });
      }

      if (added.length > 0) setPhotos((current) => [...current, ...added]);

      if (unreadable > 0) {
        setPhotoError(
          unreadable === picked.length
            ? "This phone saved the photo in a format the website cannot read. " +
                "Try taking a screenshot of it and choosing that instead."
            : `${unreadable} of those photos could not be read, so they were skipped.`,
        );
      } else if (tooMany) {
        setPhotoError(
          `Only ${MAX_PHOTOS} photos fit on a story, so the first ${room} ${
            room === 1 ? "was" : "were"
          } added.`,
        );
      }
    } finally {
      setWorking(false);
    }
  }

  function removePhoto(index: number) {
    setPhotoError(null);
    setPhotos((current) => {
      const [gone] = current.slice(index, index + 1);
      if (gone) {
        URL.revokeObjectURL(gone.url);
        previewUrls.current = previewUrls.current.filter((u) => u !== gone.url);
      }
      return current.filter((_, i) => i !== index);
    });
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    // Send the shrunken photos rather than whatever the file input holds.
    data.delete("photos");
    for (const photo of photos) data.append("photos", photo.file);
    // Must run inside a transition, or the pending state never turns on and
    // the button stays live while the story uploads.
    startTransition(() => formAction(data));
  }

  const busy = pending || working;
  const room = MAX_PHOTOS - photos.length;

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div>
        <label className="field-label" htmlFor="title">
          Headline
        </label>
        <span className="field-help">
          A short line that says what happened — like “Grandma turns 80”.
        </span>
        <input
          id="title"
          name="title"
          type="text"
          className="field font-display text-xl"
          maxLength={140}
          required
          autoFocus
        />
      </div>

      <div>
        <label className="field-label" htmlFor="eventDate">
          When did it happen?
        </label>
        <span className="field-help">
          This is where the story lands in the newsletter. Today is already
          filled in.
        </span>
        <input
          id="eventDate"
          name="eventDate"
          type="date"
          className="field"
          defaultValue={today}
          required
        />
      </div>

      <div>
        <span className="field-label">Add photos</span>
        <span className="field-help">
          Optional, up to {MAX_PHOTOS}. Big photos are fine — we shrink them for
          you.
        </span>

        {photos.length > 0 ? (
          <div className="bg-paper border border-rule p-3 mb-3">
            <div className="grid grid-cols-3 gap-3">
              {photos.map((photo, index) => (
                <figure key={photo.url}>
                  {/* A local blob preview; next/image cannot optimise one. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={`Photo ${index + 1} of ${photos.length}`}
                    className="w-full h-28 sm:h-36 object-cover bg-newsprint border border-rule"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="mt-2 text-sm underline text-muted hover:text-accent"
                  >
                    Remove
                  </button>
                </figure>
              ))}
            </div>
          </div>
        ) : null}

        {room > 0 ? (
          <label className="btn btn-secondary bg-paper w-full cursor-pointer">
            {working
              ? "Getting the photos ready…"
              : photos.length === 0
                ? "Choose photos"
                : `Add another photo (${room} left)`}
            <input
              ref={fileInput}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={onPickPhotos}
            />
          </label>
        ) : (
          <p className="text-muted text-sm">
            That&rsquo;s {MAX_PHOTOS} photos — the most a story can hold. Remove
            one if you&rsquo;d rather use a different picture.
          </p>
        )}

        {photoError ? (
          <p role="alert" className="text-accent mt-3 text-sm">
            {photoError}
          </p>
        ) : null}
      </div>

      <div>
        <label className="field-label" htmlFor="body">
          Your story
        </label>
        <span className="field-help">
          Write it however you like. Leave a blank line between paragraphs.
        </span>
        <textarea
          id="body"
          name="body"
          className="field leading-relaxed"
          rows={12}
          maxLength={20000}
          required
          placeholder="We all drove up on Saturday morning…"
        />
        <p className="text-muted text-sm mt-2">
          This will be printed as{" "}
          <strong className="text-ink">By {authorName}</strong>.
        </p>
      </div>

      <label className="flex items-start gap-3 bg-paper border border-rule p-4 cursor-pointer">
        <input
          type="checkbox"
          name="sendEmail"
          defaultChecked
          className="mt-1 h-5 w-5 accent-[#9c2b1b]"
        />
        <span>
          <strong className="font-display text-lg">
            Email this to the family now
          </strong>
          <span className="block text-muted text-sm mt-0.5">
            Everyone on the family list gets a copy. Untick this to add the
            story quietly without sending anything.
          </span>
        </span>
      </label>

      {state?.error ? (
        <p
          role="alert"
          className="bg-accent/10 border border-accent text-accent px-4 py-3"
        >
          {state.error}
        </p>
      ) : null}

      <div className="pt-2">
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {pending ? "Publishing and sending…" : "Publish it"}
        </button>
        {pending ? (
          <p className="text-muted text-sm text-center mt-3">
            Please wait here a moment — this can take a few seconds.
          </p>
        ) : null}
      </div>
    </form>
  );
}
