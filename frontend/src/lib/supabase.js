import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnon) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.\n' +
    'Copy frontend/.env.example to frontend/.env.local and fill in the values.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    persistSession:     true,   // keeps session in localStorage between page reloads
    autoRefreshToken:   true,   // silently refreshes the JWT before it expires
    detectSessionInUrl: true,   // reads the #access_token hash Supabase adds on OAuth redirect
  },
});
