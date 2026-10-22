import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server.ts";

export type Role = "viewer" | "editor";
export type Profile = { user_id: string; email: string; full_name: string; role: Role };

/**
 * The logged-in user's profile, once per request. A valid session without a profile row
 * (removed by an editor, or created outside the invite flow) goes to /no-access.
 */
export const getViewer = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("user_id, email, full_name, role")
    .eq("user_id", userId)
    .maybeSingle<Profile>();
  if (error) throw new Error(`Loading profile failed: ${error.message}`);
  if (!profile) redirect("/no-access");

  return { supabase, profile };
});

/** For Server Actions and edit pages. RLS enforces the same rule in the database. */
export async function requireEditor() {
  const viewer = await getViewer();
  if (viewer.profile.role !== "editor") redirect("/");
  return viewer;
}
