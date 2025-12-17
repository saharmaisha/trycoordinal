import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Helper to require an environment variable.
 * Throws an error if the variable is missing.
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
 * 
 * WARNING: Service role key has admin access. Never expose this to the browser.
 * Only use in apps/api and apps/worker.
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
 * Uses SUPABASE_URL and SUPABASE_ANON_KEY.
 * Safe to use in apps/web.
 */
export function createSupabaseBrowserClient(): SupabaseClient {
  const url = requireEnv("SUPABASE_URL");
  const anonKey = requireEnv("SUPABASE_ANON_KEY");
  
  return createClient(url, anonKey);
}

