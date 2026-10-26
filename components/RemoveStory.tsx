"use client";

import { startTransition, useActionState, useState } from "react";
import { removeArticle, type RemoveState } from "@/app/actions/articles";

/**
 * Removing is two taps on purpose. The first only asks the question, so a
 * stray tap on a phone cannot take a story down.
 */
export function RemoveStory({ id, title }: { id: string; title: string }) {
  const [state, formAction, pending] = useActionState<RemoveState, FormData>(
    removeArticle,
    null,
  );
  const [asking, setAsking] = useState(false);

  function confirmRemove() {
    const data = new FormData();
    data.set("id", id);
    startTransition(() => formAction(data));
  }

  if (state?.error) {
    return (
      <p role="alert" className="text-accent text-sm mt-4">
        {state.error}
      </p>
    );
  }

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="text-sm underline text-muted hover:text-accent mt-4 self-start"
      >
        Remove this story
      </button>
    );
  }

  return (
    <div className="mt-4 bg-paper border border-rule p-4">
      <p className="mb-3">
        Remove <strong>{title}</strong> from the newsletter?
      </p>
      <p className="text-muted text-sm mb-4">
        It disappears from the page straight away. The email that already went
        out cannot be unsent.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={confirmRemove}
          disabled={pending}
          className="btn btn-primary !min-h-11 !px-4"
        >
          {pending ? "Removing…" : "Yes, remove it"}
        </button>
        <button
          type="button"
          onClick={() => setAsking(false)}
          disabled={pending}
          className="btn btn-secondary bg-paper !min-h-11 !px-4"
        >
          Keep it
        </button>
      </div>
    </div>
  );
}
