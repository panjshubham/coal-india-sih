import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import { getProfile, saveProfile } from "../services/profileService";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: "mine_official" | "corporate" | "regulator" | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<"mine_official" | "corporate" | "regulator" | null>(null);
  const [loading, setLoading] = useState(true);

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

    // Start background simulation loop for hackathon demo
    const ambientTimer = setInterval(() => {
      // 40% chance every 15s to fire an ambient background alert
      if (Math.random() > 0.6) {
        generateHackathonAmbientAlert();
      }
    }, 15000);

    return () => {
      subscription.unsubscribe();
      clearInterval(ambientTimer);
    };
  }, []);

  const fetchRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("role, name, email")
        .eq("id", userId)
        .single();
      
      if (!error && data) {
        setRole(data.role);
        
        // Dynamically update the UI profile based on logged-in user
        const currentProfile = getProfile();
        saveProfile({
          ...currentProfile,
          fullName: data.name || "Unknown Officer",
          email: data.email || currentProfile.email,
          role: data.role
        });

        // Fire and forget alert generation
        generateAutomatedAlerts();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const generateAutomatedAlerts = async () => {
    try {
      // 1. Compliance (deadline)
      const { data: overdues } = await supabase.from('compliance_items').select('id, title').eq('status', 'overdue');
      if (overdues && overdues.length > 0) {
        for (const item of overdues) {
          const { data: existing } = await supabase.from('alerts').select('id').eq('related_entity_id', item.id).eq('type', 'deadline').maybeSingle();
          if (!existing) {
            await supabase.from('alerts').insert({
              type: 'deadline',
              related_entity_id: item.id,
              message: `Overdue compliance item: ${item.title}`,
              severity: 'high',
              is_read: false
            });
          }
        }
      }

      // 2. Violations (escalation)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: staleViolations } = await supabase.from('violations')
        .select('id, category')
        .eq('status', 'open')
        .is('corrective_action', null)
        .lt('created_at', sevenDaysAgo.toISOString());
      
      if (staleViolations && staleViolations.length > 0) {
        for (const v of staleViolations) {
          const { data: existing } = await supabase.from('alerts').select('id').eq('related_entity_id', v.id).eq('type', 'escalation').maybeSingle();
          if (!existing) {
            await supabase.from('alerts').insert({
              type: 'escalation',
              related_entity_id: v.id,
              message: `Stale open violation (${v.category}) requires immediate corrective action.`,
              severity: 'critical',
              is_read: false
            });
          }
        }
      }
    } catch (e) {
      console.error('Failed to generate alerts', e);
    }
  };

  const generateHackathonAmbientAlert = async () => {
    try {
      const alertTypes = [
        { type: 'SCADA_TELEMETRY', msg: 'SCADA Alert: CH4 levels exceeding 1.25% in Seam 3. Ventilation fans auto-adjusted.', sev: 'critical' },
        { type: 'VISION_AI', msg: 'AI Vision Alert: Missing safety berm detected near Pit B haul road.', sev: 'high' },
        { type: 'ACCESS_CONTROL', msg: 'Gate Pass Alert: Entry attempt blocked (VTC Expired).', sev: 'high' },
        { type: 'CORPORATE_WATCHDOG', msg: 'EC Compliance Alert: Production Cap reaching 95% threshold for ECL.', sev: 'high' },
        { type: 'SCADA_TELEMETRY', msg: 'SCADA Alert: Vibration anomaly detected near Highwall C.', sev: 'critical' }
      ];
      const rand = alertTypes[Math.floor(Math.random() * alertTypes.length)];
      
      await supabase.from('alerts').insert({
        type: rand.type,
        message: rand.msg,
        severity: rand.sev,
        is_read: false
      });
    } catch (e) {
      console.error('Ambient alert fail:', e);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
