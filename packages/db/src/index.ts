import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Helper to require an environment variable.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Creates a Supabase client for server-side use.
 * Uses SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */
export function createSupabaseServerClient(): SupabaseClient {
  const url = requireEnv("SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Creates a Supabase client for browser/client-side use.
 * Optimized for Next.js static replacement.
 */
export function createSupabaseBrowserClient(): SupabaseClient {
  // We use explicit lookups here so the Next.js compiler can find and replace them
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error(
      "Missing Supabase URL. Please ensure NEXT_PUBLIC_SUPABASE_URL is set in your .env.local"
    );
  }
  if (!anonKey) {
    throw new Error(
      "Missing Supabase Anon Key. Please ensure NEXT_PUBLIC_SUPABASE_ANON_KEY is set in your .env.local"
    );
  }

  return createClient(url, anonKey);
}
