// context/UserContext.js
import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const fetchUser = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) {
        setUser(null);
        setLoadingUser(false);
        return;
      }
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[UserContext] fetchUser error:', error);
        setUser(null);
      } else {
        setUser(data);
      }
    } catch (err) {
      console.error('[UserContext] fetchUser exception:', err);
      setUser(null);
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, fetchUser, loadingUser }}>
      {children}
    </UserContext.Provider>
  );
};
