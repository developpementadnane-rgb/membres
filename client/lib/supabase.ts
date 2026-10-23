import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const hasValidSupabaseUrl = (() => {
  if (!supabaseUrl) return false;

  try {
    const url = new URL(supabaseUrl);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
})();

const missingConfigurationError = new Error(
  'Supabase is not configured. Set VITE_SUPABASE_URL to a valid HTTP(S) URL and provide VITE_SUPABASE_ANON_KEY.',
);

export const supabase: SupabaseClient = hasValidSupabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : new Proxy({} as SupabaseClient, {
      get() {
        throw missingConfigurationError;
      },
    });
