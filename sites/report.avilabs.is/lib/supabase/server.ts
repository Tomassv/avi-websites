import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "../env.ts";

/**
 * Supabase client for Server Components and Server Actions. It acts as the logged-in user, so
 * every query goes through row-level security; there is no service-role client in the app.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabasePublishableKey, {
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
