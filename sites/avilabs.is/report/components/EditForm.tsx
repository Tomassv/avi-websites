"use client";

import { startTransition, useActionState } from "react";
import type { SaveState } from "@/app/(report)/customers/edit/actions.ts";

/**
 * Submits through onSubmit rather than <form action> so React doesn't reset the inputs, which
 * would throw away what the editor typed when the save fails validation.
 */
export function EditForm({ action, toolbar, children }: {
  action: (prev: SaveState, form: FormData) => Promise<SaveState>;
  toolbar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      className="editorCSS"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        startTransition(() => formAction(form));
      }}
    >
      <div className="selectorLine flex ac jce gap24">
        {toolbar}
        <button className="saveButton" type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
      </div>
      <div aria-live="polite">
        {!pending && state.saved && <p className="savedNote">Saved.</p>}
        {!pending && state.errors && (
          <ul className="error">{state.errors.map((e) => <li key={e}>{e}</li>)}</ul>
        )}
      </div>
      {children}
    </form>
  );
}
