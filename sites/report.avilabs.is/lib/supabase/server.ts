import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "../env.ts";

/**
 * The app only talks to Supabase from the server, so the session cookies can be HttpOnly. That
 * keeps them away from scripts on the rest of www.avilabs.is (analytics, HubSpot), which share
 * this origin since the report is served at /report.
 */
export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production" };

/**
 * Supabase client for Server Components and Server Actions. It acts as the logged-in user, so
 * every query goes through row-level security; there is no service-role client in the app.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookieOptions,
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Server Components can't set cookies. proxy.ts refreshes the session on every request.
        }
      },
    },
  });
}
