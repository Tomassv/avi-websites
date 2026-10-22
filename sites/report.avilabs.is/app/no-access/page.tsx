import { signOut } from "../actions.ts";

export default function NoAccessPage() {
  return (
    <main className="login">
      <img src="/plan3logo.svg" alt="Plan3" width={120} />
      <h2>No access</h2>
      <p>Your account isn’t set up for the report yet. Ask an editor to add you.</p>
      <form action={signOut}>
        <button type="submit" className="saveButton">Sign out</button>
      </form>
    </main>
  );
}
