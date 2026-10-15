import { createClient } from "@supabase/supabase-js";

// Both values are public by design: data is protected by row-level security
// (supabase/migrations/0001_init.sql), not by hiding these.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://ybppggggqjdudulslfjx.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_-EiG-Nx4o__njGb3YPdEqA_kOnRqWMd";

export const supabase = createClient(URL, KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
});
