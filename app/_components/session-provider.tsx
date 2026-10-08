"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface SessionUser {
  name: string;
}

interface SessionContextValue {
  user: SessionUser | null;
  login: (user: SessionUser) => void;
  logout: () => void;
}

const STORAGE_KEY = "av_user";

const SessionContext = createContext<SessionContextValue | null>(null);

function readStoredUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as SessionUser).name === "string" &&
      (parsed as SessionUser).name.length > 0
    ) {
      return { name: (parsed as SessionUser).name };
    }
  } catch {
    // localStorage bloqueado o JSON corrupto: invitado
  }
  return null;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  // Servidor y primer render del cliente: sin sesión. Se lee tras montar.
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única tras montar, evita desajuste de hidratación
    setUser(readStoredUser());
  }, []);

  const login = useCallback((next: SessionUser) => {
    const clean: SessionUser = { name: next.name.trim().toUpperCase().slice(0, 10) };
    setUser(clean);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    } catch {
      // sin persistencia
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // sin persistencia
    }
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de <SessionProvider>");
  return ctx;
}
