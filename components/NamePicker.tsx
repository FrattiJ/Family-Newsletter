"use client";

import { useActionState } from "react";
import { chooseNameAction, type FormState } from "@/app/actions/auth";

export function NamePicker({ names }: { names: string[] }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    chooseNameAction,
    null,
  );

  return (
    <form action={formAction}>
      {state?.error ? (
        <p
          role="alert"
          className="bg-accent/10 border border-accent text-accent px-4 py-3 mb-5"
        >
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {names.map((name) => (
          // A submit button per name: one tap, no dropdown to wrestle with.
          <button
            key={name}
            type="submit"
            name="name"
            value={name}
            disabled={pending}
            className="btn btn-secondary bg-paper w-full font-display text-xl"
          >
            {name}
          </button>
        ))}
      </div>
    </form>
  );
}
