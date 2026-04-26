import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

/**
 * Manages Google OAuth via Supabase.
 *
 * Returns:
 *   session  – undefined (loading) | null (logged out) | object (logged in)
 *   signIn   – initiates Google OAuth redirect
 *   signOut  – clears the Supabase session
 *   loading  – true while the OAuth redirect is being initiated
 *   error    – string with a user-facing Hebrew error message (or '')
 */
export function useAuth() {
  const [session, setSession] = useState(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Hydrate session from the existing cookie/token on first load.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Keep session in sync across tabs and after OAuth redirect.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setError('שגיאה בהתחברות עם Google. נסה שוב.');
      setLoading(false);
    }
    // On success the page redirects; loading stays true until unload.
  };

  const signOut = () => supabase.auth.signOut();

  return { session, signIn, signOut, loading, error };
}
