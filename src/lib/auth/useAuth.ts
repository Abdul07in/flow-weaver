import { useEffect, useState, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface AuthUser {
  id: string;
  email: string;
  username: string; // display name (used by dashboard greeting)
}

function toAuthUser(u: User | null | undefined): AuthUser | null {
  if (!u) return null;
  const display =
    (u.user_metadata?.display_name as string | undefined) ||
    (u.email ? u.email.split("@")[0] : "User");
  return { id: u.id, email: u.email ?? "", username: display };
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Set listener BEFORE getSession (per Supabase guidance)
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session: Session | null) => {
      setUser(toAuthUser(session?.user));
    });
    void supabase.auth.getSession().then(({ data }) => {
      setUser(toAuthUser(data.session?.user));
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    const redirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: { display_name: displayName ?? email.split("@")[0] },
      },
    });
    if (error) throw error;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return { user, ready, signUp, signIn, logout };
}
