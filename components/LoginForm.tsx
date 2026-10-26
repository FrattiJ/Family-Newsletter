"use client";

import { useActionState } from "react";
import { loginAction, type FormState } from "@/app/actions/auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    loginAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label className="field-label" htmlFor="password">
          Family password
        </label>
        <span className="field-help">
          The password is the same for everyone in the family.
        </span>
        <input
          id="password"
          name="password"
          type="password"
          className="field"
          autoComplete="current-password"
          autoFocus
          required
          // Phones should not try to be clever with a password field.
          autoCapitalize="none"
          spellCheck={false}
        />
      </div>

      {state?.error ? (
        <p
          role="alert"
          className="bg-accent/10 border border-accent text-accent px-4 py-3"
        >
          {state.error}
        </p>
      ) : null}

      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Checking…" : "Come on in"}
      </button>
    </form>
  );
}
