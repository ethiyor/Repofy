// Custom hook for authentication logic
import { useState, useEffect } from 'react';
import supabase from '../supabase';
import { getUserProfile } from '../api';

export const useAuth = () => {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (token) => {
    try {
      const profile = await getUserProfile(token);
      setUserProfile(profile);
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && session.user.email_confirmed_at) {
        setSession(session);
        fetchUserProfile(session.access_token);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && session.user.email_confirmed_at) {
        setSession(session);
        fetchUserProfile(session.access_token);
      } else if (!session) {
        setSession(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserProfile(null);
    return "✅ You have been logged out.";
  };

  return {
    session,
    userProfile,
    setUserProfile,
    loading,
    logout,
    refreshProfile: () => session && fetchUserProfile(session.access_token)
  };
};
