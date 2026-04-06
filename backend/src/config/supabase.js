import { createClient } from '@supabase/supabase-js';
import { getEnv } from './env.js';

let cachedClient;

export function getSupabase() {
  if (cachedClient) {
    return cachedClient;
  }

  const env = getEnv();
  if (!env.supabaseUrl || !(env.supabaseServiceRoleKey || env.supabaseAnonKey)) {
    throw new Error('Missing Supabase environment variables.');
  }

  cachedClient = createClient(
    env.supabaseUrl,
    env.supabaseServiceRoleKey || env.supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  return cachedClient;
}
