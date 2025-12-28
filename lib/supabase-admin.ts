import { createClient, SupabaseClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDatabase = any;

// Admin client with service role key - bypasses RLS
// Only use server-side for operations that need to bypass RLS
let adminClient: SupabaseClient<AnyDatabase> | null = null;

export function getSupabaseAdmin(): SupabaseClient<AnyDatabase> {
  if (adminClient) return adminClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  adminClient = createClient<AnyDatabase>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
