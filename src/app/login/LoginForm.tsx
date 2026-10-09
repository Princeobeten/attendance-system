"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { Field, Notice, buttonClass, inputClass } from "@/components/ui";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="space-y-4">
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <Field label="Staff number" htmlFor="identifier">
        <input
          id="identifier"
          name="identifier"
          autoComplete="username"
          required
          defaultValue={state?.identifier}
          className={inputClass}
        />
      </Field>
      <Field label="Password" htmlFor="password">
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </Field>
      <button type="submit" disabled={pending} className={`${buttonClass} w-full`}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
