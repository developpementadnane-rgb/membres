import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { apiUrl } from "@/lib/api-config";
import {
  buildSession,
  saveSession,
  loadSession,
  clearSession,
  evaluateSession,
  type StoredSession,
  type SessionValidity,
} from "@/lib/offline/sessionStore";
import { hasPendingSyncItems } from "@/lib/offline/syncEngine";
import { onAuthExpired } from "@/lib/offline/authEvents";

export interface User {
  id: string;
  generated_id: string;
  first_name: string;
  last_name: string;
  user_phone: string;
  email?: string;
  gender: string;
  qr_code_url?: string | null;
  payment_completed?: boolean;
  documents_completed?: boolean;
  token?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** True when the server rejected an authenticated session. */
  sessionExpired: boolean;
  session: StoredSession | null;
  sessionValidity: SessionValidity;
  login: (firstName: string, lastName: string, generatedId: string, password: string) => Promise<void>;
  logout: () => Promise<{ hadPendingSync: boolean }>;
  setAuthUser: (user: User) => void;
  /** Call when the server responds 401 to a live API call while a local session exists. */
  handleAuthExpiredFromServer: () => void;
  /** Kept for compatibility with existing navigation tracking. */
  renewSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Restore the local session before the first authenticated render.
  // On native builds this reads from native persistent storage
  // (@capacitor/preferences) so the session survives the OS killing the
  // app process; on web it reads from localStorage as before.
  useEffect(() => {
    let cancelled = false;
    loadSession().then((restored) => {
      if (!cancelled) {
        setSession(restored);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (firstName: string, lastName: string, generatedId: string, password: string) => {
      const response = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ first_name: firstName, last_name: lastName, generated_id: generatedId, password }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Login failed");
      }

      const userData = (await response.json()) as User;
      const newSession = buildSession(userData);
      await saveSession(newSession);
      setSession(newSession);
      setSessionExpired(false);
    },
    [],
  );

  const logout = useCallback(async () => {
    const hadPendingSync = await hasPendingSyncItems();
    await clearSession();
    setSession(null);
    setSessionExpired(false);
    return { hadPendingSync };
  }, []);

  const setAuthUser = useCallback((userData: User) => {
    const newSession = buildSession(userData);
    saveSession(newSession);
    setSession(newSession);
    setSessionExpired(false);
  }, []);

  // Called by the API layer when a request comes back 401 while we believed
  // we had a valid session.
  const handleAuthExpiredFromServer = useCallback(() => {
    clearSession();
    setSession(null);
    setSessionExpired(true);
  }, []);

  // A confirmed 401 from the server means the session is no longer accepted.
  // Network failures do not call this handler.
  useEffect(() => onAuthExpired(handleAuthExpiredFromServer), [handleAuthExpiredFromServer]);

  const sessionValidity = useMemo(() => evaluateSession(session), [session]);

  const renewSession = useCallback(() => {}, []);

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        isAuthenticated: !!session,
        isLoading,
        sessionExpired,
        session,
        sessionValidity,
        login,
        logout,
        setAuthUser,
        handleAuthExpiredFromServer,
        renewSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
