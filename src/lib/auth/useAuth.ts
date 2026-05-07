import { useEffect, useState, useCallback } from "react";

const KEY = "apiflow.user.v1";

export interface AuthUser {
  username: string;
  createdAt: number;
}

function read(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

export function getCurrentUser(): AuthUser | null {
  return read();
}

export function signIn(username: string): AuthUser {
  const user: AuthUser = { username: username.trim(), createdAt: Date.now() };
  window.localStorage.setItem(KEY, JSON.stringify(user));
  emit();
  return user;
}

export function signOut(): void {
  window.localStorage.removeItem(KEY);
  emit();
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(read());
    setReady(true);
    const update = () => setUser(read());
    listeners.add(update);
    window.addEventListener("storage", update);
    return () => {
      listeners.delete(update);
      window.removeEventListener("storage", update);
    };
  }, []);

  const login = useCallback((username: string) => {
    const u = signIn(username);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    signOut();
    setUser(null);
  }, []);

  return { user, ready, login, logout };
}
