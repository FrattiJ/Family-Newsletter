"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { publishArticle, type PublishState } from "@/app/actions/articles";

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

  // The file and its preview URL move together, so one piece of state holds
  // both and the old URL is released the moment it is replaced.
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const previewUrl = useRef<string | null>(null);

  function showPhoto(file: File | null) {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = file ? URL.createObjectURL(file) : null;
    setPhoto(file && previewUrl.current ? { file, url: previewUrl.current } : null);
  }

  useEffect(() => {
    // Release the last preview when leaving the page.
    return () => {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    };
  }, []);

  async function onPickPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    setPhotoError(null);
    if (!picked) {
      showPhoto(null);
      return;
    }

    setWorking(true);
    try {
      showPhoto(await shrinkPhoto(picked));
    } catch {
      // Some phones hand over formats the browser cannot open (HEIC, mainly).
      if (ALLOWED.includes(picked.type)) showPhoto(picked);
      else
        setPhotoError(
          "This phone saved the photo in a format the website cannot read. " +
            "Try taking a screenshot of it and choosing that instead.",
        );
    } finally {
      setWorking(false);
    }
  }

  function clearPhoto() {
    showPhoto(null);
    setPhotoError(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    // Send the shrunken photo rather than whatever the file input holds.
    if (photo) data.set("photo", photo.file);
    else data.delete("photo");
    // Must run inside a transition, or the pending state never turns on and
    // the button stays live while the story uploads.
    startTransition(() => formAction(data));
  }

  const busy = pending || working;

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
        <span className="field-label">Add a photo</span>
        <span className="field-help">
          Optional, and one is plenty. Big photos are fine — we shrink them for
          you.
        </span>

        {photo ? (
          <div className="bg-paper border border-rule p-3">
            {/* A local blob preview; next/image cannot optimise one. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt="The photo you chose"
              className="w-full max-h-80 object-contain bg-newsprint"
            />
            <button
              type="button"
              onClick={clearPhoto}
              className="mt-3 text-sm underline text-muted hover:text-accent"
            >
              Remove this photo
            </button>
          </div>
        ) : (
          <label className="btn btn-secondary bg-paper w-full cursor-pointer">
            {working ? "Getting the photo ready…" : "Choose a photo"}
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={onPickPhoto}
            />
          </label>
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
