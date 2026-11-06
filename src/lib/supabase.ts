import { createClient } from "@supabase/supabase-js";

// Both values are public by design: data is protected by row-level security
// (supabase/migrations/0001_init.sql), not by hiding these.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://ybppggggqjdudulslfjx.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_-EiG-Nx4o__njGb3YPdEqA_kOnRqWMd";

export const supabase = createClient(URL, KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
});

/** Makes a login for someone else without touching the owner's own sign-in. */
export async function createLoginFor(email: string, password: string): Promise<string | null> {
  const temp = createClient(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "trinco-share-signup" },
  });
  const { data, error } = await temp.auth.signUp({ email, password });
  if (error) return /already|registered|exists/i.test(error.message)
    ? "That email already has a login, so its password can't be set from here."
    : /signup|sign-up|disabled|not allowed/i.test(error.message)
      ? "Supabase is set to block new logins, so the site can't make one."
      : error.message;
  if (!data.session) return "Supabase wants new logins confirmed by email, which can't reach them, so the site can't make one.";
  await temp.auth.signOut({ scope: "local" });
  return null;
}
