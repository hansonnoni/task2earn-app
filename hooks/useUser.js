// hooks/useUser.js
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export function useUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) console.error('Error getting user:', error);
      setUser(data?.user ?? null);
      setLoading(false);
    };
    getUser();

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  return { user, loading };
}
