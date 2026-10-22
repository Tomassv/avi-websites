"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "../actions.ts";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, {});
  return (
    <form action={action} className="loginForm">
      <h2>Customer Report</h2>
      <input type="hidden" name="next" value={next} />
      <label>
        Email
        <input type="email" name="email" autoComplete="username" defaultValue={state.email} required />
      </label>
      <label>
        Password
        <input type="password" name="password" autoComplete="current-password" required />
      </label>
      <button type="submit" className="saveButton" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      {state.error && <p className="error" role="alert">{state.error}</p>}
    </form>
  );
}
