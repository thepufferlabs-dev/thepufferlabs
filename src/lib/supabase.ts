import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

/** Auth callback URL — Supabase Edge Function handles PKCE code exchange */
export function getAuthCallbackUrl(redirectPath = "/") {
  const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://thepufferlabs.com";
  return `${supabaseUrl}/functions/v1/auth-callback?redirect_to=${encodeURIComponent(`${siteUrl}${redirectPath}`)}`;
}
