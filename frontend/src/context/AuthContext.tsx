import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabase';
import type { Session, User } from '@supabase/supabase-js';
import { getProfile, saveProfile } from '../services/profileService';

type Role = 'mine_official' | 'corporate' | 'regulator';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: Role | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("role, name, email")
        .eq("id", userId)
        .single();
      
      const userRole = (!error && data?.role) ? (data.role as Role) : null;
      const userName = data?.name || "Unknown Officer";
      const userEmail = data?.email || "";

      setRole(userRole);
      
      const currentProfile = getProfile();
      saveProfile({
        ...currentProfile,
        fullName: userName,
        email: userEmail || currentProfile.email,
        role: userRole ?? currentProfile.role
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchRole(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchRole]);

  const signOut = async () => {
    try {
      localStorage.removeItem("coalguard_chat_history");
      localStorage.removeItem("coalguard_chat_is_open");
      localStorage.removeItem("coalguard_last_user_id");
      localStorage.removeItem("coalguard_ai_rate_limit");
      localStorage.removeItem("coalguard_officer_profile");
      sessionStorage.clear();
    } catch {}
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
